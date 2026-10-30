import { DomainError } from '@domain/common/domain-error';
import { Reward } from '@domain/reward/reward';
import { ActivationCode } from '@domain/session/activation-code';
import { Session } from '@domain/session/session';

export interface ActivationRequest {
  activation: ActivationCode;
  deviceCode: string;
  intervalSeconds: number;
}

export type ActivationResult =
  | { type: 'pending' }
  | { type: 'authorized'; session: Session }
  | { type: 'denied'; error: DomainError };

/** The provider no longer accepts the session: the streamer has to log in again. */
export class SessionRevokedError extends DomainError {
  constructor() {
    super('sessionRevoked');
  }
}

/** Port: the streamer's channel point rewards. */
export abstract class RewardProvider {
  abstract list(session: Session): Promise<Reward[]>;
}

/** Port: identity provider (Twitch) with login by code. */
export abstract class IdentityProvider {
  abstract requestActivation(clientId: string): Promise<ActivationRequest>;
  abstract checkActivation(clientId: string, request: ActivationRequest): Promise<ActivationResult>;
  /** Throws SessionRevokedError if the refresh token no longer works. */
  abstract refresh(session: Session): Promise<Session>;
  abstract isValid(session: Session): Promise<boolean>;
  abstract revoke(session: Session): Promise<void>;
}
