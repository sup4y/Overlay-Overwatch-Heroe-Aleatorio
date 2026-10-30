import { Injectable, computed, inject, signal } from '@angular/core';
import { ErrorAssembler } from '@contract/assemblers/error.assembler';
import { DomainError } from '@domain/common/domain-error';
import { Reward } from '@domain/reward/reward';
import { LocalServer } from './ports/local-server';
import { ServerStateService } from './server-state.service';
import { SettingsService } from './settings.service';

/** Use case: the channel rewards and the incoming redemptions (the local program already filters them). */
@Injectable({ providedIn: 'root' })
export class RedemptionsService {
  private readonly server = inject(LocalServer);
  private readonly serverState = inject(ServerStateService);
  private readonly settings = inject(SettingsService);

  readonly redemptions = this.serverState.redemptions;
  readonly listenerState = computed(() => this.serverState.state()?.listener ?? 'disconnected');
  readonly error = computed(() => {
    const resource = this.serverState.state()?.error;
    return resource ? ErrorAssembler.toEntityFromResource(resource) : null;
  });

  /** Public channel rewards, or null if they haven't been loaded yet. */
  readonly rewards = signal<Reward[] | null>(null);
  readonly rewardsError = signal<DomainError | null>(null);
  readonly loadingRewards = signal(false);

  /** The saved reward is no longer among the public ones (it was deleted or disabled on Twitch). */
  readonly chosenRewardMissing = computed(() => {
    const settings = this.settings.current();
    const rewards = this.rewards();
    return !!settings?.hasReward && !!rewards && !rewards.some((r) => settings.matchesReward(r));
  });

  async loadRewards(): Promise<void> {
    this.loadingRewards.set(true);
    this.rewardsError.set(null);
    try {
      this.rewards.set(await this.server.listRewards());
    } catch (e) {
      if (!(e instanceof DomainError)) throw e;
      this.rewards.set(null);
      this.rewardsError.set(e);
    } finally {
      this.loadingRewards.set(false);
    }
  }

  /** Test redemption that reaches every open screen, OBS included. */
  simulate(viewerName: string): Promise<void> {
    return this.server.simulateRedemption(viewerName);
  }
}
