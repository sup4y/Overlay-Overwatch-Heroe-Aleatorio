import { Session } from './session';

/** Port: where the session is stored so the streamer doesn't have to log in every time. */
export abstract class SessionRepository {
  abstract get(): Promise<Session | null>;
  abstract save(session: Session): Promise<void>;
  abstract delete(): Promise<void>;
}
