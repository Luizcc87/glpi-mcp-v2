import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server.js';

export async function runHttpServer(port: number) {
    const app = express();
    
    // Parse JSON bodies
    app.use(express.json());

    app.post('/mcp', async (req, res) => {
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

    app.listen(port, () => {
        console.error(`GLPI MCP Server v2 running on HTTP POST http://localhost:${port}/mcp`);
    });

    process.on('SIGINT', () => {
        process.exit(0);
    });
}
