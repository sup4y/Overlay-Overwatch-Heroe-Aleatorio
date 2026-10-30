import { HttpClient, provideHttpClient, withFetch } from '@angular/common/http';
import { EnvironmentProviders, Injectable, Provider, inject, isDevMode, provideAppInitializer } from '@angular/core';
import {
  Translation,
  TranslocoLoader,
  TranslocoMissingHandler,
  provideTransloco,
  provideTranslocoMissingHandler,
} from '@jsverse/transloco';
import { DEFAULT_LANGUAGE, LANGUAGES } from './language';
import { LanguageService } from './language.service';

/** Reads the translations from public/i18n/<language>.json. */
@Injectable({ providedIn: 'root' })
export class TranslocoHttpLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  getTranslation(language: string) {
    // 'no-cache': always asks the server, so it never keeps the translations of a previous version.
    return this.http.get<Translation>(`/i18n/${language}.json`, { cache: 'no-cache' });
  }
}

/**
 * If a key is missing (e.g. a new subrole not translated yet), it shows its
 * last readable part ("subroles.vanguard" → "Vanguard") instead of the key.
 */
@Injectable()
export class MissingKeyHandler implements TranslocoMissingHandler {
  handle(key: string): string {
    if (isDevMode()) console.warn(`Missing translation: ${key}`);
    const last = key.split('.').pop() ?? key;
    return last.charAt(0).toUpperCase() + last.slice(1);
  }
}

export function provideI18n(): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(withFetch()),
    provideTransloco({
      config: {
        availableLangs: [...LANGUAGES],
        defaultLang: DEFAULT_LANGUAGE,
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
        // Some translations are empty on purpose (e.g. "overlay.summonPrefix" in English).
        missingHandler: { allowEmpty: true },
      },
      loader: TranslocoHttpLoader,
    }),
    provideTranslocoMissingHandler(MissingKeyHandler),
    provideAppInitializer(() => inject(LanguageService).start()),
  ];
}
