import { StreamerSettings } from '../../domain/settings/streamer-settings';
import type { SettingsResource } from '../api';

/** Converts the streamer settings between the domain entity and its resource. */
export class SettingsAssembler {
  static toEntityFromResource(resource: SettingsResource): StreamerSettings {
    const { reward } = resource;
    return StreamerSettings.create(reward && { id: reward.id, title: reward.title, savedAt: new Date(reward.savedAt) });
  }

  /** An expired reward (more than 30 days) is sent as null. */
  static toResourceFromEntity(settings: StreamerSettings): SettingsResource {
    const { reward } = settings;
    return { reward: reward && { id: reward.id, title: reward.title, savedAt: reward.savedAt.toISOString() } };
  }
}
