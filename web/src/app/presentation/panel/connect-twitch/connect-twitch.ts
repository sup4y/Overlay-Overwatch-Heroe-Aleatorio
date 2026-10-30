import { Component, inject, input, signal } from '@angular/core';
import { DomainError } from '@domain/common/domain-error';
import { TranslocoPipe } from '@jsverse/transloco';
import { SessionService } from '../../../application/session.service';
import { LanguageService } from '../../i18n/language.service';

/**
 * Step 01: the streamer logs in with Twitch. twitch.tv/activate opens with the
 * code already filled in; once authorized, the program detects it and the panel moves to step 02.
 */
@Component({
  selector: 'app-connect-twitch',
  imports: [TranslocoPipe],
  templateUrl: './connect-twitch.html',
  styleUrl: './connect-twitch.css',
})
export class ConnectTwitch {
  protected readonly session = inject(SessionService);
  private readonly language = inject(LanguageService);

  /** Without the local program it is not possible to log in. */
  readonly disabled = input(false);

  protected readonly sending = signal(false);
  protected readonly error = signal<DomainError | null>(null);

  protected async connect(): Promise<void> {
    // The tab opens right away, inside the click: if it opened after waiting for the server, the browser would block it.
    const tab = window.open('about:blank', '_blank');
    if (tab) tab.opener = null;

    this.sending.set(true);
    this.error.set(null);
    try {
      const url = await this.session.start();
      if (tab) tab.location.href = url;
    } catch (e) {
      tab?.close();
      if (!(e instanceof DomainError)) throw e;
      this.error.set(e);
    } finally {
      this.sending.set(false);
    }
  }

  protected async cancel(): Promise<void> {
    this.sending.set(true);
    try {
      await this.session.logout();
    } catch (e) {
      if (!(e instanceof DomainError)) throw e;
      this.error.set(e);
    } finally {
      this.sending.set(false);
    }
  }

  protected formatTime(date: Date): string {
    return date.toLocaleTimeString(this.language.current(), { hour: '2-digit', minute: '2-digit' });
  }
}
