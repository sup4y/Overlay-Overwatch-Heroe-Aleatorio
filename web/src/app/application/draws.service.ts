import { Injectable, inject, signal } from '@angular/core';
import { RandomGenerator } from '@domain/common/random-generator';
import { Draw } from '@domain/draw/draw';
import { Hero } from '@domain/hero/hero';
import { HeroRepository } from '@domain/hero/hero.repository';
import { APP_CONFIG } from '../config';

/** Use case: load the hero catalog and create draws. */
@Injectable({ providedIn: 'root' })
export class DrawsService {
  private readonly heroes = inject(HeroRepository);
  private readonly random = inject(RandomGenerator);

  readonly catalog = signal<Hero[]>([]);
  readonly fromCache = signal(false);
  readonly loaded = signal(false);

  /** Loads the heroes with their names in the given language. */
  async loadCatalog(language: string): Promise<void> {
    const { heroes, fromCache } = await this.heroes.getCatalog(language);
    this.catalog.set(heroes);
    this.fromCache.set(fromCache);
    this.loaded.set(true);
  }

  /** Throws DomainError if there are no heroes. */
  newDraw(viewerName: string): Draw {
    return Draw.create(viewerName, this.catalog(), APP_CONFIG.cardsOnTable, this.random);
  }
}
