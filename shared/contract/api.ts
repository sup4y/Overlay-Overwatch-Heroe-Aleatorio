/**
 * Contract between the local server and the web (panel and overlay).
 * Resources are the plain JSON shapes that travel over HTTP and WebSocket;
 * the assemblers in `./assemblers` convert them to and from domain entities.
 * They never include tokens: those only live inside the server.
 */
import type { ListenerState } from '../domain/redemption/redemption-source';
import type { ErrorParams } from '../domain/common/domain-error';

export const SERVER_PORT = 4200;

export interface ChosenRewardResource {
  /** Reward ID on Twitch (empty if only the title is known). */
  id: string;
  title: string;
  /** ISO 8601. Remembered for 30 days from this date. */
  savedAt: string;
}

export interface SettingsResource {
  /** null until the streamer chooses the reward (or if it expired). */
  reward: ChosenRewardResource | null;
}

/** Public channel point reward that the streamer already created on Twitch. */
export interface RewardResource {
  id: string;
  title: string;
  cost: number;
  /** Visible, but temporarily not redeemable. */
  isPaused: boolean;
  /** Icon background color (#RRGGBB). */
  color: string;
  imageUrl: string | null;
}

export interface SessionResource {
  login: string;
  /** ISO 8601. From this date on the streamer has to connect again. */
  expiresAt: string;
}

export interface ActivationResource {
  code: string;
  /** Link to twitch.tv/activate with the code already filled in. */
  url: string;
  /** ISO 8601 */
  expiresAt: string;
}

export interface RedemptionResource {
  id: string;
  viewerName: string;
  rewardId: string;
  rewardTitle: string;
  userInput: string;
}

export interface ServerStateResource {
  settings: SettingsResource;
  session: SessionResource | null;
  /** Present while waiting for the streamer to authorize the program on Twitch. */
  activation: ActivationResource | null;
  listener: ListenerState;
  error: ErrorResource | null;
}

/** Messages the server sends over WebSocket (/ws). */
export type ServerMessage =
  | { type: 'state'; state: ServerStateResource }
  | { type: 'redemption'; redemption: RedemptionResource };

/** API (/api/...) or state error. The web translates it with the key `errors.<code>`. */
export interface ErrorResource {
  code: string;
  params?: ErrorParams;
}
