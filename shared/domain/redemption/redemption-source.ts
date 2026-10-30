import { DomainError } from '../common/domain-error';
import { Session } from '../session/session';
import { Redemption } from './redemption';

export type ListenerState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface RedemptionObserver {
  onRedemption(redemption: Redemption): void;
  onStateChange(state: ListenerState, error?: DomainError): void;
}

/** Port: channel through which redemptions arrive in real time. */
export abstract class RedemptionSource {
  /**
   * @param currentSession is queried every time the token is needed,
   *   because the session refreshes itself while the connection stays open.
   */
  abstract connect(currentSession: () => Session | null, observer: RedemptionObserver): void;
  abstract disconnect(): void;
}
