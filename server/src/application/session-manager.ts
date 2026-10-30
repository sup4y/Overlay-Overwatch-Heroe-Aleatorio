import { DomainError } from '@domain/common/domain-error';
import { ActivationCode } from '@domain/session/activation-code';
import { Session } from '@domain/session/session';
import { SessionRepository } from '@domain/session/session.repository';
import { Emitter } from './emitter';
import { ActivationRequest, IdentityProvider, SessionRevokedError } from './ports';

const ONE_MINUTE = 60_000;
const ONE_HOUR = 60 * ONE_MINUTE;
const REFRESH_MARGIN = 10 * ONE_MINUTE;

/**
 * Use case: log in with Twitch, store the session and keep it alive.
 * The program uses its own Twitch app, so the streamer only has to authorize it
 * in the Twitch tab that opens (the code is already filled in).
 * The session refreshes itself and is remembered for 30 days.
 */
export class SessionManager {
  readonly changes = new Emitter();

  private session: Session | null = null;
  private activation: ActivationCode | null = null;
  private error: DomainError | null = null;
  /** Every login or logout invalidates the previous waits. */
  private attempt = 0;
  private timer?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly provider: IdentityProvider,
    private readonly repository: SessionRepository,
    private readonly clientId: string,
  ) {}

  get current(): Session | null {
    return this.session;
  }

  get pendingActivation(): ActivationCode | null {
    return this.activation;
  }

  get lastError(): DomainError | null {
    return this.error;
  }

  /** Restores the saved session (if it is still valid) and refreshes it if needed. */
  async start(): Promise<void> {
    const saved = await this.repository.get();
    if (!saved) return;
    if (saved.clientId !== this.clientId || saved.isExpired()) {
      await this.repository.delete();
      return;
    }
    this.session = saved;
    await this.keepAlive();
  }

  /** Step 01: asks Twitch for a code and returns the link (with the code filled in) to authorize. */
  async requestLogin(): Promise<ActivationCode> {
    const attempt = ++this.attempt;
    const request = await this.provider.requestActivation(this.clientId);
    this.activation = request.activation;
    this.error = null;
    this.changes.emit();

    void this.waitForAuthorization(request, attempt);
    return request.activation;
  }

  /** Logs out or cancels the login in progress. */
  async logout(): Promise<void> {
    this.attempt++;
    clearTimeout(this.timer);
    const previous = this.session;
    this.session = null;
    this.activation = null;
    this.error = null;
    await this.repository.delete();
    this.changes.emit();
    if (previous) this.provider.revoke(previous).catch(() => {});
  }

  private async waitForAuthorization(request: ActivationRequest, attempt: number): Promise<void> {
    while (attempt === this.attempt && !request.activation.isExpired()) {
      await sleep(request.intervalSeconds * 1000);
      if (attempt !== this.attempt) return;

      let result;
      try {
        result = await this.provider.checkActivation(this.clientId, request);
      } catch (e) {
        console.warn('[twitch] Could not check the authorization, retrying…', e);
        continue;
      }
      if (attempt !== this.attempt || result.type === 'pending') continue;

      this.activation = null;
      if (result.type === 'denied') {
        this.error = result.error;
        this.changes.emit();
      } else {
        console.log('[twitch] Logged in');
        await this.establish(result.session);
      }
      return;
    }

    if (attempt === this.attempt) {
      this.activation = null;
      this.error = new DomainError('activationExpired');
      this.changes.emit();
    }
  }

  private async establish(session: Session): Promise<void> {
    this.session = session;
    this.error = null;
    await this.repository.save(session);
    this.changes.emit();
    this.schedule();
  }

  /** Checks the token, refreshes it if needed and schedules the next check. */
  private async keepAlive(): Promise<void> {
    const session = this.session;
    if (!session) return;
    if (session.isExpired()) return this.forget(new DomainError('sessionExpired'));

    try {
      if (session.needsRefresh(new Date(), REFRESH_MARGIN) || !(await this.provider.isValid(session))) {
        const refreshed = await this.provider.refresh(session);
        if (this.session === session) await this.establish(refreshed);
        return;
      }
      this.schedule();
    } catch (e) {
      if (this.session !== session) return;
      if (e instanceof SessionRevokedError) return this.forget(e);
      console.warn('[twitch] Could not refresh the session (no internet?). Retrying in 1 minute.', e);
      this.schedule(ONE_MINUTE);
    }
  }

  private async forget(error: DomainError): Promise<void> {
    this.session = null;
    this.error = error;
    await this.repository.delete();
    this.changes.emit();
  }

  /** Twitch asks to validate the token at least every hour; it is refreshed 10 minutes before expiring. */
  private schedule(ms?: number): void {
    clearTimeout(this.timer);
    if (!this.session) return;
    const untilRefresh = this.session.tokenExpiresAt.getTime() - Date.now() - REFRESH_MARGIN;
    const delay = ms ?? Math.max(0, Math.min(ONE_HOUR, untilRefresh));
    this.timer = setTimeout(() => void this.keepAlive(), delay);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
