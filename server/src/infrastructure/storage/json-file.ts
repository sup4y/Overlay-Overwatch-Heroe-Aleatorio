import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

/** JSON file on disk with atomic, ordered writes. */
export class JsonFile<T extends object> {
  private cache: T | null = null;
  private pendingWrite: Promise<void> = Promise.resolve();

  constructor(
    readonly path: string,
    private readonly defaults: T,
  ) {}

  async read(): Promise<T> {
    if (!this.cache) {
      try {
        const text = (await readFile(this.path, 'utf8')).replace(/^﻿/, '');
        this.cache = { ...structuredClone(this.defaults), ...(JSON.parse(text) as Partial<T>) };
      } catch {
        this.cache = structuredClone(this.defaults);
      }
    }
    return structuredClone(this.cache);
  }

  async update(change: (data: T) => void): Promise<void> {
    const data = await this.read();
    change(data);
    this.cache = data;
    // If a write fails, the next one is attempted anyway.
    this.pendingWrite = this.pendingWrite.catch(() => {}).then(() => this.persist(data));
    await this.pendingWrite;
  }

  /** Writes a temporary file first and renames it, so the file is never left half-written. */
  private async persist(data: T): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.tmp`;
    await writeFile(temporary, JSON.stringify(data, null, 2), 'utf8');
    await rename(temporary, this.path);
  }
}
