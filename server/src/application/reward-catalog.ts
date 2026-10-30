import { DomainError } from '@domain/common/domain-error';
import { Reward } from '@domain/reward/reward';
import { RewardProvider } from './ports';
import { SessionManager } from './session-manager';

/** Use case: see the channel rewards to choose which one triggers the overlay. */
export class RewardCatalog {
  constructor(
    private readonly provider: RewardProvider,
    private readonly session: SessionManager,
  ) {}

  /** Only public ones (those viewers see), sorted by cost. Throws DomainError if there is no session. */
  async list(): Promise<Reward[]> {
    const session = this.session.current;
    if (!session) throw new DomainError('loginRequired');
    const rewards = await this.provider.list(session);
    return rewards.filter((r) => r.isEnabled).sort((a, b) => a.cost - b.cost);
  }
}
