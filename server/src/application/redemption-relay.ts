import { DomainError } from '@domain/common/domain-error';
import { Redemption } from '@domain/redemption/redemption';
import { ListenerState, RedemptionSource } from '@domain/redemption/redemption-source';
import { Emitter } from './emitter';
import { SessionManager } from './session-manager';
import { SettingsManager } from './settings-manager';

/**
 * Use case: while there is a session, listens to Twitch redemptions and
 * forwards only the chosen reward's ones to the connected screens.
 */
export class RedemptionRelay {
  readonly changes = new Emitter();
  readonly redemptions = new Emitter<Redemption>();

  private state: ListenerState = 'disconnected';
  private error: DomainError | null = null;
  private connectedUserId: string | null = null;

  constructor(
    private readonly source: RedemptionSource,
    private readonly session: SessionManager,
    private readonly settings: SettingsManager,
  ) {
    session.changes.subscribe(() => this.sync());
  }

  get listenerState(): ListenerState {
    return this.state;
  }

  get lastError(): DomainError | null {
    return this.error;
  }

  start(): void {
    this.sync();
  }

  /** Fires a fake redemption, to test the OBS overlay without spending points. */
  simulate(viewerName: string): Redemption {
    const reward = this.settings.current().reward;
    const redemption = Redemption.test(viewerName, reward?.id ?? '', reward?.title ?? '');
    this.redemptions.emit(redemption);
    return redemption;
  }

  private sync(): void {
    const session = this.session.current;

    if (!session) {
      if (this.connectedUserId) {
        this.connectedUserId = null;
        this.source.disconnect();
      }
      this.update('disconnected');
      return;
    }

    // After an error (e.g. expired token) it retries when the account is connected again.
    if (this.connectedUserId === session.userId && this.state !== 'error') return;

    this.connectedUserId = session.userId;
    this.source.connect(() => this.session.current, {
      onRedemption: (redemption) => {
        const reward = { id: redemption.rewardId, title: redemption.rewardTitle };
        if (this.settings.current().matchesReward(reward)) this.redemptions.emit(redemption);
      },
      onStateChange: (state, error) => this.update(state, error),
    });
  }

  private update(state: ListenerState, error?: DomainError): void {
    if (state === this.state && error?.code === this.error?.code) return;
    this.state = state;
    this.error = error ?? null;
    this.changes.emit();
  }
}
