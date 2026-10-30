import { Redemption } from '../../domain/redemption/redemption';
import type { RedemptionResource } from '../api';

/** Converts redemptions between the domain entity and its resource. */
export class RedemptionAssembler {
  static toEntityFromResource(resource: RedemptionResource): Redemption {
    const { id, viewerName, rewardId, rewardTitle, userInput } = resource;
    return new Redemption(id, viewerName, rewardId, rewardTitle, userInput);
  }

  static toResourceFromEntity(redemption: Redemption): RedemptionResource {
    const { id, viewerName, rewardId, rewardTitle, userInput } = redemption;
    return { id, viewerName, rewardId, rewardTitle, userInput };
  }
}
