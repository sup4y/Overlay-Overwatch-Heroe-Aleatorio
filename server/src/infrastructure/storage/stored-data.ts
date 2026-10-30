import { SettingsResource } from '@contract/api';
import { JsonFile } from './json-file';

/** How the session is stored on disk. */
export interface SessionRecord {
  token: string;
  refreshToken: string;
  /** ISO 8601. When the current token expires (it refreshes itself). */
  tokenExpiresAt: string;
  login: string;
  userId: string;
  clientId: string;
  /** ISO 8601. The session is forgotten 30 days later. */
  savedAt: string;
}

/** Shape of `data/settings.json`. Each repository only reads and writes its own section. */
export interface StoredData {
  settings: SettingsResource | null;
  /** Twitch tokens: they never leave the server. */
  session: SessionRecord | null;
}

export const DEFAULT_STORED_DATA: StoredData = { settings: null, session: null };

export type DataFile = JsonFile<StoredData>;
