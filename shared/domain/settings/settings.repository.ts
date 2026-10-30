import { StreamerSettings } from './streamer-settings';

/** Port: where the streamer settings are stored. */
export abstract class SettingsRepository {
  abstract get(): Promise<StreamerSettings | null>;
  abstract save(settings: StreamerSettings): Promise<void>;
}
