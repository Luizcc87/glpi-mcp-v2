import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createServer, isWriteTool } from '../src/server.js';
import * as client from '../src/client.js';
import * as clientV1 from '../src/clientV1.js';

vi.mock('../src/client.js', () => ({
  glpiRequest: vi.fn(),
  loadConfig: vi.fn(() => ({
    baseUrl: 'http://localhost:8080',
    clientId: 'test_client_id',
    clientSecret: 'test_client_secret',
    username: 'glpi',
    password: 'password'
  }))
}));

vi.mock('../src/clientV1.js', () => ({
  glpiRequestV1: vi.fn()
}));

describe('GLPI MCP Server Integration', () => {
  const originalMode = process.env.GLPI_MCP_MODE;

  beforeEach(() => {
    delete process.env.GLPI_MCP_MODE;
    vi.mocked(client.glpiRequest).mockReset();
    vi.mocked(clientV1.glpiRequestV1).mockReset();
  });

  afterEach(() => {
    if (originalMode === undefined) {
      delete process.env.GLPI_MCP_MODE;
    } else {
      process.env.GLPI_MCP_MODE = originalMode;
    }
    vi.restoreAllMocks();
  });

  it('should register and list all 41 tools in default (write) mode', async () => {
    const server = createServer();
    // Use request handler for ListTools
    const handlers = (server as any)._requestHandlers;
    const listHandler = handlers.get('tools/list');
    expect(listHandler).toBeDefined();

    const result = await listHandler({ method: 'tools/list', params: {} });
    expect(result.tools).toHaveLength(41);

    const toolNames = result.tools.map((t: any) => t.name);
    // Assistance: Ticket (7)
    expect(toolNames).toContain('glpi_search_tickets');
    expect(toolNames).toContain('glpi_get_ticket');
    expect(toolNames).toContain('glpi_get_ticket_timeline');
    expect(toolNames).toContain('glpi_create_ticket');
    expect(toolNames).toContain('glpi_update_ticket');
    expect(toolNames).toContain('glpi_add_ticket_followup');
    expect(toolNames).toContain('glpi_get_ticket_stats');

    // Assistance: Problem (7)
    expect(toolNames).toContain('glpi_search_problems');
    expect(toolNames).toContain('glpi_get_problem');
    expect(toolNames).toContain('glpi_get_problem_timeline');
    expect(toolNames).toContain('glpi_create_problem');
    expect(toolNames).toContain('glpi_update_problem');
    expect(toolNames).toContain('glpi_add_problem_followup');
    expect(toolNames).toContain('glpi_get_problem_stats');

    // Assistance: Change (7)
    expect(toolNames).toContain('glpi_search_changes');
    expect(toolNames).toContain('glpi_get_change');
    expect(toolNames).toContain('glpi_get_change_timeline');
    expect(toolNames).toContain('glpi_create_change');
    expect(toolNames).toContain('glpi_update_change');
    expect(toolNames).toContain('glpi_add_change_followup');
    expect(toolNames).toContain('glpi_get_change_stats');

    // Knowledgebase (3)
    expect(toolNames).toContain('glpi_search_knowbase');
    expect(toolNames).toContain('glpi_get_knowbase_item');
    expect(toolNames).toContain('glpi_search_faq');

    // Assets (2)
    expect(toolNames).toContain('glpi_list_computers');
    expect(toolNames).toContain('glpi_get_computer');

    // Administration (4)
    expect(toolNames).toContain('glpi_search_user');
    expect(toolNames).toContain('glpi_get_user_context');
    expect(toolNames).toContain('glpi_list_groups');
    expect(toolNames).toContain('glpi_list_plugins');

    // Statistics (1)
    expect(toolNames).toContain('glpi_get_asset_stats');

    // Projects (10)
    expect(toolNames).toContain('glpi_search_projects');
    expect(toolNames).toContain('glpi_get_project');
    expect(toolNames).toContain('glpi_create_project');
    expect(toolNames).toContain('glpi_update_project');
    expect(toolNames).toContain('glpi_create_project_task');
    expect(toolNames).toContain('glpi_update_project_task');
    expect(toolNames).toContain('glpi_link_project_itil');
    expect(toolNames).toContain('glpi_link_task_ticket');
    expect(toolNames).toContain('glpi_add_project_team');
    expect(toolNames).toContain('glpi_list_project_states');
  });

  it('should call tool handler successfully via tools/call', async () => {
    const server = createServer();
    const handlers = (server as any)._requestHandlers;
    const callHandler = handlers.get('tools/call');

    vi.mocked(client.glpiRequest).mockResolvedValueOnce([{ id: 42, name: 'Ticket 42' }]);

    const response = await callHandler({
      method: 'tools/call',
      params: {
        name: 'glpi_search_tickets',
        arguments: { limit: 1 }
      }
    });

    expect(response.isError).toBeFalsy();
    expect(response.content[0].text).toContain('Ticket 42');
  });

  it('should return error if tool does not exist', async () => {
    const server = createServer();
    const handlers = (server as any)._requestHandlers;
    const callHandler = handlers.get('tools/call');

    await expect(
      callHandler({
        method: 'tools/call',
        params: {
          name: 'non_existent_tool',
          arguments: {}
        }
      })
    ).rejects.toThrow('Unknown tool: non_existent_tool');
  });

  it('should catch handler errors and return isError: true with message', async () => {
    const server = createServer();
    const handlers = (server as any)._requestHandlers;
    const callHandler = handlers.get('tools/call');

    vi.mocked(client.glpiRequest).mockRejectedValueOnce(new Error('GLPI API timeout'));

    const response = await callHandler({
      method: 'tools/call',
      params: {
        name: 'glpi_search_tickets',
        arguments: {}
      }
    });

    expect(response.isError).toBe(true);
    expect(response.content[0].text).toContain('Error executing tool glpi_search_tickets: GLPI API timeout');
  });

  describe('isWriteTool & GLPI_MCP_MODE', () => {
    it('isWriteTool should classify write and read tools accurately', () => {
      expect(isWriteTool('glpi_create_ticket')).toBe(true);
      expect(isWriteTool('glpi_update_project')).toBe(true);
      expect(isWriteTool('glpi_add_project_team')).toBe(true);
      expect(isWriteTool('glpi_link_project_itil')).toBe(true);
      expect(isWriteTool('glpi_link_task_ticket')).toBe(true);
      expect(isWriteTool('glpi_delete_anything')).toBe(true);

      expect(isWriteTool('glpi_search_tickets')).toBe(false);
      expect(isWriteTool('glpi_get_project')).toBe(false);
      expect(isWriteTool('glpi_list_project_states')).toBe(false);
      expect(isWriteTool('glpi_list_plugins')).toBe(false);
    });

    it('should omit write tools from tools/list and block write calls in read mode', async () => {
      process.env.GLPI_MCP_MODE = 'read';
      const server = createServer();
      const handlers = (server as any)._requestHandlers;
      const listHandler = handlers.get('tools/list');
      const callHandler = handlers.get('tools/call');

      const listResult = await listHandler({ method: 'tools/list', params: {} });
      const toolNames: string[] = listResult.tools.map((t: any) => t.name);

      expect(toolNames.length).toBe(25);
      expect(toolNames.some(name => isWriteTool(name))).toBe(false);
      expect(toolNames).toContain('glpi_search_projects');
      expect(toolNames).toContain('glpi_get_project');
      expect(toolNames).toContain('glpi_list_project_states');
      expect(toolNames).not.toContain('glpi_create_project');
      expect(toolNames).not.toContain('glpi_create_ticket');
      expect(toolNames).not.toContain('glpi_link_project_itil');

      const blockedProject = await callHandler({
        method: 'tools/call',
        params: {
          name: 'glpi_create_project',
          arguments: { name: 'Blocked' }
        }
      });
      expect(blockedProject.isError).toBe(true);
      expect(blockedProject.content[0].text).toContain('servidor em modo somente leitura (GLPI_MCP_MODE=read)');
      expect(clientV1.glpiRequestV1).not.toHaveBeenCalled();

      const blockedTicket = await callHandler({
        method: 'tools/call',
        params: {
          name: 'glpi_create_ticket',
          arguments: { input: { name: 'Blocked' } }
        }
      });
      expect(blockedTicket.isError).toBe(true);
      expect(blockedTicket.content[0].text).toContain('servidor em modo somente leitura (GLPI_MCP_MODE=read)');
      expect(client.glpiRequest).not.toHaveBeenCalled();

      // Read tool should still work in read mode
      vi.mocked(clientV1.glpiRequestV1).mockResolvedValueOnce([{ id: 1, name: 'Ativo' }]);
      const allowedRead = await callHandler({
        method: 'tools/call',
        params: {
          name: 'glpi_list_project_states',
          arguments: {}
        }
      });
      expect(allowedRead.isError).toBeFalsy();
      expect(allowedRead.content[0].text).toContain('Ativo');
    });

    it('should throw on invalid GLPI_MCP_MODE value during server creation', () => {
      process.env.GLPI_MCP_MODE = 'invalid_mode';
      expect(() => createServer()).toThrow(/GLPI_MCP_MODE/);
    });
  });
});
