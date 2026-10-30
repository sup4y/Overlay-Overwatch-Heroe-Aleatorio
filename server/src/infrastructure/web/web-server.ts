import { ErrorResource, ServerMessage, ServerStateResource } from '@contract/api';
import { ActivationAssembler } from '@contract/assemblers/activation.assembler';
import { ErrorAssembler } from '@contract/assemblers/error.assembler';
import { RedemptionAssembler } from '@contract/assemblers/redemption.assembler';
import { RewardAssembler } from '@contract/assemblers/reward.assembler';
import { SessionAssembler } from '@contract/assemblers/session.assembler';
import { SettingsAssembler } from '@contract/assemblers/settings.assembler';
import { DomainError } from '@domain/common/domain-error';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { IncomingMessage, Server, ServerResponse, createServer } from 'node:http';
import { basename, extname, join, resolve, sep } from 'node:path';
import { WebSocket, WebSocketServer } from 'ws';
import { RedemptionRelay } from '../../application/redemption-relay';
import { RewardCatalog } from '../../application/reward-catalog';
import { SessionManager } from '../../application/session-manager';
import { SettingsManager } from '../../application/settings-manager';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};
const MAX_BODY = 10_000;
const HASHED_FILE = /-[A-Z0-9]{8}\.(js|css)$/;

export interface WebServerOptions {
  port: number;
  /** Folder with the already built Angular web. */
  webDir: string;
  /** Extra allowed origins (e.g. the development `ng serve`). */
  extraOrigins?: string[];
  settings: SettingsManager;
  session: SessionManager;
  relay: RedemptionRelay;
  rewards: RewardCatalog;
  /** Called after answering POST /api/shutdown. */
  onShutdown: () => void;
}

/**
 * Web adapter: serves the panel and the overlay, exposes the API (/api) and pushes
 * the state and the redemptions over WebSocket (/ws). It only listens on this computer.
 */
export class WebServer {
  private readonly ws = new WebSocketServer({ noServer: true });
  private readonly origins: Set<string>;

  constructor(private readonly options: WebServerOptions) {
    this.origins = new Set([
      `http://localhost:${options.port}`,
      `http://127.0.0.1:${options.port}`,
      ...(options.extraOrigins ?? []),
    ]);
    const broadcastState = () => this.broadcast({ type: 'state', state: this.state() });
    options.settings.changes.subscribe(broadcastState);
    options.session.changes.subscribe(broadcastState);
    options.relay.changes.subscribe(broadcastState);
    options.relay.redemptions.subscribe((redemption) =>
      this.broadcast({ type: 'redemption', redemption: RedemptionAssembler.toResourceFromEntity(redemption) }),
    );
  }

  /** Listens on local IPv4 and IPv6, because "localhost" may resolve to either. */
  async start(): Promise<void> {
    await listen(this.createHttpServer(), this.options.port, '127.0.0.1');
    await listen(this.createHttpServer(), this.options.port, '::1').catch(() => {});
  }

  private createHttpServer(): Server {
    const server = createServer((req, res) => {
      this.handle(req, res).catch((e) => {
        console.error(e);
        if (!res.headersSent) sendJson(res, 500, { code: 'internal' } satisfies ErrorResource);
      });
    });

    server.on('upgrade', (req, socket, head) => {
      if (req.url !== '/ws' || !this.isOriginAllowed(req)) {
        socket.destroy();
        return;
      }
      this.ws.handleUpgrade(req, socket, head, (client) => {
        client.send(JSON.stringify({ type: 'state', state: this.state() } satisfies ServerMessage));
      });
    });
    return server;
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (!url.pathname.startsWith('/api/')) return this.serveFile(url.pathname, res);

    // Prevents any website open in the browser from using the program's API.
    if (!this.isOriginAllowed(req)) return sendJson(res, 403, { code: 'originNotAllowed' } satisfies ErrorResource);

    try {
      const route = `${req.method} ${url.pathname}`;
      switch (route) {
        case 'GET /api/health':
          return sendJson(res, 200, { ok: true });

        case 'GET /api/state':
          return sendJson(res, 200, this.state());

        case 'POST /api/session':
          await this.options.session.requestLogin();
          return sendJson(res, 200, this.state());

        case 'DELETE /api/session':
          await this.options.session.logout();
          return sendJson(res, 200, this.state());

        case 'GET /api/rewards':
          return sendJson(res, 200, RewardAssembler.toResourcesFromEntities(await this.options.rewards.list()));

        case 'PUT /api/reward': {
          const { id, title } = await readJson(req);
          await this.options.settings.chooseReward(String(id ?? ''), String(title ?? ''));
          return sendJson(res, 200, this.state());
        }

        case 'POST /api/test': {
          const { viewerName } = await readJson(req);
          this.options.relay.simulate(String(viewerName || 'Viewer').slice(0, 25));
          return sendJson(res, 200, this.state());
        }

        case 'POST /api/shutdown':
          sendJson(res, 200, this.state());
          res.once('finish', () => setTimeout(this.options.onShutdown, 100));
          return;

        default:
          return sendJson(res, 404, { code: 'notFound' } satisfies ErrorResource);
      }
    } catch (e) {
      if (e instanceof DomainError) return sendJson(res, 400, ErrorAssembler.toResourceFromEntity(e));
      throw e;
    }
  }

  /** Serves the built web. Paths without a file (/overlay) return index.html. */
  private async serveFile(path: string, res: ServerResponse): Promise<void> {
    const root = resolve(this.options.webDir);
    let file = resolve(join(root, decodeURIComponent(path)));
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }

    const info = await stat(file).catch(() => null);
    if (!info?.isFile()) file = join(root, 'index.html');
    if (!(await stat(file).catch(() => null))) {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('The web is not built. Run start.bat again.');
      return;
    }

    res.writeHead(200, {
      'Content-Type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
      // Only files with a hash in their name (main-AB12CD34.js) never change; the rest (index.html, i18n/*.json) is revalidated.
      'Cache-Control': HASHED_FILE.test(basename(file)) ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    createReadStream(file).pipe(res);
  }

  private state(): ServerStateResource {
    const { settings, session, relay } = this.options;
    const current = session.current;
    const activation = session.pendingActivation;
    const error = session.lastError ?? relay.lastError;
    return {
      settings: SettingsAssembler.toResourceFromEntity(settings.current()),
      session: current && SessionAssembler.toResourceFromEntity(current),
      activation: activation && ActivationAssembler.toResourceFromEntity(activation),
      listener: relay.listenerState,
      error: error && ErrorAssembler.toResourceFromEntity(error),
    };
  }

  private broadcast(message: ServerMessage): void {
    const text = JSON.stringify(message);
    for (const client of this.ws.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(text);
    }
  }

  /** Without an Origin header (old OBS, curl) it is allowed; with one, only the program's own web. */
  private isOriginAllowed(req: IncomingMessage): boolean {
    const origin = req.headers.origin;
    return !origin || this.origins.has(origin);
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (!req.headers['content-type']?.includes('application/json')) {
    throw new DomainError('mustBeJson');
  }
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (text.length > MAX_BODY) throw new DomainError('requestTooLarge');
  }
  try {
    return JSON.parse(text || '{}');
  } catch {
    throw new DomainError('invalidJson');
  }
}

function listen(server: Server, port: number, host: string): Promise<void> {
  return new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(port, host, () => ok());
  });
}
