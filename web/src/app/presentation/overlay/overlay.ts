import { Component, OnDestroy, OnInit, computed, inject, viewChild } from '@angular/core';
import { ErrorParams } from '@domain/common/domain-error';
import { TranslocoPipe } from '@jsverse/transloco';
import { Subscription } from 'rxjs';
import { DrawsService } from '../../application/draws.service';
import { RedemptionsService } from '../../application/redemptions.service';
import { ServerStateService } from '../../application/server-state.service';
import { SessionService } from '../../application/session.service';
import { SettingsService } from '../../application/settings.service';
import { LanguageService } from '../i18n/language.service';
import { Roulette } from '../roulette/roulette';

/**
 * Page for OBS (1920x1080 browser source, transparent background).
 * URL: http://localhost:4200/overlay?lang=es — add &demo to run a test on load
 * and &warnings to show connection problems on screen.
 */
@Component({
  selector: 'app-overlay',
  imports: [Roulette, TranslocoPipe],
  template: `
    <app-roulette />
    @if (warning(); as w) {
      <div class="warning">⚠ {{ w.key | transloco: w.params }}</div>
    }
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
    }
    .warning {
      position: absolute;
      left: 16px;
      top: 16px;
      padding: 8px 14px;
      border-radius: 6px;
      background: rgba(120, 0, 0, 0.85);
      color: #fff;
      font: 600 18px 'Rajdhani', sans-serif;
    }
  `,
})
export class Overlay implements OnInit, OnDestroy {
  private readonly serverState = inject(ServerStateService);
  private readonly session = inject(SessionService);
  private readonly settings = inject(SettingsService);
  private readonly redemptions = inject(RedemptionsService);
  private readonly draws = inject(DrawsService);
  private readonly language = inject(LanguageService);
  private readonly roulette = viewChild.required(Roulette);

  /** Warnings would cover the stream: they only show with ?warnings (errors already show in the panel). */
  private readonly showWarnings = new URLSearchParams(location.search).has('warnings');

  /** Translation key of the warning to show, or null if everything is fine. */
  protected readonly warning = computed<{ key: string; params?: ErrorParams } | null>(() => {
    if (!this.showWarnings) return null;
    if (this.draws.loaded() && this.draws.catalog().length === 0) return { key: 'overlay.warnings.heroesFailed' };
    // Until the first state arrives nothing is known: better not to show warnings live.
    if (!this.serverState.state()) return null;
    if (!this.serverState.connected()) return { key: 'overlay.warnings.disconnected' };
    if (!this.session.current()) return { key: 'overlay.warnings.noSession' };
    if (!this.settings.current()?.hasReward) return { key: 'overlay.warnings.noReward' };
    const error = this.redemptions.listenerState() === 'error' ? this.redemptions.error() : null;
    return error && { key: `errors.${error.code}`, params: error.params };
  });

  private readonly queue: string[] = [];
  private playing = false;
  private subscription?: Subscription;

  async ngOnInit(): Promise<void> {
    document.body.classList.add('overlay-mode');
    this.subscription = this.redemptions.redemptions.subscribe((redemption) => this.enqueue(redemption.viewerName));

    await this.draws.loadCatalog(this.language.current());
    if (new URLSearchParams(location.search).has('demo')) this.enqueue('Demo');
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    document.body.classList.remove('overlay-mode');
  }

  /** If several redemptions arrive in a row, they play one after another. */
  private async enqueue(viewerName: string): Promise<void> {
    this.queue.push(viewerName);
    if (this.playing) return;

    this.playing = true;
    while (this.queue.length) {
      try {
        await this.roulette().play(this.draws.newDraw(this.queue.shift()!));
      } catch (e) {
        console.error(e);
      }
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    this.playing = false;
  }
}
