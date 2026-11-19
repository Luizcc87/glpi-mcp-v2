import { glpiRequestV1 } from "../clientV1.js";
import { GlpiTool } from "./assistance.js";

// As tools de Projetos utilizam a API v1 porque o esquema v2 do GLPI 11
// expõe apenas name, code, content, priority e entity.

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

const PROJECT_FIELDS = [
    "name",
    "code",
    "entities_id",
    "is_recursive",
    "projectstates_id",
    "projecttypes_id",
    "projects_id",
    "users_id",
    "groups_id",
    "plan_start_date",
    "plan_end_date",
    "real_start_date",
    "real_end_date",
    "percent_done",
    "auto_percent_done",
    "show_on_global_gantt",
    "priority",
    "content",
    "comment"
] as const;

const PROJECT_TASK_FIELDS = [
    "name",
    "projects_id",
    "projecttasks_id",
    "projectstates_id",
    "projecttasktypes_id",
    "entities_id",
    "plan_start_date",
    "plan_end_date",
    "real_start_date",
    "real_end_date",
    "percent_done",
    "auto_percent_done",
    "is_milestone",
    "content",
    "comment"
] as const;

const PROJECT_ITIL_FIELDS = ["projects_id", "itemtype", "items_id"] as const;
const TASK_TICKET_FIELDS = ["projecttasks_id", "tickets_id"] as const;
const PROJECT_TEAM_FIELDS = ["projects_id", "itemtype", "items_id"] as const;

const projectFieldProperties = {
    name: { type: "string", description: "Nome do projeto" },
    code: { type: "string", description: "Código identificador do projeto" },
    entities_id: { type: "number", description: "ID da entidade" },
    is_recursive: { type: "number", description: "Visível em subentidades (0 ou 1)" },
    projectstates_id: { type: "number", description: "ID do estado do projeto (use glpi_list_project_states)" },
    projecttypes_id: { type: "number", description: "ID do tipo de projeto" },
    projects_id: { type: "number", description: "ID do projeto pai" },
    users_id: { type: "number", description: "ID do usuário gerente do projeto" },
    groups_id: { type: "number", description: "ID do grupo gerente do projeto" },
    plan_start_date: { type: "string", description: "Data de início planejada (formato 'YYYY-MM-DD HH:MM:SS')" },
    plan_end_date: { type: "string", description: "Data de fim planejada (formato 'YYYY-MM-DD HH:MM:SS')" },
    real_start_date: { type: "string", description: "Data de início real (formato 'YYYY-MM-DD HH:MM:SS')" },
    real_end_date: { type: "string", description: "Data de fim real (formato 'YYYY-MM-DD HH:MM:SS')" },
    percent_done: { type: "number", description: "Percentual concluído (0 a 100)" },
    auto_percent_done: { type: "number", description: "Cálculo automático do percentual concluído (0 ou 1)" },
    show_on_global_gantt: { type: "number", description: "Exibir no Gantt global (0 ou 1)" },
    priority: { type: "number", description: "Prioridade do projeto (1 a 6)" },
    content: { type: "string", description: "Descrição / conteúdo detalhado do projeto" },
    comment: { type: "string", description: "Comentários adicionais do projeto" }
};

const projectTaskFieldProperties = {
    name: { type: "string", description: "Nome da tarefa de projeto" },
    projects_id: { type: "number", description: "ID do projeto ao qual a tarefa pertence" },
    projecttasks_id: { type: "number", description: "ID da tarefa pai (para subtarefas)" },
    projectstates_id: { type: "number", description: "ID do estado da tarefa (use glpi_list_project_states)" },
    projecttasktypes_id: { type: "number", description: "ID do tipo de tarefa de projeto" },
    entities_id: { type: "number", description: "ID da entidade" },
    plan_start_date: { type: "string", description: "Data de início planejada (formato 'YYYY-MM-DD HH:MM:SS')" },
    plan_end_date: { type: "string", description: "Data de fim planejada (formato 'YYYY-MM-DD HH:MM:SS')" },
    real_start_date: { type: "string", description: "Data de início real (formato 'YYYY-MM-DD HH:MM:SS')" },
    real_end_date: { type: "string", description: "Data de fim real (formato 'YYYY-MM-DD HH:MM:SS')" },
    percent_done: { type: "number", description: "Percentual concluído (0 a 100)" },
    auto_percent_done: { type: "number", description: "Cálculo automático do percentual concluído (0 ou 1)" },
    is_milestone: { type: "number", description: "Indica se a tarefa é um marco/milestone (0 ou 1)" },
    content: { type: "string", description: "Descrição / conteúdo da tarefa" },
    comment: { type: "string", description: "Comentários adicionais da tarefa" }
};

export const projectTools: GlpiTool[] = [
    {
        tool: {
            name: "glpi_search_projects",
            description: "Busca e lista projetos no GLPI (API v1). Permite paginação (start, limit) e busca por texto no nome (searchText).",
            inputSchema: {
                type: "object",
                properties: {
                    start: { type: "number", description: "Início da paginação (offset)" },
                    limit: { type: "number", description: "Limite de itens por página" },
                    searchText: { type: "string", description: "Texto para buscar no nome do projeto" }
                }
            }
        },
        handler: async (args: any) => {
            const params: Record<string, any> = {
                expand_dropdowns: true
            };
            const headers: Record<string, string> = {};

            if (args.start !== undefined || args.limit !== undefined) {
                const pagination = buildPagination(args.start, args.limit);
                Object.assign(headers, pagination.headers);
                Object.assign(params, pagination.params);
            }

            if (args.searchText !== undefined && args.searchText !== "") {
                params["searchText[name]"] = args.searchText;
            }

            const items = await glpiRequestV1("GET", "/Project", { params, headers });
            return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
        }
    },
    {
        tool: {
            name: "glpi_get_project",
            description: "Retorna o contexto completo de UM projeto (API v1), incluindo tarefas (tasks), equipe (team) e itens ITIL vinculados (itil).",
            inputSchema: {
                type: "object",
                properties: {
                    id: { type: "number", description: "ID do projeto" }
                },
                required: ["id"]
            }
        },
        handler: async (args: any) => {
            const id = args.id;
            const project = await glpiRequestV1("GET", `/Project/${id}`, {
                params: { expand_dropdowns: true }
            });

            const fetchSubitem = async (path: string) => {
                try {
                    return await glpiRequestV1("GET", path);
                } catch (error: any) {
                    return error instanceof Error ? error.message : String(error);
                }
            };

            const [tasks, team, itil] = await Promise.all([
                fetchSubitem(`/Project/${id}/ProjectTask`),
                fetchSubitem(`/Project/${id}/ProjectTeam`),
                fetchSubitem(`/Project/${id}/Itil_Project`)
            ]);

            const result = { project, tasks, team, itil };
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }
    },
    {
        tool: {
            name: "glpi_create_project",
            description: "Cria um novo projeto no GLPI (API v1). Datas devem usar o formato 'YYYY-MM-DD HH:MM:SS'.",
            inputSchema: {
                type: "object",
                properties: projectFieldProperties,
                required: ["name"]
            }
        },
        handler: async (args: any) => {
            const input = pickDefined(args, PROJECT_FIELDS);
            const created = await glpiRequestV1("POST", "/Project", { body: { input } });
            return { content: [{ type: "text", text: JSON.stringify(created, null, 2) }] };
        }
    },
    {
        tool: {
            name: "glpi_update_project",
            description: "Atualiza campos de um projeto existente no GLPI (API v1). Datas devem usar o formato 'YYYY-MM-DD HH:MM:SS'.",
            inputSchema: {
                type: "object",
                properties: {
                    id: { type: "number", description: "ID do projeto" },
                    ...projectFieldProperties
                },
                required: ["id"]
            }
        },
        handler: async (args: any) => {
            const input = pickDefined(args, PROJECT_FIELDS);
            if (Object.keys(input).length === 0) {
                throw new Error("Nenhum campo para atualizar foi informado além de id.");
            }
            const updated = await glpiRequestV1("PUT", `/Project/${args.id}`, { body: { input } });
            return { content: [{ type: "text", text: JSON.stringify(updated, null, 2) }] };
        }
    },
    {
        tool: {
            name: "glpi_create_project_task",
            description: "Cria uma nova tarefa de projeto no GLPI (API v1). Datas devem usar o formato 'YYYY-MM-DD HH:MM:SS'.",
            inputSchema: {
                type: "object",
                properties: projectTaskFieldProperties,
                required: ["name", "projects_id"]
            }
        },
        handler: async (args: any) => {
            const input = pickDefined(args, PROJECT_TASK_FIELDS);
            const created = await glpiRequestV1("POST", "/ProjectTask", { body: { input } });
            return { content: [{ type: "text", text: JSON.stringify(created, null, 2) }] };
        }
    },
    {
        tool: {
            name: "glpi_update_project_task",
            description: "Atualiza campos de uma tarefa de projeto existente no GLPI (API v1). Datas devem usar o formato 'YYYY-MM-DD HH:MM:SS'.",
            inputSchema: {
                type: "object",
                properties: {
                    id: { type: "number", description: "ID da tarefa de projeto" },
                    ...projectTaskFieldProperties
                },
                required: ["id"]
            }
        },
        handler: async (args: any) => {
            const input = pickDefined(args, PROJECT_TASK_FIELDS);
            if (Object.keys(input).length === 0) {
                throw new Error("Nenhum campo para atualizar foi informado além de id.");
            }
            const updated = await glpiRequestV1("PUT", `/ProjectTask/${args.id}`, { body: { input } });
            return { content: [{ type: "text", text: JSON.stringify(updated, null, 2) }] };
        }
    },
    {
        tool: {
            name: "glpi_link_project_itil",
            description: "Vincula um item ITIL (Ticket, Change ou Problem) a um projeto no GLPI (API v1).",
            inputSchema: {
                type: "object",
                properties: {
                    projects_id: { type: "number", description: "ID do projeto" },
                    itemtype: {
                        type: "string",
                        description: "Tipo do item ITIL a vincular",
                        enum: ["Ticket", "Change", "Problem"]
                    },
                    items_id: { type: "number", description: "ID do item ITIL" }
                },
                required: ["projects_id", "itemtype", "items_id"]
            }
        },
        handler: async (args: any) => {
            const input = pickDefined(args, PROJECT_ITIL_FIELDS);
            const created = await glpiRequestV1("POST", "/Itil_Project", { body: { input } });
            return { content: [{ type: "text", text: JSON.stringify(created, null, 2) }] };
        }
    },
    {
        tool: {
            name: "glpi_link_task_ticket",
            description: "Vincula um chamado (Ticket) a uma tarefa de projeto no GLPI (API v1).",
            inputSchema: {
                type: "object",
                properties: {
                    projecttasks_id: { type: "number", description: "ID da tarefa de projeto" },
                    tickets_id: { type: "number", description: "ID do chamado (Ticket)" }
                },
                required: ["projecttasks_id", "tickets_id"]
            }
        },
        handler: async (args: any) => {
            const input = pickDefined(args, TASK_TICKET_FIELDS);
            const created = await glpiRequestV1("POST", "/ProjectTask_Ticket", { body: { input } });
            return { content: [{ type: "text", text: JSON.stringify(created, null, 2) }] };
        }
    },
    {
        tool: {
            name: "glpi_add_project_team",
            description: "Adiciona um membro (User, Group, Supplier ou Contact) à equipe de um projeto no GLPI (API v1).",
            inputSchema: {
                type: "object",
                properties: {
                    projects_id: { type: "number", description: "ID do projeto" },
                    itemtype: {
                        type: "string",
                        description: "Tipo do membro da equipe",
                        enum: ["User", "Group", "Supplier", "Contact"]
                    },
                    items_id: { type: "number", description: "ID do membro da equipe" }
                },
                required: ["projects_id", "itemtype", "items_id"]
            }
        },
        handler: async (args: any) => {
            const input = pickDefined(args, PROJECT_TEAM_FIELDS);
            const created = await glpiRequestV1("POST", "/ProjectTeam", { body: { input } });
            return { content: [{ type: "text", text: JSON.stringify(created, null, 2) }] };
        }
    },
    {
        tool: {
            name: "glpi_list_project_states",
            description: "Lista os estados de projeto disponíveis no GLPI (ProjectState, API v1) para descobrir IDs de estado.",
            inputSchema: {
                type: "object",
                properties: {}
            }
        },
        handler: async () => {
            const states = await glpiRequestV1("GET", "/ProjectState");
            return { content: [{ type: "text", text: JSON.stringify(states, null, 2) }] };
        }
    }
];
