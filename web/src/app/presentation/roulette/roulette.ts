import { ChangeDetectorRef, Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core';
import { RandomGenerator } from '@domain/common/random-generator';
import { Draw } from '@domain/draw/draw';
import { Hero } from '@domain/hero/hero';
import { TranslocoPipe } from '@jsverse/transloco';
import { APP_CONFIG } from '../../config';

/** Everything is drawn on a fixed 1920x1080 stage that is then scaled. */
const WIDTH = 1920;
const HEIGHT = 1080;
const CARD_W = 200;
const CARD_H = 292;
const CENTER = { x: 960, y: 560 };
const REVEAL_POINT = { x: 960, y: 470 };

const BOUNCE = 'cubic-bezier(.34,1.56,.64,1)';
const EASE_OUT = 'cubic-bezier(.16,1,.3,1)';
const FALL = 'cubic-bezier(.55,0,.85,.35)';
const SMOOTH = 'cubic-bezier(.65,0,.35,1)';

const ROLE_SYMBOL = { tank: '◆', damage: '✦', support: '✚' };

/** Position of a card on the stage: center, rotation, scale, opacity and layer. */
type Pose = { x: number; y: number; r: number; s: number; o: number; z: number };
type Phase = 'idle' | 'shuffle' | 'tornado' | 'table' | 'selection' | 'reveal';

@Component({
  selector: 'app-roulette',
  imports: [TranslocoPipe],
  templateUrl: './roulette.html',
  styleUrl: './roulette.css',
})
export class Roulette implements OnDestroy {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly random = inject(RandomGenerator);
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');

  protected readonly scale = signal(1);
  protected readonly phase = signal<Phase>('idle');
  protected readonly viewerName = signal('');
  protected readonly cards = signal<readonly Hero[]>([]);
  protected readonly chosen = signal<Hero | null>(null);
  protected readonly roleSymbol = ROLE_SYMBOL;

  private readonly poses = new Map<HTMLElement, Pose>();
  private readonly resizeObserver = new ResizeObserver(([e]) =>
    this.scale.set(Math.min(e.contentRect.width / WIDTH, e.contentRect.height / HEIGHT)),
  );
  private busy = false;

  constructor() {
    this.resizeObserver.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver.disconnect();
  }

  /**
   * Shuffles, deals and reveals the chosen card of the draw.
   * Returns false if an animation was already running.
   */
  async play(draw: Draw): Promise<boolean> {
    if (this.busy) return false;

    this.busy = true;
    try {
      await this.sequence(draw);
    } catch (e) {
      console.error('Animation error', e);
    } finally {
      this.reset();
      this.busy = false;
    }
    return true;
  }

  private async sequence(draw: Draw): Promise<void> {
    this.viewerName.set(draw.viewerName);
    this.cards.set(draw.cards);
    this.chosen.set(draw.chosenHero);
    this.changePhase('shuffle');
    await preloadImages(draw.cards.map((c) => c.portrait));

    const root = this.stage().nativeElement;
    const $ = (selector: string) => root.querySelector<HTMLElement>(selector)!;
    const cardEls = Array.from(root.querySelectorAll<HTMLElement>('.card'));
    const chosen = cardEls[draw.chosenIndex];
    const n = cardEls.length;

    // 1. Entrance: duel background, title and the deck falls from above
    anim(root, [{ opacity: 0 }, { opacity: 1 }], { duration: 400 });
    anim($('.duel-background'), [{ opacity: 0 }, { opacity: 1 }], { duration: 600 });
    anim(
      $('.title-banner'),
      [
        { opacity: 0, transform: 'translate(-50%, -60px) scale(.8)' },
        { opacity: 1, transform: 'translate(-50%, 0) scale(1)' },
      ],
      { duration: 700, easing: BOUNCE },
    );
    cardEls.forEach((el, i) => this.poses.set(el, { ...this.deckPose(i), y: -300, r: this.random.integer(60) - 30 }));
    await Promise.all(
      cardEls.map((el, i) => this.move(el, this.deckPose(i), { duration: 550, delay: i * 45, easing: BOUNCE })),
    );

    // 2. "Riffle" shuffle: the deck splits in two and interleaves, twice
    let deck = cardEls;
    for (let round = 0; round < 2; round++) {
      await Promise.all(
        deck.map((el, i) =>
          this.move(
            el,
            { x: CENTER.x + (i % 2 ? 200 : -200), y: CENTER.y - 20 - i, r: i % 2 ? 14 : -14 },
            { duration: 280, delay: i * 12, easing: EASE_OUT },
          ),
        ),
      );
      deck = this.random.shuffle(deck);
      await Promise.all(
        deck.map((el, i) => this.move(el, this.deckPose(i), { duration: 220, delay: i * 40, easing: FALL })),
      );
    }

    // 3. Tornado: the cards orbit with a glow and come together with a flash
    this.changePhase('tornado');
    const auras = cardEls.map((el) => el.querySelector<HTMLElement>('.card-aura')!);
    auras.forEach((a) => anim(a, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 }));
    await Promise.all(deck.map((el, i) => this.orbit(el, i, n)));
    auras.forEach((a) => anim(a, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 }));
    this.flash(CENTER.x, CENTER.y);

    // 4. The casino table appears and the deck is placed on top
    this.changePhase('table');
    anim(
      $('.table'),
      [
        { opacity: 0, transform: 'translate(-50%, -50%) scale(.8)' },
        { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
      ],
      { duration: 700, easing: BOUNCE },
    );
    await Promise.all(
      deck.map((el, i) => this.move(el, this.deckPose(i, 960, 400, 0.75), { duration: 600, easing: SMOOTH })),
    );

    // 5. Fan deal (the top card goes first)
    const onTable = [...deck].reverse();
    await Promise.all(
      onTable.map((el, j) => this.move(el, this.tablePose(el, j, n), { duration: 480, delay: j * 110, easing: EASE_OUT })),
    );

    // 6. Roulette-like selection: the highlight runs through the cards and slows down
    this.changePhase('selection');
    const target = onTable.indexOf(chosen);
    const steps = n * 2 + target + 1;
    let previous: HTMLElement | undefined;
    for (let k = 0; k < steps; k++) {
      const el = onTable[k % n];
      if (previous) this.highlight(previous, false);
      this.highlight(el, true);
      previous = el;
      await sleep(55 + 480 * (k / (steps - 1)) ** 3);
    }
    await anim(
      chosen.querySelector('.card-aura')!,
      [{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }],
      { duration: 300, iterations: 2 },
    );

    // 7. Reveal: the table, the background and the other cards leave so they don't cover the stream;
    //    only the chosen card stays, moves to the center, flips and shows the hero
    this.changePhase('reveal');
    anim(
      $('.table'),
      [
        { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
        { opacity: 0, transform: 'translate(-50%, -50%) scale(.92)' },
      ],
      { duration: 600, easing: SMOOTH },
    );
    anim($('.duel-background'), [{ opacity: 1 }, { opacity: 0 }], { duration: 600 });
    onTable.filter((el) => el !== chosen).forEach((el) => this.move(el, { o: 0, s: 0.6 }, { duration: 500 }));
    anim(chosen.querySelector('.card-lift')!, [{ transform: 'translateY(-40px) scale(1.08)' }, { transform: 'none' }], {
      duration: 300,
    });
    const r0 = this.poses.get(chosen)!.r;
    await this.move(
      chosen,
      { ...REVEAL_POINT, r: Math.round(r0 / 360) * 360, s: 1.6, z: 500 },
      { duration: 700, easing: BOUNCE },
    );

    setTimeout(() => {
      this.flash(REVEAL_POINT.x, REVEAL_POINT.y);
      this.particles(REVEAL_POINT.x, REVEAL_POINT.y);
    }, 300);
    await anim(
      chosen.querySelector('.card-flip')!,
      [{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(180deg)' }],
      { duration: 650, easing: 'cubic-bezier(.6,0,.3,1)' },
    );
    anim(
      $('.result-banner'),
      [
        { opacity: 0, transform: 'translateX(-50%) scale(.3)' },
        { opacity: 1, transform: 'translateX(-50%) scale(1.15)', offset: 0.7 },
        { opacity: 1, transform: 'translateX(-50%) scale(1)' },
      ],
      { duration: 600, easing: EASE_OUT },
    );

    await sleep(APP_CONFIG.heroDisplaySeconds * 1000);
    await anim(root, [{ opacity: 1 }, { opacity: 0 }], { duration: 700 });
  }

  private changePhase(phase: Phase): void {
    this.phase.set(phase);
    this.cdr.detectChanges();
  }

  /** Position in the deck: each card slightly shifted so the thickness shows. */
  private deckPose(i: number, x = CENTER.x, y = CENTER.y, s = 1): Pose {
    return { x: x + i * 0.6, y: y - i * 1.2, r: 0, s, o: 1, z: i + 1 };
  }

  /** Position in the fan on the table, with a full spin while dealing. */
  private tablePose(el: HTMLElement, j: number, n: number): Pose {
    const degrees = n > 1 ? -30 + (60 * j) / (n - 1) : 0;
    const rad = (degrees * Math.PI) / 180;
    const radius = 1300;
    const r0 = this.poses.get(el)!.r;
    return {
      x: 960 + radius * Math.sin(rad),
      y: 600 + radius * (1 - Math.cos(rad)),
      r: Math.round(r0 / 360) * 360 + 360 + degrees,
      s: 0.75,
      o: 1,
      z: 10 + j,
    };
  }

  private move(el: HTMLElement, target: Partial<Pose>, options: KeyframeAnimationOptions): Promise<unknown> {
    const from = this.poses.get(el)!;
    const to = { ...from, ...target };
    this.poses.set(el, to);
    // The layer (z) changes when the movement starts, not halfway.
    return anim(el, [style({ ...from, z: to.z }), style(to)], options);
  }

  private orbit(el: HTMLElement, i: number, n: number): Promise<unknown> {
    const base = this.poses.get(el)!;
    const start = (i / n) * Math.PI * 2;
    const steps = 40;
    const frames: Keyframe[] = [];
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const angle = start + t * Math.PI * 3;
      const spread = Math.sin(Math.PI * t);
      const depth = Math.sin(angle) * spread;
      frames.push({
        ...style({
          x: CENTER.x + Math.cos(angle) * 560 * spread,
          y: CENTER.y + Math.sin(angle) * 200 * spread,
          r: base.r + t * 360,
          s: 1 + 0.12 * depth,
          o: 1,
          z: k === steps ? base.z : Math.round(50 + depth * 40),
        }),
        offset: t,
      });
    }
    this.poses.set(el, { ...base, r: base.r + 360 });
    return anim(el, frames, { duration: 2000, easing: SMOOTH });
  }

  private highlight(el: HTMLElement, on: boolean): void {
    const down = 'translateY(0) scale(1)';
    const up = 'translateY(-40px) scale(1.08)';
    anim(el.querySelector('.card-lift')!, [{ transform: on ? down : up }, { transform: on ? up : down }], {
      duration: 110,
    });
    anim(el.querySelector('.card-aura')!, [{ opacity: on ? 0 : 1 }, { opacity: on ? 1 : 0 }], {
      duration: 110,
    });
  }

  private flash(x: number, y: number): void {
    const el = this.stage().nativeElement.querySelector<HTMLElement>('.flash')!;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    anim(
      el,
      [
        { opacity: 1, transform: 'scale(.2)' },
        { opacity: 0, transform: 'scale(1.6)' },
      ],
      { duration: 650, easing: EASE_OUT },
    );
  }

  private particles(x: number, y: number): void {
    const container = this.stage().nativeElement.querySelector<HTMLElement>('.particles')!;
    for (let i = 0; i < 48; i++) {
      const p = document.createElement('i');
      const angle = Math.random() * Math.PI * 2;
      const distance = 250 + Math.random() * 550;
      const size = 4 + Math.random() * 10;
      p.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;background:${i % 3 ? '#ffd85a' : '#7fe3ff'}`;
      container.appendChild(p);
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;
      p.animate(
        [
          { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.2)`, opacity: 0 },
        ],
        { duration: 900 + Math.random() * 700, easing: 'cubic-bezier(.1,.8,.3,1)' },
      ).finished.then(() => p.remove(), () => p.remove());
    }
  }

  private reset(): void {
    const root = this.stage().nativeElement;
    root.getAnimations({ subtree: true }).forEach((a) => {
      if (!(a instanceof CSSAnimation)) a.cancel();
    });
    root.querySelector('.particles')!.replaceChildren();
    this.poses.clear();
    this.cards.set([]);
    this.chosen.set(null);
    this.phase.set('idle');
  }
}

function style(p: Pose): Keyframe {
  return {
    transform: `translate(${p.x - CARD_W / 2}px, ${p.y - CARD_H / 2}px) rotate(${p.r}deg) scale(${p.s})`,
    opacity: p.o,
    zIndex: String(p.z),
  };
}

/**
 * Runs an animation and waits for it to finish. If the browser stops painting
 * (OBS pauses the page when its scene isn't visible), animations freeze:
 * it waits at most as long as it should last, so the sequence always ends.
 */
function anim(el: Element, frames: Keyframe[], options: KeyframeAnimationOptions): Promise<unknown> {
  const animation = el.animate(frames, { fill: 'forwards', ...options });
  const duration = Number(options.duration ?? 0) * Number(options.iterations ?? 1) + Number(options.delay ?? 0);
  return Promise.race([animation.finished.then(() => {}, () => {}), sleep(duration + 250)]);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Waits for the images to load (3 s at most) so the card doesn't show up empty. */
function preloadImages(urls: string[]): Promise<unknown> {
  const loads = urls.map(
    (url) =>
      new Promise((done) => {
        const img = new Image();
        img.onload = img.onerror = done;
        img.src = url;
      }),
  );
  return Promise.race([Promise.all(loads), sleep(3000)]);
}
