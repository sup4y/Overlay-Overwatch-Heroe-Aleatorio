import { Reward } from '../../domain/reward/reward';
import type { RewardResource } from '../api';

/** Converts channel point rewards between the domain entity and its resource. */
export class RewardAssembler {
  /** Only public rewards travel to the web, so they are all enabled. */
  static toEntityFromResource(resource: RewardResource): Reward {
    return new Reward(
      resource.id,
      resource.title,
      resource.cost,
      true,
      resource.isPaused,
      resource.color,
      resource.imageUrl,
    );
  }

  static toEntitiesFromResponse(response: RewardResource[]): Reward[] {
    return response.map((resource) => RewardAssembler.toEntityFromResource(resource));
  }

  static toResourceFromEntity(reward: Reward): RewardResource {
    const { id, title, cost, isPaused, color, imageUrl } = reward;
    return { id, title, cost, isPaused, color, imageUrl };
  }

  static toResourcesFromEntities(rewards: Reward[]): RewardResource[] {
    return rewards.map((reward) => RewardAssembler.toResourceFromEntity(reward));
  }
}
