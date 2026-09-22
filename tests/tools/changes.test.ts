import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { changeTools } from '../../src/tools/changes.js';
import * as client from '../../src/client.js';

vi.mock('../../src/client.js', () => ({
  glpiRequest: vi.fn()
}));

describe('Change Tools', () => {
  beforeEach(() => {
    vi.mocked(client.glpiRequest).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export all 7 tools', () => {
    expect(changeTools.length).toBe(7);
    const names = changeTools.map(t => t.tool.name);
    expect(names).toEqual([
      'glpi_search_changes',
      'glpi_get_change',
      'glpi_get_change_timeline',
      'glpi_create_change',
      'glpi_update_change',
      'glpi_add_change_followup',
      'glpi_get_change_stats'
    ]);
  });

  it('glpi_search_changes should call list and return formatted result', async () => {
    const searchTool = changeTools.find(t => t.tool.name === 'glpi_search_changes');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([{ id: 1, name: 'Test Change' }]);

    const result = await searchTool!.handler({ start: 0, limit: 10, filter: 'status=1' });

    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assistance/Change', { params: { start: 0, limit: 10, filter: 'status=1' } });
    expect(result.content[0].text).toContain('"Test Change"');
  });

  it('glpi_get_change should call get and getTimeline', async () => {
    const getTool = changeTools.find(t => t.tool.name === 'glpi_get_change');
    vi.mocked(client.glpiRequest)
      .mockResolvedValueOnce({ id: 1, name: 'Change 1' })
      .mockResolvedValueOnce([{ id: 100, type: 'Followup' }]);

    const result = await getTool!.handler({ id: 1 });

    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assistance/Change/1', { params: undefined });
    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assistance/Change/1/Timeline', { params: undefined });
    
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.name).toBe('Change 1');
    expect(parsed.timeline).toBeDefined();
    expect(parsed.timeline[0].type).toBe('Followup');
  });

  it('glpi_get_change_timeline should call getTimeline', async () => {
    const timelineTool = changeTools.find(t => t.tool.name === 'glpi_get_change_timeline');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([{ id: 100, type: 'Task' }]);

    const result = await timelineTool!.handler({ id: 1 });

    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assistance/Change/1/Timeline', { params: undefined });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed[0].type).toBe('Task');
  });

  it('glpi_create_change should call create', async () => {
    const createTool = changeTools.find(t => t.tool.name === 'glpi_create_change');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce({ id: 2, name: 'New Change' });

    const result = await createTool!.handler({ input: { name: 'New Change' } });

    expect(client.glpiRequest).toHaveBeenCalledWith('POST', '/Assistance/Change', { body: { name: 'New Change' } });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe(2);
  });

  it('glpi_update_change should call update', async () => {
    const updateTool = changeTools.find(t => t.tool.name === 'glpi_update_change');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce({ id: 1, status: 2 });

    const result = await updateTool!.handler({ id: 1, input: { status: 2 } });

    expect(client.glpiRequest).toHaveBeenCalledWith('PATCH', '/Assistance/Change/1', { body: { status: 2 } });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe(2);
  });

  it('glpi_add_change_followup should call correct endpoint', async () => {
    const addFollowupTool = changeTools.find(t => t.tool.name === 'glpi_add_change_followup');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce({ id: 100 });

    const result = await addFollowupTool!.handler({ id: 1, content: 'Change followup', is_private: false });

    expect(client.glpiRequest).toHaveBeenCalledWith('POST', '/Assistance/Change/1/Timeline/Followup', { 
      body: { itemtype: 'Change', items_id: 1, content: 'Change followup', is_private: 0 }
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe(100);
  });

  it('glpi_get_change_stats should call stats endpoint', async () => {
    const statsTool = changeTools.find(t => t.tool.name === 'glpi_get_change_stats');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce({ count: 1 });

    const result = await statsTool!.handler({ id: 1 });

    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assistance/Stat/Change/1');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.count).toBe(1);
  });
});
