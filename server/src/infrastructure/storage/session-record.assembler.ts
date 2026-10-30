import { Session } from '@domain/session/session';
import { SessionRecord } from './stored-data';

/** Converts the session between the domain entity and the record saved in data/settings.json. */
export class SessionRecordAssembler {
  static toEntityFromRecord(record: SessionRecord): Session {
    return new Session(
      record.token,
      record.refreshToken,
      record.login,
      record.userId,
      record.clientId,
      new Date(record.tokenExpiresAt),
      new Date(record.savedAt),
    );
  }

  static toRecordFromEntity(session: Session): SessionRecord {
    return {
      token: session.token,
      refreshToken: session.refreshToken,
      tokenExpiresAt: session.tokenExpiresAt.toISOString(),
      login: session.login,
      userId: session.userId,
      clientId: session.clientId,
      savedAt: session.savedAt.toISOString(),
    };
  }
}
