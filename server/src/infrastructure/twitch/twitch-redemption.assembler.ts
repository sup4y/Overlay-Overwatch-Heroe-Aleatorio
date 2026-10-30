import { Redemption } from '@domain/redemption/redemption';

/** Redemption event as Twitch EventSub sends it. */
export interface TwitchRedemptionEvent {
  id: string;
  user_name: string;
  user_login: string;
  user_input?: string;
  reward?: { id: string; title: string; cost: number };
}

/** Converts a Twitch EventSub redemption event into a domain entity. */
export class TwitchRedemptionAssembler {
  static toEntityFromResource(event: TwitchRedemptionEvent): Redemption {
    return new Redemption(
      event.id,
      event.user_name || event.user_login,
      event.reward?.id ?? '',
      event.reward?.title ?? '',
      event.user_input ?? '',
    );
  }
}
