import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { Language, detectLanguage, saveLanguage } from './language';

/** Active UI language. Keeps Transloco, <html lang> and the title in sync. */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);

  readonly current = signal<Language>(detectLanguage());

  /** Loads the initial language translations before rendering anything. */
  async start(): Promise<void> {
    await this.apply(this.current());
  }

  async change(language: Language): Promise<void> {
    saveLanguage(language);
    await this.apply(language);
  }

  private async apply(language: Language): Promise<void> {
    await firstValueFrom(this.transloco.load(language));
    this.transloco.setActiveLang(language);
    this.current.set(language);
    this.document.documentElement.lang = language;
    this.document.title = this.transloco.translate('app.title');
  }
}
