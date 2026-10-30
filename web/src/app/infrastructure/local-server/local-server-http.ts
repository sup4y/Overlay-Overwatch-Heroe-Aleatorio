import { Injectable } from '@angular/core';
import { ErrorResource, RewardResource, ServerMessage, ServerStateResource } from '@contract/api';
import { ErrorAssembler } from '@contract/assemblers/error.assembler';
import { RedemptionAssembler } from '@contract/assemblers/redemption.assembler';
import { RewardAssembler } from '@contract/assemblers/reward.assembler';
import { DomainError } from '@domain/common/domain-error';
import { Reward } from '@domain/reward/reward';
import { LocalServer, LocalServerObserver } from '../../application/ports/local-server';

const RETRY_MS = 2000;

/** Talks to the local program: commands over HTTP (/api) and live notices over WebSocket (/ws). */
@Injectable()
export class LocalServerHttp extends LocalServer {
  private observer?: LocalServerObserver;
  private retryTimer?: ReturnType<typeof setTimeout>;

  connect(observer: LocalServerObserver): void {
    this.observer = observer;
    this.open();
  }

  async startLogin(): Promise<string> {
    const state = await this.request<ServerStateResource>('POST', '/api/session');
    if (!state.activation) throw new DomainError('serverError', { status: 'no code' });
    return state.activation.url;
  }

  logout(): Promise<void> {
    return this.request('DELETE', '/api/session');
  }

  async listRewards(): Promise<Reward[]> {
    return RewardAssembler.toEntitiesFromResponse(await this.request<RewardResource[]>('GET', '/api/rewards'));
  }

  chooseReward(reward: Reward): Promise<void> {
    return this.request('PUT', '/api/reward', { id: reward.id, title: reward.title });
  }

  simulateRedemption(viewerName: string): Promise<void> {
    return this.request('POST', '/api/test', { viewerName });
  }

  shutdown(): Promise<void> {
    return this.request('POST', '/api/shutdown');
  }

  /** If the program closes or restarts, it reconnects by itself. */
  private open(): void {
    clearTimeout(this.retryTimer);
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${location.host}/ws`);

    ws.onopen = () => this.observer?.onConnectionChange(true);
    ws.onmessage = (e) => {
      const message: ServerMessage = JSON.parse(e.data);
      if (message.type === 'state') {
        this.observer?.onStateChange(message.state);
      } else {
        this.observer?.onRedemption(RedemptionAssembler.toEntityFromResource(message.redemption));
      }
    };
    ws.onclose = () => {
      this.observer?.onConnectionChange(false);
      this.retryTimer = setTimeout(() => this.open(), RETRY_MS);
    };
  }

  private async request<T = void>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetch(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new DomainError('connectionUnavailable');
    }
    if (!res.ok) {
      const resource: ErrorResource | null = await res.json().catch(() => null);
      throw resource?.code
        ? ErrorAssembler.toEntityFromResource(resource)
        : new DomainError('serverError', { status: res.status });
    }
    return res.json();
  }
}
