import { SERVER_PORT } from '@contract/api';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));

export const config = {
  port: SERVER_PORT,
  panelUrl: `http://localhost:${SERVER_PORT}`,
  /**
   * The program's Twitch app (type "Public"). It is the same for every streamer:
   * nobody has to create their own app. It can be changed with the TWITCH_CLIENT_ID variable.
   */
  twitchClientId: process.env['TWITCH_CLIENT_ID'] ?? '29eure9cofnjq9gffs65hsdbx1j87p',
  dataFile: join(projectRoot, 'data', 'settings.json'),
  webDir: join(projectRoot, 'web', 'dist', 'web', 'browser'),
  /** `npm start` inside web/ (ng serve with hot reload). */
  extraOrigins: ['http://localhost:4201'],
} as const;
