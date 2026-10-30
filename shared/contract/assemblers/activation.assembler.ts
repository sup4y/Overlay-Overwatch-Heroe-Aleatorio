import { ActivationCode } from '../../domain/session/activation-code';
import type { ActivationResource } from '../api';

/** Converts the Twitch activation code between the domain entity and its resource. */
export class ActivationAssembler {
  static toEntityFromResource(resource: ActivationResource): ActivationCode {
    return new ActivationCode(resource.code, resource.url, new Date(resource.expiresAt));
  }

  static toResourceFromEntity(activation: ActivationCode): ActivationResource {
    return { code: activation.code, url: activation.url, expiresAt: activation.expiresAt.toISOString() };
  }
}
