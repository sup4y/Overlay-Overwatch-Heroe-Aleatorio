import type { Session } from '../../domain/session/session';
import type { SessionResource } from '../api';

/** The web only sees who is connected and until when: tokens never leave the server. */
export class SessionAssembler {
  static toResourceFromEntity(session: Session): SessionResource {
    return { login: session.login, expiresAt: session.expiresAt.toISOString() };
  }
}
