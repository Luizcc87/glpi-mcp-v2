import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { glpiRequest } from '../src/client.js';

vi.mock('../src/config.js', () => ({
  loadConfig: vi.fn(() => ({
    baseUrl: 'http://localhost:8080'
  }))
}));

const mockGetAccessToken = vi.fn();
const mockClearAuthCache = vi.fn();

vi.mock('../src/auth.js', () => ({
  getAccessToken: () => mockGetAccessToken(),
  clearAuthCache: () => mockClearAuthCache()
}));

describe('glpiRequest', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    mockGetAccessToken.mockReset();
    mockGetAccessToken.mockResolvedValue('fake-token');
    mockClearAuthCache.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should make a GET request with proper auth header', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 1 })
    } as any);

    const data = await glpiRequest('GET', '/Assistance/Ticket/1');
    
    expect(data).toEqual({ id: 1 });
    expect(fetch).toHaveBeenCalledTimes(1);
    
    const callArgs = vi.mocked(fetch).mock.calls[0];
    expect(callArgs[0]).toBe('http://localhost:8080/api.php/Assistance/Ticket/1');
    expect(callArgs[1]?.method).toBe('GET');
    expect(callArgs[1]?.headers).toMatchObject({
      'Authorization': 'Bearer fake-token',
      'Accept': 'application/json'
    });
  });

  it('should handle query parameters correctly', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ([])
    } as any);

    await glpiRequest('GET', '/Assistance/Ticket', { params: { start: 0, limit: 10 } });
    
    const callArgs = vi.mocked(fetch).mock.calls[0];
    expect(callArgs[0]).toContain('?start=0&limit=10');
  });

  it('should format body and add Content-Type for POST requests', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 2 })
    } as any);

    await glpiRequest('POST', '/Assistance/Ticket', { body: { name: 'Test' } });
    
    const callArgs = vi.mocked(fetch).mock.calls[0];
    expect(callArgs[1]?.headers).toMatchObject({
      'Content-Type': 'application/json'
    });
    expect(callArgs[1]?.body).toBe('{"name":"Test"}');
  });

  it('should retry once on 401 Unauthorized', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Unauthorized'
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      } as any);

    const data = await glpiRequest('GET', '/Assistance/Ticket');

    expect(data).toEqual({ success: true });
    expect(mockClearAuthCache).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('should not retry more than once on 401 Unauthorized', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: async () => 'Unauthorized'
    } as any);

    await expect(glpiRequest('GET', '/Assistance/Ticket')).rejects.toThrow(/GLPI API Error/);
    
    expect(mockClearAuthCache).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2); // Initial call + 1 retry
  });

  it('should throw error for other non-2xx responses', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Boom'
    } as any);

    await expect(glpiRequest('GET', '/Assistance/Ticket')).rejects.toThrow(/GLPI API Error: GET \/Assistance\/Ticket returned 500 Internal Server Error - Boom/);
  });

  it('should handle 204 No Content', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 204
    } as any);

    const data = await glpiRequest('DELETE', '/Assistance/Ticket/1');
    expect(data).toEqual({});
  });
});
