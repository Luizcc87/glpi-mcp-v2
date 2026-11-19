import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AddressInfo } from 'node:net';
import { createBearerAuth, createHttpApp } from '../src/httpServer.js';
import * as serverModule from '../src/server.js';

function createMockRes() {
  const res: any = {
    statusCode: 200,
    body: undefined,
    status: vi.fn(function (this: any, code: number) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(function (this: any, payload: any) {
      this.body = payload;
      return this;
    })
  };
  return res;
}

describe('HTTP Server Authentication & Routes', () => {
  const origToken = process.env.MCP_HTTP_TOKEN;
  const origAllowNoAuth = process.env.MCP_HTTP_ALLOW_NO_AUTH;
  const origMode = process.env.GLPI_MCP_MODE;

  beforeEach(() => {
    delete process.env.MCP_HTTP_TOKEN;
    delete process.env.MCP_HTTP_ALLOW_NO_AUTH;
    delete process.env.GLPI_MCP_MODE;
  });

  afterEach(() => {
    if (origToken === undefined) delete process.env.MCP_HTTP_TOKEN;
    else process.env.MCP_HTTP_TOKEN = origToken;

    if (origAllowNoAuth === undefined) delete process.env.MCP_HTTP_ALLOW_NO_AUTH;
    else process.env.MCP_HTTP_ALLOW_NO_AUTH = origAllowNoAuth;

    if (origMode === undefined) delete process.env.GLPI_MCP_MODE;
    else process.env.GLPI_MCP_MODE = origMode;

    vi.restoreAllMocks();
  });

  describe('createBearerAuth middleware', () => {
    const middleware = createBearerAuth('super-secret-token');

    it('should call next() when Bearer token matches', () => {
      const req: any = { headers: { authorization: 'Bearer super-secret-token' } };
      const res = createMockRes();
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 unauthorized when token is wrong (same length)', () => {
      const req: any = { headers: { authorization: 'Bearer super-secret-tokeX' } };
      const res = createMockRes();
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'unauthorized' });
    });

    it('should return 401 unauthorized when Authorization header is missing', () => {
      const req: any = { headers: {} };
      const res = createMockRes();
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'unauthorized' });
    });

    it('should return 401 unauthorized when Authorization scheme is not Bearer', () => {
      const req: any = { headers: { authorization: 'Basic dXNlcjpwYXNz' } };
      const res = createMockRes();
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'unauthorized' });
    });

    it('should return 401 unauthorized without throwing when token has different length', () => {
      for (const candidate of ['short', 'much-longer-secret-token-value-123456', 'áéíóú-utf8-token', '']) {
        const req: any = { headers: { authorization: `Bearer ${candidate}` } };
        const res = createMockRes();
        const next = vi.fn();

        expect(() => middleware(req, res, next)).not.toThrow();
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'unauthorized' });
      }
    });
  });

  describe('createHttpApp startup & endpoints', () => {
    it('should refuse to start when MCP_HTTP_TOKEN is missing and MCP_HTTP_ALLOW_NO_AUTH is not 1', () => {
      expect(() => createHttpApp()).toThrow(/MCP_HTTP_TOKEN/);
    });

    it('should allow starting without token when MCP_HTTP_ALLOW_NO_AUTH=1 and log warning to stderr', () => {
      process.env.MCP_HTTP_ALLOW_NO_AUTH = '1';
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const app = createHttpApp();
      expect(app).toBeDefined();
      expect(errSpy).toHaveBeenCalledWith(expect.stringMatching(/MCP_HTTP_ALLOW_NO_AUTH=1/));
    });

    it('should serve GET /health without auth and protect POST /mcp before creating MCP server', async () => {
      process.env.MCP_HTTP_TOKEN = 'test-token-123';
      process.env.GLPI_MCP_MODE = 'read';

      const createServerSpy = vi.spyOn(serverModule, 'createServer');
      const app = createHttpApp();

      const httpServer = await new Promise<ReturnType<typeof app.listen>>((resolve) => {
        const srv = app.listen(0, '127.0.0.1', () => resolve(srv));
      });

      try {
        const port = (httpServer.address() as AddressInfo).port;
        const baseUrl = `http://127.0.0.1:${port}`;

        // GET /health without auth
        const healthRes = await fetch(`${baseUrl}/health`);
        expect(healthRes.status).toBe(200);
        expect(await healthRes.json()).toEqual({ ok: true, mode: 'read' });

        // POST /mcp without auth -> 401 before createServer
        const unauthRes = await fetch(`${baseUrl}/mcp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
        });
        expect(unauthRes.status).toBe(401);
        expect(await unauthRes.json()).toEqual({ error: 'unauthorized' });
        expect(createServerSpy).not.toHaveBeenCalled();

        // POST /mcp with wrong token -> 401 before createServer
        const wrongRes = await fetch(`${baseUrl}/mcp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer wrong'
          },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
        });
        expect(wrongRes.status).toBe(401);
        expect(await wrongRes.json()).toEqual({ error: 'unauthorized' });
        expect(createServerSpy).not.toHaveBeenCalled();
      } finally {
        await new Promise<void>((resolve, reject) => {
          httpServer.close((err) => (err ? reject(err) : resolve()));
        });
      }
    });
  });
});
