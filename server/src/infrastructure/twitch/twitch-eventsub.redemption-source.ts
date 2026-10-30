import { DomainError } from '@domain/common/domain-error';
import { RedemptionObserver, RedemptionSource } from '@domain/redemption/redemption-source';
import { Session } from '@domain/session/session';
import { TwitchRedemptionAssembler, TwitchRedemptionEvent } from './twitch-redemption.assembler';

const EVENTSUB_URL = 'wss://eventsub.wss.twitch.tv/ws';

/**
 * Channel point redemptions through Twitch EventSub (WebSocket).
 * It reconnects by itself if the connection drops or Twitch asks for it.
 */
export class TwitchEventSubRedemptionSource extends RedemptionSource {
  private currentSession: () => Session | null = () => null;
  private observer?: RedemptionObserver;
  private ws?: WebSocket;
  private keepaliveTimer?: ReturnType<typeof setTimeout>;
  private keepaliveSeconds = 10;
  private attempts = 0;
  private stopped = true;
  private seenIds: string[] = [];

  connect(currentSession: () => Session | null, observer: RedemptionObserver): void {
    this.disconnect();
    this.currentSession = currentSession;
    this.observer = observer;
    this.stopped = false;
    this.open(EVENTSUB_URL, true);
  }

  disconnect(): void {
    const wasActive = !this.stopped;
    this.stopped = true;
    clearTimeout(this.keepaliveTimer);
    this.ws?.close();
    this.ws = undefined;
    if (wasActive) this.observer?.onStateChange('disconnected');
  }

  /**
   * @param subscribe false when coming from a "session_reconnect":
   *   in that case Twitch keeps the subscriptions.
   */
  private open(url: string, subscribe: boolean): void {
    this.observer?.onStateChange('connecting');
    const ws = new WebSocket(url);
    if (!this.ws) this.ws = ws;

    ws.onmessage = (e) => void this.onMessage(ws, JSON.parse(String(e.data)), subscribe);
    ws.onclose = () => {
      if (ws === this.ws && !this.stopped) this.retry();
    };
  }

  private async onMessage(ws: WebSocket, msg: any, subscribe: boolean): Promise<void> {
    this.resetKeepalive();

    switch (msg.metadata.message_type) {
      case 'session_welcome': {
        const previous = this.ws;
        this.ws = ws;
        if (previous && previous !== ws) previous.close();

        this.keepaliveSeconds = msg.payload.session.keepalive_timeout_seconds ?? 10;
        this.resetKeepalive();

        if (subscribe && !(await this.subscribe(msg.payload.session.id))) return;
        this.attempts = 0;
        this.observer?.onStateChange('connected');
        break;
      }

      case 'session_reconnect':
        this.open(msg.payload.session.reconnect_url, false);
        break;

      case 'notification': {
        // Twitch may resend the same message: it is ignored if already seen.
        const id = msg.metadata.message_id;
        if (this.seenIds.includes(id)) return;
        this.seenIds = [...this.seenIds.slice(-99), id];

        const event = msg.payload.event as TwitchRedemptionEvent;
        this.observer?.onRedemption(TwitchRedemptionAssembler.toEntityFromResource(event));
        break;
      }

      case 'revocation':
        this.fail(new DomainError('eventsubRevoked', { status: msg.payload.subscription.status }));
        break;
    }
  }

  private async subscribe(sessionId: string): Promise<boolean> {
    const session = this.currentSession();
    if (!session) {
      this.fail(new DomainError('eventsubNoSession'));
      return false;
    }

    const res = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
      method: 'POST',
      headers: {
        'Client-Id': session.clientId,
        Authorization: `Bearer ${session.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'channel.channel_points_custom_reward_redemption.add',
        version: '1',
        condition: { broadcaster_user_id: session.userId },
        transport: { method: 'websocket', session_id: sessionId },
      }),
    });

    if (res.status === 202) return true;

    console.warn(`[eventsub] Subscription rejected (${res.status})`, await res.text());
    this.fail(
      res.status === 401 ? new DomainError('eventsubTokenInvalid')
      : res.status === 403 ? new DomainError('eventsubForbidden')
      : new DomainError('eventsubSubscribeFailed', { status: res.status }),
    );
    return false;
  }

  private resetKeepalive(): void {
    clearTimeout(this.keepaliveTimer);
    if (this.stopped) return;
    // Extra margin over what Twitch asks before considering the connection dead.
    this.keepaliveTimer = setTimeout(() => {
      console.warn('[eventsub] No keepalives arriving, reconnecting…');
      this.ws?.close();
    }, (this.keepaliveSeconds + 5) * 1000);
  }

  private retry(): void {
    clearTimeout(this.keepaliveTimer);
    this.ws = undefined;
    this.attempts++;
    const delay = Math.min(30, 2 ** this.attempts) * 1000;
    this.observer?.onStateChange('connecting');
    setTimeout(() => {
      if (!this.stopped) this.open(EVENTSUB_URL, true);
    }, delay);
  }

  private fail(error: DomainError): void {
    this.stopped = true;
    clearTimeout(this.keepaliveTimer);
    this.ws?.close();
    this.ws = undefined;
    this.observer?.onStateChange('error', error);
  }
}
