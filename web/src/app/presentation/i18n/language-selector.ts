import { Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LANGUAGES } from './language';
import { LanguageService } from './language.service';

/** ES / EN buttons to change the UI language. */
@Component({
  selector: 'app-language-selector',
  imports: [TranslocoPipe],
  template: `
    <div class="selector" role="group" [attr.aria-label]="'language.label' | transloco">
      @for (language of languages; track language) {
        <button
          type="button"
          [class.active]="language === service.current()"
          [attr.aria-pressed]="language === service.current()"
          [attr.lang]="language"
          [title]="'language.' + language | transloco"
          (click)="service.change(language)"
        >
          {{ language.toUpperCase() }}
        </button>
      }
    </div>
  `,
  styles: `
    .selector {
      display: inline-flex;
      overflow: hidden;
      border: 1px solid #3c7be0;
      border-radius: 6px;
    }
    button {
      padding: 6px 14px;
      border: 0;
      background: #0a1530;
      color: #8fb3e8;
      font: 700 15px 'Rajdhani', sans-serif;
      letter-spacing: 1px;
      cursor: pointer;
    }
    button + button {
      border-left: 1px solid #3c7be0;
    }
    button.active {
      background: #1b4290;
      color: #fff;
    }
    button:focus-visible {
      outline: 2px solid #6fe0ff;
      outline-offset: -2px;
    }
  `,
})
export class LanguageSelector {
  protected readonly service = inject(LanguageService);
  protected readonly languages = LANGUAGES;
}
