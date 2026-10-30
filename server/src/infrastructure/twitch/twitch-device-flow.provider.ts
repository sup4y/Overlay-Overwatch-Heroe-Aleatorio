import { DomainError } from '@domain/common/domain-error';
import { ActivationCode } from '@domain/session/activation-code';
import { Session } from '@domain/session/session';
import { ActivationRequest, ActivationResult, IdentityProvider, SessionRevokedError } from '../../application/ports';

const DEVICE_URL = 'https://id.twitch.tv/oauth2/device';
const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const VALIDATE_URL = 'https://id.twitch.tv/oauth2/validate';
const REVOKE_URL = 'https://id.twitch.tv/oauth2/revoke';
const SCOPES = 'channel:read:redemptions';

interface ErrorResponse {
  message?: string;
}

interface DeviceResponse extends ErrorResponse {
  device_code: string;
  user_code: string;
  /** Already includes the code: https://www.twitch.tv/activate?device-code=… */
  verification_uri: string;
  expires_in: number;
  interval?: number;
}

interface TokenResponse extends ErrorResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface ValidateResponse {
  login: string;
  user_id: string;
}

/**
 * Twitch login with the "Device Code Flow": it needs no redirect URL, so the
 * streamer doesn't have to create or configure any app on dev.twitch.tv.
 * With the program's app of type "Public", the refresh token needs no secret.
 */
export class TwitchDeviceFlowProvider extends IdentityProvider {
  async requestActivation(clientId: string): Promise<ActivationRequest> {
    const res = await postForm(DEVICE_URL, { client_id: clientId, scopes: SCOPES });
    const data = (await res.json()) as DeviceResponse;
    if (!res.ok) {
      throw new DomainError('clientIdRejected', { detail: data.message ?? res.status });
    }
    return {
      activation: new ActivationCode(data.user_code, data.verification_uri, secondsFromNow(data.expires_in)),
      deviceCode: data.device_code,
      intervalSeconds: data.interval ?? 5,
    };
  }

  async checkActivation(clientId: string, request: ActivationRequest): Promise<ActivationResult> {
    const res = await postForm(TOKEN_URL, {
      client_id: clientId,
      scopes: SCOPES,
      device_code: request.deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    });
    const data = (await res.json()) as TokenResponse;

    if (res.ok) return { type: 'authorized', session: await this.createSession(clientId, data) };
    if (data.message === 'authorization_pending' || data.message === 'slow_down') return { type: 'pending' };
    return {
      type: 'denied',
      error: new DomainError('activationRejected', { detail: data.message ?? res.status }),
    };
  }

  async refresh(session: Session): Promise<Session> {
    const res = await postForm(TOKEN_URL, {
      client_id: session.clientId,
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken,
    });
    if (res.status === 400 || res.status === 401) {
      throw new SessionRevokedError();
    }
    if (!res.ok) throw new Error(`Twitch answered ${res.status} when refreshing the token`);

    const data = (await res.json()) as TokenResponse;
    return session.withTokens(data.access_token, data.refresh_token, secondsFromNow(data.expires_in));
  }

  async isValid(session: Session): Promise<boolean> {
    const res = await fetch(VALIDATE_URL, { headers: { Authorization: `OAuth ${session.token}` } });
    if (res.status === 401) return false;
    if (!res.ok) throw new Error(`Twitch answered ${res.status} when validating the token`);
    return true;
  }

  async revoke(session: Session): Promise<void> {
    await postForm(REVOKE_URL, { client_id: session.clientId, token: session.token });
  }

  private async createSession(clientId: string, data: TokenResponse): Promise<Session> {
    const res = await fetch(VALIDATE_URL, { headers: { Authorization: `OAuth ${data.access_token}` } });
    if (!res.ok) throw new Error(`Twitch answered ${res.status} when validating the new token`);
    const user = (await res.json()) as ValidateResponse;
    return new Session(
      data.access_token,
      data.refresh_token,
      user.login,
      user.user_id,
      clientId,
      secondsFromNow(data.expires_in),
      new Date(),
    );
  }
}

function postForm(url: string, fields: Record<string, string>): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields),
  });
}

function secondsFromNow(seconds: number): Date {
  return new Date(Date.now() + seconds * 1000);
}
