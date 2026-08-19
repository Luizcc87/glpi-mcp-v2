#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ErrorCode,
    ListToolsRequestSchema,
    McpError,
} from "@modelcontextprotocol/sdk/types.js";

import { ticketTools } from "./tools/tickets.js";
import { problemTools } from "./tools/problems.js";
import { changeTools } from "./tools/changes.js";
import { kbTools } from "./tools/knowledgebase.js";
import { statsTools } from "./tools/statistics.js";
import { assetTools } from "./tools/assets.js";
import { adminTools } from "./tools/administration.js";
import { GlpiTool } from "./tools/assistance.js";

const allTools: GlpiTool[] = [
    ...ticketTools,
    ...problemTools,
    ...changeTools,
    ...kbTools,
    ...statsTools,
    ...assetTools,
    ...adminTools
];

class GlpiMcpServer {
    private server: Server;

    constructor() {
        this.server = new Server(
            {
                name: "glpi-mcp-v2",
                version: "1.0.0",
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.setupToolHandlers();
        
        // Error handling
        this.server.onerror = (error) => console.error('[MCP Error]', error);
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }

    private setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: allTools.map(t => t.tool)
        }));

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const toolName = request.params.name;
            const toolArgs = request.params.arguments || {};
            
            const tool = allTools.find(t => t.tool.name === toolName);
            if (!tool) {
                throw new McpError(
                    ErrorCode.MethodNotFound,
                    `Unknown tool: ${toolName}`
                );
            }

            try {
                return await tool.handler(toolArgs);
            } catch (error: any) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Error executing tool ${toolName}: ${error.message || error}`,
                        },
                    ],
                    isError: true,
                };
            }
        });
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('GLPI MCP Server v2 running on stdio');
    }
}

const server = new GlpiMcpServer();
server.run().catch(console.error);
