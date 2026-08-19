import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { makeItemtypeHandlers, Itemtype } from "../resources/genericResource.js";

export interface GlpiTool {
    tool: Tool;
    handler: (args: any) => Promise<{ content: Array<{ type: string, text: string }> }>;
}

export function createAssistanceTools(itemtype: Itemtype): GlpiTool[] {
    const handlers = makeItemtypeHandlers(itemtype);
    const prefix = itemtype.toLowerCase();

    return [
        {
            tool: {
                name: `glpi_search_${prefix}s`,
                description: `Busca e lista ${prefix}s. Permite paginação (start, limit) e filtros (filter em RSQL).`,
                inputSchema: {
                    type: "object",
                    properties: {
                        start: { type: "number", description: "Início da paginação (offset)" },
                        limit: { type: "number", description: "Limite de itens por página" },
                        filter: { type: "string", description: "Filtro em RSQL (ex: status=1)" },
                    }
                }
            },
            handler: async (args: any) => {
                const params: any = {};
                if (args.start !== undefined) params.start = args.start;
                if (args.limit !== undefined) params.limit = args.limit;
                if (args.filter !== undefined) params.filter = args.filter;
                const items = await handlers.list(params);
                return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
            }
        },
        {
            tool: {
                name: `glpi_get_${prefix}`,
                description: `Retorna o contexto completo de UM ${prefix}, incluindo timeline, sem precisar de múltiplas chamadas.`,
                inputSchema: {
                    type: "object",
                    properties: {
                        id: { type: "number", description: `ID do ${prefix}` }
                    },
                    required: ["id"]
                }
            },
            handler: async (args: any) => {
                const id = args.id;
                const item = await handlers.get(id);
                let timeline = [];
                try {
                    timeline = await handlers.getTimeline(id);
                } catch (e) {
                    // Ignore if timeline fails or doesn't exist
                }
                const result = {
                    ...item,
                    timeline
                };
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            }
        },
        {
            tool: {
                name: `glpi_get_${prefix}_timeline`,
                description: `Retorna a timeline de UM ${prefix} (followups, tasks, etc).`,
                inputSchema: {
                    type: "object",
                    properties: {
                        id: { type: "number", description: `ID do ${prefix}` }
                    },
                    required: ["id"]
                }
            },
            handler: async (args: any) => {
                const timeline = await handlers.getTimeline(args.id);
                return { content: [{ type: "text", text: JSON.stringify(timeline, null, 2) }] };
            }
        },
        {
            tool: {
                name: `glpi_create_${prefix}`,
                description: `Cria um novo ${prefix}.`,
                inputSchema: {
                    type: "object",
                    properties: {
                        input: {
                            type: "object",
                            description: "Campos do objeto a ser criado (ex: name, content)",
                            additionalProperties: true
                        }
                    },
                    required: ["input"]
                }
            },
            handler: async (args: any) => {
                const created = await handlers.create(args.input);
                return { content: [{ type: "text", text: JSON.stringify(created, null, 2) }] };
            }
        },
        {
            tool: {
                name: `glpi_update_${prefix}`,
                description: `Atualiza campos de um ${prefix} existente.`,
                inputSchema: {
                    type: "object",
                    properties: {
                        id: { type: "number", description: `ID do ${prefix}` },
                        input: {
                            type: "object",
                            description: "Campos a serem atualizados",
                            additionalProperties: true
                        }
                    },
                    required: ["id", "input"]
                }
            },
            handler: async (args: any) => {
                const updated = await handlers.update(args.id, args.input);
                return { content: [{ type: "text", text: JSON.stringify(updated, null, 2) }] };
            }
        },
        {
            tool: {
                name: `glpi_add_${prefix}_followup`,
                description: `Adiciona um followup (acompanhamento) à timeline de um ${prefix}.`,
                inputSchema: {
                    type: "object",
                    properties: {
                        id: { type: "number", description: `ID do ${prefix}` },
                        content: { type: "string", description: "Conteúdo do followup" },
                        is_private: { type: "boolean", description: "Se o followup é privado" }
                    },
                    required: ["id", "content"]
                }
            },
            handler: async (args: any) => {
                const body = {
                    itemtype: itemtype,
                    items_id: args.id,
                    content: args.content,
                    is_private: args.is_private ? 1 : 0
                };
                const { glpiRequest } = await import('../client.js');
                const result = await glpiRequest('POST', `/Assistance/${itemtype}/${args.id}/Timeline/Followup`, { body });
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            }
        },
        {
            tool: {
                name: `glpi_get_${prefix}_stats`,
                description: `Retorna as estatísticas de um ${prefix}.`,
                inputSchema: {
                    type: "object",
                    properties: {
                        id: { type: "number", description: `ID do ${prefix}` }
                    },
                    required: ["id"]
                }
            },
            handler: async (args: any) => {
                const { glpiRequest } = await import('../client.js');
                const stats = await glpiRequest('GET', `/Assistance/Stat/${itemtype}/${args.id}`);
                return { content: [{ type: "text", text: JSON.stringify(stats, null, 2) }] };
            }
        }
    ];
}
