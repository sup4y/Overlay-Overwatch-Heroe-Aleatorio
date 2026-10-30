import { ServerStateResource } from '@contract/api';
import { Redemption } from '@domain/redemption/redemption';
import { Reward } from '@domain/reward/reward';

export interface LocalServerObserver {
  onConnectionChange(connected: boolean): void;
  onStateChange(state: ServerStateResource): void;
  onRedemption(redemption: Redemption): void;
}

/**
 * Port: the local program that stores the session, talks to Twitch and
 * forwards the redemptions. The web never sees the tokens.
 */
export abstract class LocalServer {
  abstract connect(observer: LocalServerObserver): void;
  // All the others throw a DomainError with a message for the streamer if they fail.

  /** Asks Twitch for a code and returns the link (with the code already filled in) to authorize the program. */
  abstract startLogin(): Promise<string>;
  /** Logs out or cancels the login in progress. */
  abstract logout(): Promise<void>;
  /** The streamer's public channel point rewards (needs a session). */
  abstract listRewards(): Promise<Reward[]>;
  abstract chooseReward(reward: Reward): Promise<void>;
  abstract simulateRedemption(viewerName: string): Promise<void>;
  /** Closes the local program (it runs in the background, without a window). */
  abstract shutdown(): Promise<void>;
}
