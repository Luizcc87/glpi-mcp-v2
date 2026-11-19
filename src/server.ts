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
import { projectTools } from "./tools/projects.js";
import { GlpiTool } from "./tools/assistance.js";

export type McpMode = "read" | "write";

export function isWriteTool(name: string): boolean {
    return /^glpi_(create|update|add|link|delete)_/.test(name);
}

export function getMcpMode(): McpMode {
    const raw = process.env.GLPI_MCP_MODE;
    if (raw === undefined || raw === "") {
        return "write";
    }
    if (raw === "read" || raw === "write") {
        return raw;
    }
    throw new Error(`GLPI_MCP_MODE inválido: "${raw}". Valores aceitos: "read" ou "write".`);
}

const allTools: GlpiTool[] = [
    ...ticketTools,
    ...problemTools,
    ...changeTools,
    ...kbTools,
    ...statsTools,
    ...assetTools,
    ...adminTools,
    ...projectTools
];

export function createServer(): Server {
    const mode = getMcpMode();
    const visibleTools = mode === "read"
        ? allTools.filter(t => !isWriteTool(t.tool.name))
        : allTools;

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
        tools: visibleTools.map(t => t.tool)
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const toolName = request.params.name;
        const toolArgs = request.params.arguments || {};

        if (mode === "read" && isWriteTool(toolName)) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Tool ${toolName} bloqueada: servidor em modo somente leitura (GLPI_MCP_MODE=read)`,
                    },
                ],
                isError: true,
            };
        }

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
