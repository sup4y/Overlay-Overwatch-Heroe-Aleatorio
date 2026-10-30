import { StreamerSettings } from '@domain/settings/streamer-settings';
import { SettingsRepository } from '@domain/settings/settings.repository';
import { Emitter } from './emitter';

/** Use case: read and save the streamer settings (the chosen reward). */
export class SettingsManager {
  readonly changes = new Emitter();
  private settings = StreamerSettings.create();

  constructor(private readonly repository: SettingsRepository) {}

  async start(): Promise<void> {
    this.settings = (await this.repository.get()) ?? StreamerSettings.create();
  }

  current(): StreamerSettings {
    return this.settings;
  }

  /** Step 02: the reward that triggers the overlay. Remembered for 30 days. */
  async chooseReward(id: string, title: string): Promise<StreamerSettings> {
    const settings = this.settings.withReward(id, title);
    await this.repository.save(settings);
    this.settings = settings;
    this.changes.emit();
    return settings;
  }
}
