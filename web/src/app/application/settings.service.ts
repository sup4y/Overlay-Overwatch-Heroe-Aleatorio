import { Injectable, computed, inject } from '@angular/core';
import { SettingsAssembler } from '@contract/assemblers/settings.assembler';
import { Reward } from '@domain/reward/reward';
import { LocalServer } from './ports/local-server';
import { ServerStateService } from './server-state.service';

/** Use case: read the streamer settings and choose the reward. */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly server = inject(LocalServer);
  private readonly serverState = inject(ServerStateService);

  readonly current = computed(() => {
    const resource = this.serverState.state()?.settings;
    if (!resource) return null;
    try {
      return SettingsAssembler.toEntityFromResource(resource);
    } catch {
      return null;
    }
  });

  /** Step 02: the streamer chooses with one click the reward that triggers the overlay. */
  chooseReward(reward: Reward): Promise<void> {
    return this.server.chooseReward(reward);
  }
}
