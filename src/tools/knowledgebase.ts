import { glpiRequest } from "../client.js";
import { GlpiTool } from "./assistance.js";

export const kbTools: GlpiTool[] = [
    {
        tool: {
            name: "glpi_search_knowbase",
            description: "Busca artigos na base de conhecimento (Knowledgebase). Permite paginação (start, limit) e filtros (filter).",
            inputSchema: {
                type: "object",
                properties: {
                    start: { type: "number", description: "Início da paginação (offset)" },
                    limit: { type: "number", description: "Limite de itens por página" },
                    filter: { type: "string", description: "Filtro em RSQL (ex: name=*email*)" },
                    language: { type: "string", description: "Idioma do artigo" }
                }
            }
        },
        handler: async (args: any) => {
            const params: any = {};
            if (args.start !== undefined) params.start = args.start;
            if (args.limit !== undefined) params.limit = args.limit;
            if (args.filter !== undefined) params.filter = args.filter;
            if (args.language !== undefined) params.language = args.language;
            
            const items = await glpiRequest('GET', `/Knowledgebase/Article`, { params });
            return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
        }
    },
    {
        tool: {
            name: "glpi_get_knowbase_item",
            description: "Retorna o conteúdo completo de um artigo da base de conhecimento.",
            inputSchema: {
                type: "object",
                properties: {
                    id: { type: "number", description: "ID do artigo" },
                    language: { type: "string", description: "Idioma do artigo (opcional)" }
                },
                required: ["id"]
            }
        },
        handler: async (args: any) => {
            const params: any = {};
            if (args.language !== undefined) params.language = args.language;
            
            const item = await glpiRequest('GET', `/Knowledgebase/Article/${args.id}`, { params });
            return { content: [{ type: "text", text: JSON.stringify(item, null, 2) }] };
        }
    },
    {
        tool: {
            name: "glpi_search_faq",
            description: "Busca artigos marcados como FAQ na base de conhecimento (is_faq=true). Use para dúvidas rápidas de uso do GLPI antes de abrir ticket.",
            inputSchema: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Termo de busca no título/conteúdo (ex: 'como resetar senha')" },
                    start: { type: "number", description: "Início da paginação (offset)" },
                    limit: { type: "number", description: "Limite de itens por página" },
                    language: { type: "string", description: "Idioma do artigo" }
                }
            }
        },
        handler: async (args: any) => {
            const filters = ["is_faq==true"];
            if (args.query) filters.push(`(name=*${args.query}*,content=*${args.query}*)`);

            const params: any = { filter: filters.join(";") };
            if (args.start !== undefined) params.start = args.start;
            if (args.limit !== undefined) params.limit = args.limit;
            if (args.language !== undefined) params.language = args.language;

            const items = await glpiRequest('GET', `/Knowledgebase/Article`, { params });
            return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
        }
    }
];
