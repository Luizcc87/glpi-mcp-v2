import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ticketTools } from '../../src/tools/tickets.js';
import * as client from '../../src/client.js';

vi.mock('../../src/client.js', () => ({
  glpiRequest: vi.fn()
}));

describe('Ticket Tools', () => {
  beforeEach(() => {
    vi.mocked(client.glpiRequest).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export all 7 tools', () => {
    expect(ticketTools.length).toBe(7);
    const names = ticketTools.map(t => t.tool.name);
    expect(names).toEqual([
      'glpi_search_tickets',
      'glpi_get_ticket',
      'glpi_get_ticket_timeline',
      'glpi_create_ticket',
      'glpi_update_ticket',
      'glpi_add_ticket_followup',
      'glpi_get_ticket_stats'
    ]);
  });

  it('glpi_search_tickets should call list and return formatted result', async () => {
    const searchTool = ticketTools.find(t => t.tool.name === 'glpi_search_tickets');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([{ id: 1, name: 'Test Ticket' }]);

    const result = await searchTool!.handler({ start: 0, limit: 10, filter: 'status=1' });

    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assistance/Ticket', { params: { start: 0, limit: 10, filter: 'status=1' } });
    expect(result.content[0].text).toContain('"Test Ticket"');
  });

  it('glpi_get_ticket should call get and getTimeline', async () => {
    const getTool = ticketTools.find(t => t.tool.name === 'glpi_get_ticket');
    vi.mocked(client.glpiRequest)
      .mockResolvedValueOnce({ id: 1, name: 'Ticket 1' }) // for get
      .mockResolvedValueOnce([{ id: 100, type: 'Followup' }]); // for timeline

    const result = await getTool!.handler({ id: 1 });

    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assistance/Ticket/1', { params: undefined });
    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assistance/Ticket/1/Timeline', { params: undefined });
    
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.name).toBe('Ticket 1');
    expect(parsed.timeline).toBeDefined();
    expect(parsed.timeline[0].type).toBe('Followup');
  });

  it('glpi_get_ticket should ignore timeline errors', async () => {
    const getTool = ticketTools.find(t => t.tool.name === 'glpi_get_ticket');
    vi.mocked(client.glpiRequest)
      .mockResolvedValueOnce({ id: 1, name: 'Ticket 1' }) // for get
      .mockRejectedValueOnce(new Error('Timeline failed')); // for timeline

    const result = await getTool!.handler({ id: 1 });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.name).toBe('Ticket 1');
    expect(parsed.timeline).toEqual([]);
  });

  it('glpi_get_ticket_timeline should call getTimeline', async () => {
    const timelineTool = ticketTools.find(t => t.tool.name === 'glpi_get_ticket_timeline');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([{ id: 100, type: 'Task' }]);

    const result = await timelineTool!.handler({ id: 1 });

    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assistance/Ticket/1/Timeline', { params: undefined });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed[0].type).toBe('Task');
  });

  it('glpi_create_ticket should call create', async () => {
    const createTool = ticketTools.find(t => t.tool.name === 'glpi_create_ticket');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce({ id: 2, name: 'New' });

    const result = await createTool!.handler({ input: { name: 'New' } });

    expect(client.glpiRequest).toHaveBeenCalledWith('POST', '/Assistance/Ticket', { body: { name: 'New' } });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe(2);
  });

  it('glpi_update_ticket should call update', async () => {
    const updateTool = ticketTools.find(t => t.tool.name === 'glpi_update_ticket');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce({ id: 1, status: 2 });

    const result = await updateTool!.handler({ id: 1, input: { status: 2 } });

    expect(client.glpiRequest).toHaveBeenCalledWith('PATCH', '/Assistance/Ticket/1', { body: { status: 2 } });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe(2);
  });

  it('glpi_add_ticket_followup should call correct endpoint', async () => {
    const addFollowupTool = ticketTools.find(t => t.tool.name === 'glpi_add_ticket_followup');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce({ id: 100 });

    const result = await addFollowupTool!.handler({ id: 1, content: 'Update', is_private: true });

    expect(client.glpiRequest).toHaveBeenCalledWith('POST', '/Assistance/Ticket/1/Timeline/Followup', { 
      body: { itemtype: 'Ticket', items_id: 1, content: 'Update', is_private: 1 }
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe(100);
  });

  it('glpi_get_ticket_stats should call stats endpoint', async () => {
    const statsTool = ticketTools.find(t => t.tool.name === 'glpi_get_ticket_stats');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce({ count: 5 });

    const result = await statsTool!.handler({ id: 1 });

    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assistance/Stat/Ticket/1');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.count).toBe(5);
  });
});
