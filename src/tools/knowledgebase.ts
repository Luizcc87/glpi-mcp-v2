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

function pickDefined(source: Record<string, any> | undefined, keys: readonly string[]): Record<string, any> {
    const result: Record<string, any> = {};
    if (!source) return result;
    for (const key of keys) {
        if (source[key] !== undefined) {
            result[key] = source[key];
        }
    }
    return result;
}

const KNOWBASE_FIELDS = [
    "name",
    "answer",
    "is_faq",
    "knowbaseitemcategories_id",
    "entities_id",
    "is_recursive",
    "users_id"
] as const;

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
    },
    {
        tool: {
            name: "glpi_create_knowbase_item",
            description: "Cria um novo artigo na base de conhecimento (API v1).",
            inputSchema: {
                type: "object",
                properties: {
                    name: { type: "string", description: "Título do artigo" },
                    answer: { type: "string", description: "Conteúdo do artigo em HTML ou texto" },
                    is_faq: { type: "number", description: "1 se for FAQ pública (visível a todos), 0 se for restrito" },
                    knowbaseitemcategories_id: { type: "number", description: "ID da categoria do artigo" },
                    entities_id: { type: "number", description: "ID da entidade (padrão 0 para Grupo Zaleski)" },
                    is_recursive: { type: "number", description: "1 se propaga para entidades filhas, 0 se apenas local" },
                    users_id: { type: "number", description: "ID do autor do artigo" }
                },
                required: ["name", "answer"]
            }
        },
        handler: async (args: any) => {
            const input: Record<string, any> = {
                entities_id: 0,
                is_recursive: 1,
                ...pickDefined(args, KNOWBASE_FIELDS)
            };
            const created = await glpiRequestV1("POST", "/KnowbaseItem", { body: { input } });
            return { content: [{ type: "text", text: JSON.stringify(created, null, 2) }] };
        }
    },
    {
        tool: {
            name: "glpi_update_knowbase_item",
            description: "Atualiza um artigo existente na base de conhecimento (API v1).",
            inputSchema: {
                type: "object",
                properties: {
                    id: { type: "number", description: "ID do artigo a atualizar" },
                    name: { type: "string", description: "Novo título do artigo" },
                    answer: { type: "string", description: "Novo conteúdo do artigo em HTML ou texto" },
                    is_faq: { type: "number", description: "1 se for FAQ pública, 0 se for restrito" },
                    knowbaseitemcategories_id: { type: "number", description: "ID da categoria do artigo" },
                    entities_id: { type: "number", description: "ID da entidade" },
                    is_recursive: { type: "number", description: "1 se propaga para entidades filhas, 0 se apenas local" }
                },
                required: ["id"]
            }
        },
        handler: async (args: any) => {
            const input = pickDefined(args, KNOWBASE_FIELDS);
            if (Object.keys(input).length === 0) {
                throw new Error("Nenhum campo para atualizar foi informado além de id.");
            }
            input.id = args.id;
            const updated = await glpiRequestV1("PUT", `/KnowbaseItem/${args.id}`, { body: { input } });
            return { content: [{ type: "text", text: JSON.stringify(updated, null, 2) }] };
        }
    },
    {
        tool: {
            name: "glpi_delete_knowbase_item",
            description: "Remove um artigo da base de conhecimento (API v1).",
            inputSchema: {
                type: "object",
                properties: {
                    id: { type: "number", description: "ID do artigo a excluir" },
                    force: { type: "boolean", description: "true para purgar definitivamente, false para enviar para a lixeira" }
                },
                required: ["id"]
            }
        },
        handler: async (args: any) => {
            const params: any = {};
            if (args.force !== undefined) {
                params.force_purge = args.force;
            }
            const deleted = await glpiRequestV1("DELETE", `/KnowbaseItem/${args.id}`, { params });
            return { content: [{ type: "text", text: JSON.stringify(deleted, null, 2) }] };
        }
    }
];
