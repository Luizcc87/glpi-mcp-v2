import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { glpiRequestV1, clearV1AuthCache } from '../src/clientV1.js';
import * as configModule from '../src/config.js';

vi.mock('../src/config.js', () => ({
  loadConfig: vi.fn()
}));

describe('clientV1', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    clearV1AuthCache();
    vi.mocked(configModule.loadConfig).mockReturnValue({
      baseUrl: 'http://localhost:8080',
      clientId: 'cid',
      clientSecret: 'csec',
      username: 'usr',
      password: 'pwd',
      apiV1AppToken: 'app-token-123',
      apiV1UserToken: 'user-token-456'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw clear error if apiV1AppToken or apiV1UserToken is missing', async () => {
    vi.mocked(configModule.loadConfig).mockReturnValue({
      baseUrl: 'http://localhost:8080',
      clientId: 'cid',
      clientSecret: 'csec',
      username: 'usr',
      password: 'pwd'
    });

    await expect(glpiRequestV1('GET', '/KnowbaseItem')).rejects.toThrow(
      'GLPI_API_V1_APP_TOKEN e GLPI_API_V1_USER_TOKEN são necessários para usar as tools de Base de Conhecimento (API v1)'
    );
  });

  it('should init session and make GET request to /apirest.php/KnowbaseItem', async () => {
    // 1st fetch: initSession
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ session_token: 'sess-abc-789' })
    } as any);

    // 2nd fetch: actual request
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [{ id: 1, name: 'Article 1' }]
    } as any);

    const result = await glpiRequestV1<any[]>('GET', '/KnowbaseItem');

    expect(result).toEqual([{ id: 1, name: 'Article 1' }]);
    expect(fetch).toHaveBeenCalledTimes(2);

    // Verify initSession call
    const initCall = vi.mocked(fetch).mock.calls[0];
    expect(initCall[0]).toBe('http://localhost:8080/apirest.php/initSession');
    expect(initCall[1]?.headers).toMatchObject({
      'App-Token': 'app-token-123',
      'Authorization': 'user_token user-token-456',
      'Accept': 'application/json'
    });

    // Verify data call
    const dataCall = vi.mocked(fetch).mock.calls[1];
    expect(dataCall[0]).toBe('http://localhost:8080/apirest.php/KnowbaseItem');
    expect(dataCall[1]?.headers).toMatchObject({
      'App-Token': 'app-token-123',
      'Session-Token': 'sess-abc-789',
      'Accept': 'application/json'
    });
  });

  it('should reuse cached session_token across multiple requests', async () => {
    // 1st fetch: initSession
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ session_token: 'sess-abc-789' })
    } as any);

    // 2nd fetch: first request
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [{ id: 1 }]
    } as any);

    // 3rd fetch: second request
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 1 })
    } as any);

    await glpiRequestV1('GET', '/KnowbaseItem');
    await glpiRequestV1('GET', '/KnowbaseItem/1');

    // Only 1 initSession + 2 data calls = 3 total fetch calls
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('should retry once on 401/403 and re-init session', async () => {
    // 1st fetch: initSession
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ session_token: 'old-session' })
    } as any);

    // 2nd fetch: request fails with 401
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'Session expired'
    } as any);

    // 3rd fetch: re-initSession
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ session_token: 'new-session' })
    } as any);

    // 4th fetch: retry succeeds
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [{ id: 1 }]
    } as any);

    const result = await glpiRequestV1('GET', '/KnowbaseItem');
    expect(result).toEqual([{ id: 1 }]);
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('should pass Range header and params correctly', async () => {
    // initSession
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ session_token: 'sess' })
    } as any);

    // request
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => []
    } as any);

    await glpiRequestV1('GET', '/KnowbaseItem', {
      params: { 'searchText[name]': 'test' },
      headers: { Range: '0-9' }
    });

    const dataCall = vi.mocked(fetch).mock.calls[1];
    expect(dataCall[0]).toContain('searchText%5Bname%5D=test');
    expect(dataCall[1]?.headers).toMatchObject({
      Range: '0-9'
    });
  });
});
