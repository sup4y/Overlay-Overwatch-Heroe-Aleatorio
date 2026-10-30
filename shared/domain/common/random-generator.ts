/**
 * Port: source of randomness. Abstracting it allows fair draws in production
 * and predictable draws in tests.
 */
export abstract class RandomGenerator {
  /** Integer in [0, max). */
  abstract integer(max: number): number;

  /** Copy of the list in random order (Fisher–Yates). */
  shuffle<T>(list: readonly T[]): T[] {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.integer(i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /** `n` distinct random elements. */
  sample<T>(list: readonly T[], n: number): T[] {
    return this.shuffle(list).slice(0, Math.min(n, list.length));
  }
}
