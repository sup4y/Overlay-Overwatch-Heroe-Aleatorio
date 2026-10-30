import { expiresAt, isExpired } from '../common/retention';

const ONE_MINUTE = 60_000;

/**
 * The streamer's Twitch session. The token lasts a few hours and refreshes itself
 * with the refresh token; the session is remembered for 30 days from when it started.
 */
export class Session {
  constructor(
    readonly token: string,
    readonly refreshToken: string,
    readonly login: string,
    readonly userId: string,
    readonly clientId: string,
    /** When the current token expires (not the session). */
    readonly tokenExpiresAt: Date,
    readonly savedAt: Date,
  ) {}

  get expiresAt(): Date {
    return expiresAt(this.savedAt);
  }

  isExpired(now = new Date()): boolean {
    return isExpired(this.savedAt, now);
  }

  /** true if the token expires within the given margin (10 minutes by default). */
  needsRefresh(now = new Date(), marginMs = 10 * ONE_MINUTE): boolean {
    return this.tokenExpiresAt.getTime() - now.getTime() <= marginMs;
  }

  /** The same session with new tokens (Twitch returns a new refresh token on every refresh). */
  withTokens(token: string, refreshToken: string, tokenExpiresAt: Date): Session {
    return new Session(token, refreshToken, this.login, this.userId, this.clientId, tokenExpiresAt, this.savedAt);
  }
}
