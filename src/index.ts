#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { runHttpServer } from "./httpServer.js";

async function runStdioServer() {
    const server = createServer();
    const transport = new StdioServerTransport();
    
    process.on('SIGINT', async () => {
        await server.close();
        process.exit(0);
    });

    await server.connect(transport);
    console.error('GLPI MCP Server v2 running on stdio');
}

async function main() {
    const transportType = process.env.MCP_TRANSPORT || 'stdio';

    if (transportType === 'http') {
        const port = parseInt(process.env.MCP_HTTP_PORT || '3000', 10);
        await runHttpServer(port);
    } else {
        await runStdioServer();
    }
}

main().catch(console.error);
