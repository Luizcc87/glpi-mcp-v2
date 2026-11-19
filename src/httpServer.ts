import crypto from 'node:crypto';
import express, { type Request, type Response, type NextFunction, type RequestHandler } from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer, getMcpMode } from './server.js';

function timingSafeCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) {
        return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
}

export function createBearerAuth(token: string): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
        const authHeader = req.headers?.authorization;
        if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'unauthorized' });
            return;
        }

        const providedToken = authHeader.slice('Bearer '.length);
        if (!token || !timingSafeCompare(providedToken, token)) {
            res.status(401).json({ error: 'unauthorized' });
            return;
        }

        next();
    };
}

export function createHttpApp(): express.Express {
    const mode = getMcpMode();
    const token = process.env.MCP_HTTP_TOKEN;
    const allowNoAuth = process.env.MCP_HTTP_ALLOW_NO_AUTH === '1';

    if (!token) {
        if (!allowNoAuth) {
            throw new Error(
                'MCP_HTTP_TOKEN é obrigatório para iniciar o modo HTTP. Defina MCP_HTTP_TOKEN ou use MCP_HTTP_ALLOW_NO_AUTH=1 para desabilitar a autenticação explicitamente.'
            );
        }
        console.error(
            '[WARNING] MCP_HTTP_TOKEN não definido e MCP_HTTP_ALLOW_NO_AUTH=1: iniciando servidor HTTP SEM autenticação.'
        );
    }

    const app = express();

    // Parse JSON bodies
    app.use(express.json());

    app.get('/health', (_req, res) => {
        res.json({ ok: true, mode });
    });

    const mcpHandlers: RequestHandler[] = [];
    if (token) {
        mcpHandlers.push(createBearerAuth(token));
    }

    mcpHandlers.push(async (req, res) => {
        try {
            // Stateless mode: a fresh Server + Transport per request. The transport
            // cannot be reused across requests (SDK throws "Stateless transport
            // cannot be reused across requests" if you try).
            const mcpServer = createServer();
            const transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: undefined,
            });
            res.on('close', () => {
                transport.close();
                mcpServer.close();
            });
            await mcpServer.connect(transport);
            await transport.handleRequest(req, res, req.body);
        } catch (error) {
            console.error('[HTTP Transport Error]', error);
            if (!res.headersSent) {
                res.status(500).send('Internal Server Error');
            }
        }
    });

    app.post('/mcp', ...mcpHandlers);

    return app;
}

export async function runHttpServer(port: number) {
    const app = createHttpApp();

    app.listen(port, () => {
        console.error(`GLPI MCP Server v2 running on HTTP POST http://localhost:${port}/mcp`);
    });

    process.on('SIGINT', () => {
        process.exit(0);
    });
}
