import { Hero } from './hero';

export interface HeroCatalog {
  heroes: Hero[];
  /** true if the main source failed and the last saved copy was used. */
  fromCache: boolean;
}

/** Port: where the available heroes come from. */
export abstract class HeroRepository {
  /** @param language language code ('es', 'en'…) for the hero names. */
  abstract getCatalog(language: string): Promise<HeroCatalog>;
}
