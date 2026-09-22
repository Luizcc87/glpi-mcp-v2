import { glpiRequestV1 } from "../clientV1.js";
import { GlpiTool } from "./assistance.js";

function buildPagination(start?: number, limit?: number) {
    if (start !== undefined || limit !== undefined) {
        const s = start !== undefined ? start : 0;
        const l = limit !== undefined ? limit : 20;
        const end = s + l - 1;
        const rangeVal = `${s}-${end}`;
        return {
            headers: { Range: rangeVal },
            params: { range: rangeVal }
        };
    }
    return { headers: {}, params: {} };
}

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
                    filter: { type: "string", description: "Filtro em RSQL ou texto de busca (ex: name=*email*)" },
                    language: { type: "string", description: "Idioma do artigo" }
                }
            }
        },
        handler: async (args: any) => {
            const params: any = {};
            const headers: any = {};

            if (args.start !== undefined || args.limit !== undefined) {
                const pagination = buildPagination(args.start, args.limit);
                Object.assign(headers, pagination.headers);
                Object.assign(params, pagination.params);
            }

            if (args.filter !== undefined) {
                const match = String(args.filter).match(/(?:name=\*?|query=)?(.*?)\*?$/);
                const term = match && match[1] ? match[1] : args.filter;
                params['searchText[name]'] = term;
            }

            if (args.language !== undefined) {
                params.language = args.language;
            }
            
            const items = await glpiRequestV1('GET', `/KnowbaseItem`, { params, headers });
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
            
            const item = await glpiRequestV1('GET', `/KnowbaseItem/${args.id}`, { params });
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
            const params: any = {
                'searchText[is_faq]': '1'
            };
            const headers: any = {};

            if (args.query) {
                params['searchText[name]'] = args.query;
            }

            if (args.start !== undefined || args.limit !== undefined) {
                const pagination = buildPagination(args.start, args.limit);
                Object.assign(headers, pagination.headers);
                Object.assign(params, pagination.params);
            }

            if (args.language !== undefined) {
                params.language = args.language;
            }

            const items = await glpiRequestV1('GET', `/KnowbaseItem`, { params, headers });
            return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
        }
    }
];
