import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { problemTools } from '../../src/tools/problems.js';
import * as client from '../../src/client.js';

vi.mock('../../src/client.js', () => ({
  glpiRequest: vi.fn()
}));

describe('Problem Tools', () => {
  beforeEach(() => {
    vi.mocked(client.glpiRequest).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export all 7 tools', () => {
    expect(problemTools.length).toBe(7);
    const names = problemTools.map(t => t.tool.name);
    expect(names).toEqual([
      'glpi_search_problems',
      'glpi_get_problem',
      'glpi_get_problem_timeline',
      'glpi_create_problem',
      'glpi_update_problem',
      'glpi_add_problem_followup',
      'glpi_get_problem_stats'
    ]);
  });

  it('glpi_search_problems should call list and return formatted result', async () => {
    const searchTool = problemTools.find(t => t.tool.name === 'glpi_search_problems');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([{ id: 1, name: 'Test Problem' }]);

    const result = await searchTool!.handler({ start: 0, limit: 10, filter: 'status=1' });

    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assistance/Problem', { params: { start: 0, limit: 10, filter: 'status=1' } });
    expect(result.content[0].text).toContain('"Test Problem"');
  });

  it('glpi_get_problem should call get and getTimeline', async () => {
    const getTool = problemTools.find(t => t.tool.name === 'glpi_get_problem');
    vi.mocked(client.glpiRequest)
      .mockResolvedValueOnce({ id: 1, name: 'Problem 1' })
      .mockResolvedValueOnce([{ id: 100, type: 'Followup' }]);

    const result = await getTool!.handler({ id: 1 });

    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assistance/Problem/1', { params: undefined });
    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assistance/Problem/1/Timeline', { params: undefined });
    
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.name).toBe('Problem 1');
    expect(parsed.timeline).toBeDefined();
    expect(parsed.timeline[0].type).toBe('Followup');
  });

  it('glpi_get_problem_timeline should call getTimeline', async () => {
    const timelineTool = problemTools.find(t => t.tool.name === 'glpi_get_problem_timeline');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([{ id: 100, type: 'Task' }]);

    const result = await timelineTool!.handler({ id: 1 });

    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assistance/Problem/1/Timeline', { params: undefined });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed[0].type).toBe('Task');
  });

  it('glpi_create_problem should call create', async () => {
    const createTool = problemTools.find(t => t.tool.name === 'glpi_create_problem');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce({ id: 2, name: 'New Problem' });

    const result = await createTool!.handler({ input: { name: 'New Problem' } });

    expect(client.glpiRequest).toHaveBeenCalledWith('POST', '/Assistance/Problem', { body: { name: 'New Problem' } });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe(2);
  });

  it('glpi_update_problem should call update', async () => {
    const updateTool = problemTools.find(t => t.tool.name === 'glpi_update_problem');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce({ id: 1, status: 2 });

    const result = await updateTool!.handler({ id: 1, input: { status: 2 } });

    expect(client.glpiRequest).toHaveBeenCalledWith('PATCH', '/Assistance/Problem/1', { body: { status: 2 } });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe(2);
  });

  it('glpi_add_problem_followup should call correct endpoint', async () => {
    const addFollowupTool = problemTools.find(t => t.tool.name === 'glpi_add_problem_followup');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce({ id: 100 });

    const result = await addFollowupTool!.handler({ id: 1, content: 'Problem followup', is_private: true });

    expect(client.glpiRequest).toHaveBeenCalledWith('POST', '/Assistance/Problem/1/Timeline/Followup', { 
      body: { itemtype: 'Problem', items_id: 1, content: 'Problem followup', is_private: 1 }
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.id).toBe(100);
  });

  it('glpi_get_problem_stats should call stats endpoint', async () => {
    const statsTool = problemTools.find(t => t.tool.name === 'glpi_get_problem_stats');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce({ count: 3 });

    const result = await statsTool!.handler({ id: 1 });

    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assistance/Stat/Problem/1');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.count).toBe(3);
  });
});
