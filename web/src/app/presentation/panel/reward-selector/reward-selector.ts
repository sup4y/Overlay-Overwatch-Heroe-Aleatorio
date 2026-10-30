import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DomainError } from '@domain/common/domain-error';
import { Reward } from '@domain/reward/reward';
import { TranslocoPipe } from '@jsverse/transloco';
import { RedemptionsService } from '../../../application/redemptions.service';
import { SessionService } from '../../../application/session.service';
import { SettingsService } from '../../../application/settings.service';
import { LanguageService } from '../../i18n/language.service';

/** Step 02: the streamer taps which of their public rewards triggers the overlay. */
@Component({
  selector: 'app-reward-selector',
  imports: [TranslocoPipe],
  templateUrl: './reward-selector.html',
  styleUrl: './reward-selector.css',
})
export class RewardSelector implements OnInit {
  protected readonly settings = inject(SettingsService);
  protected readonly redemptions = inject(RedemptionsService);
  private readonly session = inject(SessionService);
  private readonly language = inject(LanguageService);

  protected readonly saving = signal(false);
  /** The streamer pressed "Change reward": show the full list even though one is saved. */
  protected readonly editing = signal(false);
  protected readonly error = signal<DomainError | null>(null);

  protected readonly chosen = computed(() => this.redemptions.rewards()?.find((r) => this.isChosen(r)) ?? null);
  /** With a saved reward that still exists, the step collapses to just that reward. */
  protected readonly collapsed = computed(() => !this.editing() && !!this.chosen());
  protected readonly rememberedUntil = computed(() => {
    const expires = this.settings.current()?.rewardExpiresAt;
    return expires ? this.formatDate(expires) : null;
  });

  protected readonly createRewardUrl = computed(() => {
    const login = this.session.current()?.login;
    return login
      ? `https://dashboard.twitch.tv/u/${login}/viewer-rewards/channel-points/rewards`
      : 'https://dashboard.twitch.tv';
  });

  /** It only shows with the session connected: when it appears, it loads the channel rewards. */
  ngOnInit(): void {
    void this.redemptions.loadRewards();
  }

  protected isChosen(reward: Reward): boolean {
    return !!this.settings.current()?.matchesReward(reward);
  }

  protected formatDate(date: Date): string {
    return date.toLocaleDateString(this.language.current(), { day: 'numeric', month: 'long', year: 'numeric' });
  }

  protected async choose(reward: Reward): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    try {
      await this.settings.chooseReward(reward);
      this.editing.set(false);
    } catch (e) {
      if (!(e instanceof DomainError)) throw e;
      this.error.set(e);
    } finally {
      this.saving.set(false);
    }
  }
}
