import { glpiRequest } from "../client.js";
import { glpiRequestV1 } from "../clientV1.js";
import { GlpiTool } from "./assistance.js";

// A API v2 (High-Level 2.1) nao tem rota para o software instalado num computador.
// A v1 entrega a lista em GET /Computer/{id}?with_softwares=true; com expand_dropdowns
// os ids de software, versao e categoria ja vem como nomes.
async function getComputerSoftware(id: number, filter?: string) {
    const computer = await glpiRequestV1<any>('GET', `/Computer/${id}`, {
        params: { with_softwares: true, expand_dropdowns: true }
    });
    const items = Array.isArray(computer?._softwares) ? computer._softwares : [];
    const needle = filter ? filter.toLowerCase() : undefined;
    return items
        .map((s: any) => ({
            name: s.softwares_id,
            version: s.softwareversions_id,
            category: s.softwarecategories_id || null,
            is_dynamic: Boolean(s.is_dynamic),
            is_valid: Boolean(s.is_valid)
        }))
        .filter((s: any) => !needle || String(s.name).toLowerCase().includes(needle));
}

async function getComputerSpecs(id: number, softwareFilter?: string) {
    const specs: any = {};
    const endpoints = [
        { key: 'processors', path: `/Assets/Computer/${id}/Component/Processor` },
        { key: 'memory', path: `/Assets/Computer/${id}/Component/Memory` },
        { key: 'hardDrives', path: `/Assets/Computer/${id}/Component/HardDrive` },
        { key: 'drives', path: `/Assets/Computer/${id}/Component/Drive` },
        { key: 'networkCards', path: `/Assets/Computer/${id}/Component/NetworkCard` }
    ];

    for (const ep of endpoints) {
        try {
            const result = await glpiRequest('GET', ep.path);
            specs[ep.key] = result;
        } catch (e) {
            // Ignore if sub-resource fails
        }
    }

    try {
        specs.software = await getComputerSoftware(id, softwareFilter);
    } catch (e: any) {
        // Sem tokens da v1 ou sem permissao: informa em vez de omitir em silencio
        specs.software_error = e?.message ?? String(e);
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
                    id: { type: "number", description: "ID do computador" },
                    software_filter: { type: "string", description: "Filtra o software instalado pelo nome (contém, sem diferenciar maiúsculas). Ex: Sysmo" }
                },
                required: ["id"]
            }
        },
        handler: async (args: any) => {
            const id = args.id;
            const computer = await glpiRequest<any>('GET', `/Assets/Computer/${id}`);
            const specs = await getComputerSpecs(id, args.software_filter);
            const result = {
                ...computer,
                specs
            };
            return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
        }
    }
];
