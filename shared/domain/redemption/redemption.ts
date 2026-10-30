const TEST_ID_PREFIX = 'test-';

/** A viewer redeemed a channel point reward. */
export class Redemption {
  constructor(
    readonly id: string,
    readonly viewerName: string,
    readonly rewardId: string,
    readonly rewardTitle: string,
    readonly userInput: string,
  ) {}

  /** Fake redemption fired from the panel, to test the overlay without spending points. */
  static test(viewerName: string, rewardId: string, rewardTitle: string): Redemption {
    return new Redemption(`${TEST_ID_PREFIX}${Date.now()}`, viewerName, rewardId, rewardTitle, '');
  }

  get isTest(): boolean {
    return this.id.startsWith(TEST_ID_PREFIX);
  }
}
