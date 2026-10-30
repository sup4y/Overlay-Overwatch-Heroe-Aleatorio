export const LANGUAGES = ['es', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'es';
const LANGUAGE_KEY = 'heroe-aleatorio.language';

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language);
}

/**
 * Initial language: the one in the URL (?lang=en, used by the OBS overlay),
 * the last one chosen in the panel, the browser's or Spanish.
 */
export function detectLanguage(): Language {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (isLanguage(fromUrl)) return fromUrl;

  let saved: string | null = null;
  try {
    saved = localStorage.getItem(LANGUAGE_KEY);
  } catch {}
  if (isLanguage(saved)) return saved;

  const fromBrowser = navigator.languages.map((l) => l.slice(0, 2)).find(isLanguage);
  return fromBrowser ?? DEFAULT_LANGUAGE;
}

/** This browser's preference: if storage is blocked, it simply isn't remembered. */
export function saveLanguage(language: Language): void {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {}
}
