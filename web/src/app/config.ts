/**
 * General app configuration, shared by every streamer.
 * The Twitch session and the reward are set per streamer from the panel.
 */
export const APP_CONFIG = {
  /** Cards dealt on the table (6 to 14 looks good). */
  cardsOnTable: 12,

  /** Seconds the revealed hero stays on screen before disappearing. */
  heroDisplaySeconds: 8,

  /** Overwatch heroes API (unofficial). The locale is added per language. */
  heroesApiUrl: 'https://overfast-api.tekrop.fr/heroes',

  /** OverFast locale for each supported UI language. */
  heroesApiLocales: { es: 'es-es', en: 'en-us' } as Record<string, string>,
} as const;
