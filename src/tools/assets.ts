import { glpiRequest } from "../client.js";
import { GlpiTool } from "./assistance.js";

async function getComputerSpecs(id: number) {
    const specs: any = {};
    const endpoints = [
        { key: 'processors', path: `/Assets/Computer/${id}/Component/Processor` },
        { key: 'memory', path: `/Assets/Computer/${id}/Component/Memory` },
        { key: 'hardDrives', path: `/Assets/Computer/${id}/Component/HardDrive` },
        { key: 'drives', path: `/Assets/Computer/${id}/Component/Drive` },
        { key: 'networkCards', path: `/Assets/Computer/${id}/Component/NetworkCard` },
        { key: 'software', path: `/Assets/Computer/${id}/SoftwareInstallation` }
    ];

    for (const ep of endpoints) {
        try {
            const result = await glpiRequest('GET', ep.path);
            specs[ep.key] = result;
        } catch (e) {
            // Ignore if sub-resource fails
        }
    }
    return specs;
}

export const assetTools: GlpiTool[] = [
    {
        tool: {
            name: "glpi_list_computers",
            description: "Busca e lista computadores (Assets). Permite paginação (start, limit) e filtros (filter em RSQL).",
            inputSchema: {
                type: "object",
                properties: {
                    start: { type: "number", description: "Início da paginação (offset)" },
                    limit: { type: "number", description: "Limite de itens por página" },
                    filter: { type: "string", description: "Filtro em RSQL (ex: name=*server*)" },
                    include_specs: { type: "boolean", description: "Se true, busca especificações de hardware e software de cada computador listado (cuidado: pode ser lento se houver muitos itens)" }
                }
            }
        },
        handler: async (args: any) => {
            const params: any = {};
            if (args.start !== undefined) params.start = args.start;
            if (args.limit !== undefined) params.limit = args.limit;
            if (args.filter !== undefined) params.filter = args.filter;
            
            let items = await glpiRequest<any[]>('GET', `/Assets/Computer`, { params });
            
            if (args.include_specs && Array.isArray(items)) {
                items = await Promise.all(items.map(async (item: any) => {
                    const specs = await getComputerSpecs(item.id);
                    return { ...item, specs };
                }));
            }

            return { content: [{ type: "text", text: JSON.stringify(items, null, 2) }] };
        }
    },
    {
        tool: {
            name: "glpi_get_computer",
            description: "Retorna o contexto completo de UM computador, incluindo especificações de hardware (CPU, memória, disco, rede) e software instalado.",
            inputSchema: {
                type: "object",
                properties: {
                    id: { type: "number", description: "ID do computador" }
                },
                required: ["id"]
            }
        },
        handler: async (args: any) => {
            const id = args.id;
            const computer = await glpiRequest<any>('GET', `/Assets/Computer/${id}`);
            const specs = await getComputerSpecs(id);
            const result = {
                ...computer,
                specs
            };
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }
    }
];
