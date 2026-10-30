import { DomainError } from '@domain/common/domain-error';
import { Reward } from '@domain/reward/reward';
import { Session } from '@domain/session/session';
import { RewardProvider } from '../../application/ports';
import { TwitchRewardAssembler, TwitchRewardsResponse } from './twitch-reward.assembler';

const REWARDS_URL = 'https://api.twitch.tv/helix/channel_points/custom_rewards';

/** The channel's custom rewards (Helix). The channel:read:redemptions permission is enough. */
export class TwitchHelixRewardProvider extends RewardProvider {
  async list(session: Session): Promise<Reward[]> {
    const res = await fetch(`${REWARDS_URL}?broadcaster_id=${encodeURIComponent(session.userId)}`, {
      headers: { 'Client-Id': session.clientId, Authorization: `Bearer ${session.token}` },
    });
    // 403: the channel is neither Affiliate nor Partner, so it has no channel points.
    if (res.status === 403) throw new DomainError('rewardsForbidden');
    if (!res.ok) throw new DomainError('rewardsFailed', { status: res.status });

    return TwitchRewardAssembler.toEntitiesFromResponse((await res.json()) as TwitchRewardsResponse);
  }
}
