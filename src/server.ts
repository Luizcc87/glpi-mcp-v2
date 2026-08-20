import { Server } from "@modelcontextprotocol/sdk/server/index.js";
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

export function createServer(): Server {
    const server = new Server(
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

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: allTools.map(t => t.tool)
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
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

    server.onerror = (error) => console.error('[MCP Error]', error);

    return server;
}
