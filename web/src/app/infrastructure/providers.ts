import { Provider } from '@angular/core';
import { RandomGenerator } from '@domain/common/random-generator';
import { HeroRepository } from '@domain/hero/hero.repository';
import { LocalServer } from '../application/ports/local-server';
import { LocalServerHttp } from './local-server/local-server-http';
import { OverfastHeroRepository } from './overfast/overfast-hero.repository';
import { CryptoRandomGenerator } from './random/crypto-random-generator';

/**
 * Wires each port to its adapter. To switch games (another heroes API)
 * changing one line here is enough.
 */
export function provideInfrastructure(): Provider[] {
  return [
    { provide: HeroRepository, useClass: OverfastHeroRepository },
    { provide: RandomGenerator, useClass: CryptoRandomGenerator },
    { provide: LocalServer, useClass: LocalServerHttp },
  ];
}
