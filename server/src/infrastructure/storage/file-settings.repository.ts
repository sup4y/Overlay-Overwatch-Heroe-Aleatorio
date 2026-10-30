import { SettingsAssembler } from '@contract/assemblers/settings.assembler';
import { StreamerSettings } from '@domain/settings/streamer-settings';
import { SettingsRepository } from '@domain/settings/settings.repository';
import { DataFile } from './stored-data';

export class FileSettingsRepository extends SettingsRepository {
  constructor(private readonly file: DataFile) {
    super();
  }

  /** An expired reward (more than 30 days) is treated as if none had been chosen. */
  async get(): Promise<StreamerSettings | null> {
    const { settings } = await this.file.read();
    if (!settings) return null;
    try {
      return SettingsAssembler.toEntityFromResource(settings);
    } catch {
      return null;
    }
  }

  async save(settings: StreamerSettings): Promise<void> {
    await this.file.update((data) => {
      data.settings = SettingsAssembler.toResourceFromEntity(settings);
    });
  }
}
