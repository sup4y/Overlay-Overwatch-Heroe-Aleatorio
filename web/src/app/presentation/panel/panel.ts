import { Component, WritableSignal, computed, effect, inject, signal, viewChild } from '@angular/core';
import { DomainError } from '@domain/common/domain-error';
import { Draw } from '@domain/draw/draw';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { DrawsService } from '../../application/draws.service';
import { RedemptionsService } from '../../application/redemptions.service';
import { ServerStateService } from '../../application/server-state.service';
import { SessionService } from '../../application/session.service';
import { SettingsService } from '../../application/settings.service';
import { LanguageSelector } from '../i18n/language-selector';
import { LanguageService } from '../i18n/language.service';
import { Roulette } from '../roulette/roulette';
import { ConnectTwitch } from './connect-twitch/connect-twitch';
import { RewardSelector } from './reward-selector/reward-selector';

/** Main page: 01 connect Twitch, 02 choose the reward, 03 URL for OBS, 04 test the overlay. */
@Component({
  selector: 'app-panel',
  imports: [Roulette, ConnectTwitch, RewardSelector, LanguageSelector, TranslocoPipe],
  templateUrl: './panel.html',
  styleUrl: './panel.css',
})
export class Panel {
  protected readonly serverState = inject(ServerStateService);
  protected readonly settings = inject(SettingsService);
  protected readonly session = inject(SessionService);
  protected readonly redemptions = inject(RedemptionsService);
  protected readonly draws = inject(DrawsService);
  private readonly language = inject(LanguageService);
  private readonly transloco = inject(TranslocoService);
  private readonly roulette = viewChild.required(Roulette);

  /** The OBS overlay doesn't share storage with the browser: the language goes in the URL. */
  protected readonly obsUrl = computed(() => `${location.origin}/overlay?lang=${this.language.current()}`);
  protected readonly animating = signal(false);
  protected readonly busy = signal(false);
  protected readonly copied = signal(false);
  protected readonly actionError = signal<DomainError | null>(null);
  protected readonly testError = signal<DomainError | null>(null);
  protected readonly history = signal<Draw[]>([]);

  /** Step 04: optional viewer name; if empty, "Test" is used. */
  protected readonly testViewer = signal('');
  protected readonly defaultViewer = computed(() => {
    this.language.current(); // re-translates when the language changes
    return this.transloco.translate('panel.test.defaultViewer');
  });

  constructor() {
    // Hero names come from the API in the chosen language.
    effect(() => void this.draws.loadCatalog(this.language.current()));
  }

  protected formatTime(date: Date): string {
    return date.toLocaleTimeString(this.language.current());
  }

  protected formatDate(date: Date): string {
    return date.toLocaleDateString(this.language.current(), { day: 'numeric', month: 'long', year: 'numeric' });
  }

  protected logout(): Promise<void> {
    return this.run(() => this.session.logout());
  }

  /** Step 04: plays a draw in the preview and sends a fake redemption to every open overlay (OBS too). */
  protected testOverlay(): Promise<void> {
    const viewerName = this.testViewer().trim() || this.defaultViewer();
    void this.play(viewerName);
    return this.run(() => this.redemptions.simulate(viewerName), this.testError);
  }

  protected shutdown(): Promise<void> {
    if (!confirm(this.transloco.translate('panel.program.confirmShutdown'))) return Promise.resolve();
    return this.run(() => this.serverState.shutdown());
  }

  protected async play(viewerName = this.defaultViewer()): Promise<void> {
    if (this.animating()) return;
    this.animating.set(true);
    try {
      const draw = this.draws.newDraw(viewerName);
      if (await this.roulette().play(draw)) {
        this.history.update((h) => [draw, ...h].slice(0, 10));
      }
    } finally {
      this.animating.set(false);
    }
  }

  protected async copyUrl(): Promise<void> {
    await navigator.clipboard.writeText(this.obsUrl());
    this.copied.set(true);
    setTimeout(() => this.copied.set(false), 2000);
  }

  /** Sends a command to the program and shows its error, if any, in the box that asked for it. */
  private async run(action: () => Promise<void>, error: WritableSignal<DomainError | null> = this.actionError): Promise<void> {
    this.busy.set(true);
    error.set(null);
    try {
      await action();
    } catch (e) {
      if (!(e instanceof DomainError)) throw e;
      error.set(e);
    } finally {
      this.busy.set(false);
    }
  }
}
