import { DomainError } from '../../domain/common/domain-error';
import type { ErrorResource } from '../api';

/** Converts business errors between the domain and the resource that travels to the web. */
export class ErrorAssembler {
  static toEntityFromResource(resource: ErrorResource): DomainError {
    return new DomainError(resource.code, resource.params);
  }

  static toResourceFromEntity(error: DomainError): ErrorResource {
    return { code: error.code, params: error.params };
  }
}
