/** The chosen reward and the Twitch session are remembered for 30 days from when they were saved. */
export const RETENTION_DAYS = 30;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

export function expiresAt(savedAt: Date): Date {
  return new Date(savedAt.getTime() + RETENTION_MS);
}

export function isExpired(savedAt: Date, now = new Date()): boolean {
  return Number.isNaN(savedAt.getTime()) || expiresAt(savedAt) <= now;
}
