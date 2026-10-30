/** Custom channel point reward that the streamer already created on Twitch. */
export class Reward {
  constructor(
    readonly id: string,
    readonly title: string,
    readonly cost: number,
    /** Visible to viewers in the channel points menu. */
    readonly isEnabled: boolean,
    /** Visible, but temporarily not redeemable. */
    readonly isPaused: boolean,
    /** Icon background color (#RRGGBB). */
    readonly color: string,
    readonly imageUrl: string | null,
  ) {}
}
