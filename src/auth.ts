import { loadConfig } from './config.js';

let cachedToken: string | null = null;
let tokenExpiresAt: number | null = null;

export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  // Se o token existe e ainda faltam mais de 60 segundos para expirar
  if (cachedToken && tokenExpiresAt && tokenExpiresAt > now + 60000) {
    return cachedToken;
  }

  const config = loadConfig();

  const url = `${config.baseUrl}/api.php/token`;
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    username: config.username,
    password: config.password,
    scope: 'api'
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to get access token: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const data = await response.json() as { access_token: string, expires_in: number };
  
  if (!data.access_token || !data.expires_in) {
    throw new Error('Invalid token response from GLPI');
  }

  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in * 1000);

  return cachedToken;
}

// Para uso em testes
export function clearAuthCache() {
  cachedToken = null;
  tokenExpiresAt = null;
}
