import { getAccessToken, clearAuthCache } from './auth.js';
import { loadConfig } from './config.js';

export interface GlpiRequestOptions {
  params?: Record<string, any>;
  body?: any;
  isRetry?: boolean;
}

export async function glpiRequest<T>(method: string, path: string, opts?: GlpiRequestOptions): Promise<T> {
  const config = loadConfig();
  
  // Clean up path
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  let url = `${config.baseUrl}/api.php${cleanPath}`;
  
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

  const token = await getAccessToken();
  
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json'
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
    if (response.status === 401 && !opts?.isRetry) {
      clearAuthCache();
      return glpiRequest<T>(method, path, { ...opts, isRetry: true });
    }
    
    let errorBody = '';
    try {
      errorBody = await response.text();
    } catch (e) {
      // ignore
    }
    
    throw new Error(`GLPI API Error: ${method} ${path} returned ${response.status} ${response.statusText} - ${errorBody}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json();
  
  // Note: For pagination, API v2.3 uses start and limit query parameters.
  // The response body is the array of items. 
  // If we need the total count, we might check headers like Content-Range or X-Total-Count, 
  // but as per swagger-v2.3.json it's not documented. For now, returning the body is enough.
  
  return data as T;
}
