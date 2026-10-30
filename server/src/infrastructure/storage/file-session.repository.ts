import { Session } from '@domain/session/session';
import { SessionRepository } from '@domain/session/session.repository';
import { SessionRecordAssembler } from './session-record.assembler';
import { DataFile } from './stored-data';

export class FileSessionRepository extends SessionRepository {
  constructor(private readonly file: DataFile) {
    super();
  }

  async get(): Promise<Session | null> {
    const { session } = await this.file.read();
    if (!session?.token || !session.refreshToken || !session.savedAt) return null;
    return SessionRecordAssembler.toEntityFromRecord(session);
  }

  async save(session: Session): Promise<void> {
    await this.file.update((data) => {
      data.session = SessionRecordAssembler.toRecordFromEntity(session);
    });
  }

  async delete(): Promise<void> {
    await this.file.update((data) => {
      data.session = null;
    });
  }
}
