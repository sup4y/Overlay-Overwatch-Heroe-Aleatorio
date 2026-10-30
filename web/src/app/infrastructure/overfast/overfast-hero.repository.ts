import { Injectable } from '@angular/core';
import { HeroCatalog, HeroRepository } from '@domain/hero/hero.repository';
import { APP_CONFIG } from '../../config';
import { localStore } from '../storage/local-store';
import { HeroAssembler, HeroResource } from './hero.assembler';

const CACHE_PREFIX = 'heroe-aleatorio.heroes';

/**
 * Heroes from OverFast API (unofficial). It keeps a copy so it keeps working
 * if the API goes down in the middle of a stream.
 */
@Injectable()
export class OverfastHeroRepository extends HeroRepository {
  async getCatalog(language: string): Promise<HeroCatalog> {
    const locale = APP_CONFIG.heroesApiLocales[language] ?? APP_CONFIG.heroesApiLocales['en'];
    const cacheKey = `${CACHE_PREFIX}.${language}`;
    try {
      const res = await fetch(`${APP_CONFIG.heroesApiUrl}?locale=${locale}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const heroes = HeroAssembler.toEntitiesFromResponse((await res.json()) as HeroResource[]);
      localStore.write(cacheKey, JSON.stringify(HeroAssembler.toResourcesFromEntities(heroes)));
      return { heroes, fromCache: false };
    } catch (e) {
      console.warn('OverFast API did not answer, using the cache.', e);
      let cache: HeroResource[] = [];
      try {
        cache = JSON.parse(localStore.read(cacheKey) ?? '[]');
      } catch {}
      return { heroes: HeroAssembler.toEntitiesFromResponse(cache), fromCache: true };
    }
  }
}
