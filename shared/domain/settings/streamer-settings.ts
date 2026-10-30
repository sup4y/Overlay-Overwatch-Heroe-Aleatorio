import { DomainError } from '../common/domain-error';
import { expiresAt, isExpired } from '../common/retention';

/** Twitch limits a reward title to 45 characters. */
const MAX_TITLE_LENGTH = 45;

/** Channel point reward that triggers the overlay. */
export interface ChosenReward {
  /** Reward ID on Twitch. Empty if only the title is known. */
  id: string;
  title: string;
  savedAt: Date;
}

/** What each streamer configures: the reward that triggers the overlay (step 02). */
export class StreamerSettings {
  private constructor(private readonly savedReward: ChosenReward | null) {}

  static create(reward: ChosenReward | null = null): StreamerSettings {
    return new StreamerSettings(reward && validateReward(reward));
  }

  /** The same settings with another chosen reward (remembered for 30 days from now). */
  withReward(id: string, title: string, now = new Date()): StreamerSettings {
    return StreamerSettings.create({ id, title, savedAt: now });
  }

  /** The chosen reward, or null if there is none or it expired (more than 30 days). */
  get reward(): ChosenReward | null {
    return this.savedReward && !isExpired(this.savedReward.savedAt) ? this.savedReward : null;
  }

  get hasReward(): boolean {
    return this.reward !== null;
  }

  get rewardTitle(): string {
    return this.reward?.title ?? '';
  }

  get rewardExpiresAt(): Date | null {
    return this.reward && expiresAt(this.reward.savedAt);
  }

  /** The ID takes priority; without an ID the title is compared ignoring case and accents. */
  matchesReward(reward: { id: string; title: string }): boolean {
    const chosen = this.reward;
    if (!chosen) return false;
    if (chosen.id) return reward.id === chosen.id;
    return normalize(reward.title) === normalize(chosen.title);
  }
}

function validateReward({ id, title, savedAt }: ChosenReward): ChosenReward | null {
  const clean = { id: id.trim(), title: title.trim(), savedAt };
  if (!clean.id && !clean.title) return null;
  if (clean.title.length > MAX_TITLE_LENGTH) {
    throw new DomainError('rewardTitleTooLong', { max: MAX_TITLE_LENGTH });
  }
  return clean;
}

function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toUpperCase();
}
