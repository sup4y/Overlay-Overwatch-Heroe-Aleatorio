import { Injectable, inject, signal } from '@angular/core';
import { ServerStateResource } from '@contract/api';
import { Redemption } from '@domain/redemption/redemption';
import { Subject } from 'rxjs';
import { LocalServer } from './ports/local-server';

/** Live state of the local program (settings, session, listener) and the received redemptions. */
@Injectable({ providedIn: 'root' })
export class ServerStateService {
  private readonly server = inject(LocalServer);
  private readonly redemptions$ = new Subject<Redemption>();
  private started = false;

  readonly connected = signal(false);
  readonly state = signal<ServerStateResource | null>(null);
  readonly redemptions = this.redemptions$.asObservable();

  shutdown(): Promise<void> {
    return this.server.shutdown();
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.server.connect({
      onConnectionChange: (connected) => this.connected.set(connected),
      onStateChange: (state) => this.state.set(state),
      onRedemption: (redemption) => this.redemptions$.next(redemption),
    });
  }
}
