import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getAccessToken, clearAuthCache } from '../src/auth.js';

vi.mock('../src/config.js', () => ({
  loadConfig: vi.fn(() => ({
    baseUrl: 'http://localhost:8080',
    clientId: 'test_client_id',
    clientSecret: 'test_client_secret',
    username: 'test_user',
    password: 'test_password'
  }))
}));

describe('Auth Layer', () => {
  beforeEach(() => {
    clearAuthCache();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch a new token on first call', async () => {
    const mockResponse = { access_token: 'token123', expires_in: 3600 };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as any);

    const token = await getAccessToken();
    expect(token).toBe('token123');
    expect(fetch).toHaveBeenCalledTimes(1);
    const callArgs = vi.mocked(fetch).mock.calls[0];
    expect(callArgs[0]).toBe('http://localhost:8080/api.php/token');
    expect(callArgs[1]?.method).toBe('POST');
  });

  it('should return cached token on subsequent calls before expiration', async () => {
    const mockResponse = { access_token: 'token123', expires_in: 3600 };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as any);

    const token1 = await getAccessToken();
    const token2 = await getAccessToken();

    expect(token1).toBe('token123');
    expect(token2).toBe('token123');
    expect(fetch).toHaveBeenCalledTimes(1); // Cached, so only 1 fetch
  });

  it('should fetch a new token if cached token is expired or close to expiration', async () => {
    // Retorna token com validade de apenas 30 segundos (menos que a margem de 60s)
    const mockResponse1 = { access_token: 'token123', expires_in: 30 };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse1,
    } as any);

    const mockResponse2 = { access_token: 'token456', expires_in: 3600 };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse2,
    } as any);

    const token1 = await getAccessToken();
    const token2 = await getAccessToken();

    expect(token1).toBe('token123');
    expect(token2).toBe('token456');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('should throw error if response is not ok', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => '{"error": "invalid_client"}',
    } as any);

    await expect(getAccessToken()).rejects.toThrow(/Failed to get access token: 401 Unauthorized - {"error": "invalid_client"}/);
  });
});
