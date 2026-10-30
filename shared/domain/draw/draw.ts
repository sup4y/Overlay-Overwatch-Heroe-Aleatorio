import { DomainError } from '../common/domain-error';
import { RandomGenerator } from '../common/random-generator';
import { Hero } from '../hero/hero';

/**
 * Main aggregate: a card draw for a viewer.
 * It decides from the start which cards are on the table and which one will be chosen.
 */
export class Draw {
  private constructor(
    readonly viewerName: string,
    readonly cards: readonly Hero[],
    readonly chosenIndex: number,
    readonly date: Date,
  ) {}

  static create(viewerName: string, catalog: readonly Hero[], cardCount: number, random: RandomGenerator): Draw {
    if (catalog.length === 0) {
      throw new DomainError('noHeroes');
    }
    const cards = random.sample(catalog, cardCount);
    return new Draw(viewerName, cards, random.integer(cards.length), new Date());
  }

  get chosenHero(): Hero {
    return this.cards[this.chosenIndex];
  }
}
