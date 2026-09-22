import { loadConfig } from './config.js';

export interface GlpiRequestV1Options {
  params?: Record<string, any>;
  body?: any;
  headers?: Record<string, string>;
  isRetry?: boolean;
}

let cachedSessionToken: string | null = null;

export async function getSessionTokenV1(): Promise<string> {
  if (cachedSessionToken) {
    return cachedSessionToken;
  }

  const config = loadConfig();
  if (!config.apiV1AppToken || !config.apiV1UserToken) {
    throw new Error('GLPI_API_V1_APP_TOKEN e GLPI_API_V1_USER_TOKEN são necessários para usar as tools de Base de Conhecimento (API v1)');
  }

  const url = `${config.baseUrl}/apirest.php/initSession`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'App-Token': config.apiV1AppToken,
      'Authorization': `user_token ${config.apiV1UserToken}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to init GLPI v1 session: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const data = await response.json() as { session_token: string };
  if (!data.session_token) {
    throw new Error('Invalid session response from GLPI API v1');
  }

  cachedSessionToken = data.session_token;
  return cachedSessionToken;
}

export function clearV1AuthCache(): void {
  cachedSessionToken = null;
}

export async function glpiRequestV1<T>(method: string, path: string, opts?: GlpiRequestV1Options): Promise<T> {
  const config = loadConfig();
  if (!config.apiV1AppToken || !config.apiV1UserToken) {
    throw new Error('GLPI_API_V1_APP_TOKEN e GLPI_API_V1_USER_TOKEN são necessários para usar as tools de Base de Conhecimento (API v1)');
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  let url = `${config.baseUrl}/apirest.php${cleanPath}`;

  if (opts?.params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(opts.params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  const sessionToken = await getSessionTokenV1();

  const headers: Record<string, string> = {
    'App-Token': config.apiV1AppToken,
    'Session-Token': sessionToken,
    'Accept': 'application/json',
    ...(opts?.headers || {})
  };

  if (opts?.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    method,
    headers,
    body: opts?.body ? JSON.stringify(opts.body) : undefined
  });

  if (!response.ok) {
    if ((response.status === 401 || response.status === 403) && !opts?.isRetry) {
      clearV1AuthCache();
      return glpiRequestV1<T>(method, path, { ...opts, isRetry: true });
    }

    let errorBody = '';
    try {
      errorBody = await response.text();
    } catch {
      // ignore
    }

    throw new Error(`GLPI API v1 Error: ${method} ${path} returned ${response.status} ${response.statusText} - ${errorBody}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json();
  return data as T;
}
