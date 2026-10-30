import { Reward } from '@domain/reward/reward';

type TwitchImageSet = { url_1x: string; url_2x: string; url_4x: string } | null;

/** Custom reward as the Twitch Helix API returns it. */
export interface TwitchRewardResource {
  id: string;
  title: string;
  cost: number;
  is_enabled: boolean;
  is_paused: boolean;
  background_color: string;
  image: TwitchImageSet;
  default_image: TwitchImageSet;
}

export interface TwitchRewardsResponse {
  data: TwitchRewardResource[];
}

/** Converts the Twitch Helix custom rewards into domain entities. */
export class TwitchRewardAssembler {
  static toEntityFromResource(resource: TwitchRewardResource): Reward {
    return new Reward(
      resource.id,
      resource.title,
      resource.cost,
      resource.is_enabled,
      resource.is_paused,
      resource.background_color,
      resource.image?.url_4x ?? resource.default_image?.url_4x ?? null,
    );
  }

  static toEntitiesFromResponse(response: TwitchRewardsResponse): Reward[] {
    return response.data.map((resource) => TwitchRewardAssembler.toEntityFromResource(resource));
  }
}
