import { glpiRequest } from "../client.js";
import { GlpiTool } from "./assistance.js";

export const adminTools: GlpiTool[] = [
    {
        tool: {
            name: "glpi_search_user",
            description: "Busca e lista usuários (Users). Permite paginação e filtros.",
            inputSchema: {
                type: "object",
                properties: {
                    start: { type: "number", description: "Início da paginação (offset)" },
                    limit: { type: "number", description: "Limite de itens por página" },
                    filter: { type: "string", description: "Filtro em RSQL (ex: name=*john*)" },
                }
            }
        },
        handler: async (args: any) => {
            const params: any = {};
            if (args.start !== undefined) params.start = args.start;
            if (args.limit !== undefined) params.limit = args.limit;
            if (args.filter !== undefined) params.filter = args.filter;
            
            const items = await glpiRequest('GET', `/Administration/User`, { params });
            return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
        }
    },
    {
        tool: {
            name: "glpi_get_user_context",
            description: "Retorna o contexto de UM usuário, incluindo itens usados e gerenciados.",
            inputSchema: {
                type: "object",
                properties: {
                    id: { type: "number", description: "ID do usuário" }
                },
                required: ["id"]
            }
        },
        handler: async (args: any) => {
            const id = args.id;
            const user = await glpiRequest<any>('GET', `/Administration/User/${id}`);
            
            let usedItems = [];
            let managedItems = [];
            
            try {
                usedItems = await glpiRequest<any[]>('GET', `/Administration/User/${id}/UsedItem`);
            } catch (e) {
                // Ignore
            }

            try {
                managedItems = await glpiRequest<any[]>('GET', `/Administration/User/${id}/ManagedItem`);
            } catch (e) {
                // Ignore
            }

            const result = {
                ...user,
                usedItems,
                managedItems
            };

            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }
    },
    {
        tool: {
            name: "glpi_list_groups",
            description: "Busca e lista grupos (Groups). Permite paginação e filtros.",
            inputSchema: {
                type: "object",
                properties: {
                    start: { type: "number", description: "Início da paginação (offset)" },
                    limit: { type: "number", description: "Limite de itens por página" },
                    filter: { type: "string", description: "Filtro em RSQL (ex: name=*support*)" },
                }
            }
        },
        handler: async (args: any) => {
            const params: any = {};
            if (args.start !== undefined) params.start = args.start;
            if (args.limit !== undefined) params.limit = args.limit;
            if (args.filter !== undefined) params.filter = args.filter;
            
            const items = await glpiRequest('GET', `/Administration/Group`, { params });
            return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
        }
    }
];
