/** Code the streamer uses to authorize the program on twitch.tv/activate (the link already includes it). */
export class ActivationCode {
  constructor(
    readonly code: string,
    readonly url: string,
    readonly expiresAt: Date,
  ) {}

  isExpired(now = new Date()): boolean {
    return now >= this.expiresAt;
  }
}
