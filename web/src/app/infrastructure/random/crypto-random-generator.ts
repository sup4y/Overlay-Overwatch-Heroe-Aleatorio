import { Injectable } from '@angular/core';
import { RandomGenerator } from '@domain/common/random-generator';

/** Uses the browser's cryptographic generator: fairer than Math.random. */
@Injectable()
export class CryptoRandomGenerator extends RandomGenerator {
  integer(max: number): number {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] % max;
  }
}
