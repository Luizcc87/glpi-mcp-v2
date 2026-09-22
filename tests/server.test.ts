import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createServer } from '../src/server.js';
import * as client from '../src/client.js';

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

describe('GLPI MCP Server Integration', () => {
  beforeEach(() => {
    vi.mocked(client.glpiRequest).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should register and list all 30 tools', async () => {
    const server = createServer();
    // Use request handler for ListTools
    const handlers = (server as any)._requestHandlers;
    const listHandler = handlers.get('tools/list');
    expect(listHandler).toBeDefined();

    const result = await listHandler({ method: 'tools/list', params: {} });
    expect(result.tools).toHaveLength(30);

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

    // Administration (3)
    expect(toolNames).toContain('glpi_search_user');
    expect(toolNames).toContain('glpi_get_user_context');
    expect(toolNames).toContain('glpi_list_groups');

    // Statistics (1)
    expect(toolNames).toContain('glpi_get_asset_stats');
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
});
