/**
 * Composition root of the local server: wires each port to its adapter and starts.
 * start.bat launches it in the background, with the output in logs/server.log.
 */
import { RedemptionRelay } from './application/redemption-relay';
import { RewardCatalog } from './application/reward-catalog';
import { SessionManager } from './application/session-manager';
import { SettingsManager } from './application/settings-manager';
import { config } from './config';
import { FileSessionRepository } from './infrastructure/storage/file-session.repository';
import { FileSettingsRepository } from './infrastructure/storage/file-settings.repository';
import { JsonFile } from './infrastructure/storage/json-file';
import { DEFAULT_STORED_DATA, StoredData } from './infrastructure/storage/stored-data';
import { TwitchDeviceFlowProvider } from './infrastructure/twitch/twitch-device-flow.provider';
import { TwitchEventSubRedemptionSource } from './infrastructure/twitch/twitch-eventsub.redemption-source';
import { TwitchHelixRewardProvider } from './infrastructure/twitch/twitch-helix.reward-provider';
import { WebServer } from './infrastructure/web/web-server';

// --- Composition (manual dependency injection) ---
const dataFile = new JsonFile<StoredData>(config.dataFile, DEFAULT_STORED_DATA);
const settings = new SettingsManager(new FileSettingsRepository(dataFile));
const session = new SessionManager(new TwitchDeviceFlowProvider(), new FileSessionRepository(dataFile), config.twitchClientId);
const relay = new RedemptionRelay(new TwitchEventSubRedemptionSource(), session, settings);
const rewards = new RewardCatalog(new TwitchHelixRewardProvider(), session);

const web = new WebServer({
  port: config.port,
  webDir: config.webDir,
  extraOrigins: [...config.extraOrigins],
  settings,
  session,
  relay,
  rewards,
  onShutdown: () => {
    console.log('[server] Program stopped from the panel.');
    process.exit(0);
  },
});

try {
  await web.start();
} catch (e: any) {
  if (e?.code === 'EADDRINUSE') {
    console.error(`[server] Port ${config.port} is already in use. Is the program open in another window?`);
  } else {
    console.error(`[server] Could not open port ${config.port}:`, e);
  }
  process.exit(1);
}

await settings.start();
await session.start();
relay.start();

console.log(`[server] Random Hero at ${config.panelUrl} (${new Date().toLocaleString()})`);
console.log(`[server] OBS: ${config.panelUrl}/overlay`);
// No personal data in the log (Twitch user, computer paths): people share it when asking for help.
console.log('[server] Data: data/settings.json');
console.log(session.current ? '[twitch] Session: saved' : '[twitch] Session: not started');
