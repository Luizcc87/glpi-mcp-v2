import { glpiRequest } from "../client.js";
import { GlpiTool } from "./assistance.js";

export const statsTools: GlpiTool[] = [
    {
        tool: {
            name: "glpi_get_asset_stats",
            description: "Retorna estatísticas de ativos (assets) associados a chamados, mudanças ou problemas.",
            inputSchema: {
                type: "object",
                properties: {
                    itemtype: { type: "string", description: "Tipo de item", enum: ["Ticket", "Problem", "Change"] },
                    date_start: { type: "string", description: "Data de início (YYYY-MM-DD)" },
                    date_end: { type: "string", description: "Data de fim (YYYY-MM-DD)" }
                },
                required: ["itemtype"]
            }
        },
        handler: async (args: any) => {
            const params: any = {};
            if (args.date_start) params.date_start = args.date_start;
            if (args.date_end) params.date_end = args.date_end;
            
            const stats = await glpiRequest('GET', `/Assistance/Stat/${args.itemtype}/Asset`, { params });
            return { content: [{ type: "text", text: JSON.stringify(stats, null, 2) }] };
        }
    }
];
