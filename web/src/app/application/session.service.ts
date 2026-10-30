import { Injectable, computed, inject } from '@angular/core';
import { ActivationAssembler } from '@contract/assemblers/activation.assembler';
import { LocalServer } from './ports/local-server';
import { ServerStateService } from './server-state.service';

/** Use case: connect and disconnect the Twitch account (the local program stores and refreshes it). */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly server = inject(LocalServer);
  private readonly serverState = inject(ServerStateService);

  readonly current = computed(() => {
    const resource = this.serverState.state()?.session;
    return resource ? { login: resource.login, expiresAt: new Date(resource.expiresAt) } : null;
  });

  /** While waiting for the streamer to authorize the program on Twitch. */
  readonly activation = computed(() => {
    const resource = this.serverState.state()?.activation;
    return resource ? ActivationAssembler.toEntityFromResource(resource) : null;
  });

  /** Step 01: returns the Twitch link (with the code already filled in) to authorize the program. */
  start(): Promise<string> {
    return this.server.startLogin();
  }

  logout(): Promise<void> {
    return this.server.logout();
  }
}
