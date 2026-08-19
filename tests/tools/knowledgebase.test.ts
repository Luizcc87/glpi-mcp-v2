import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { kbTools } from '../../src/tools/knowledgebase.js';
import * as client from '../../src/client.js';

vi.mock('../../src/client.js', () => ({
  glpiRequest: vi.fn()
}));

describe('Knowledgebase Tools', () => {
  beforeEach(() => {
    vi.mocked(client.glpiRequest).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export all 2 tools', () => {
    expect(kbTools.length).toBe(2);
    const names = kbTools.map(t => t.tool.name);
    expect(names).toEqual([
      'glpi_search_knowbase',
      'glpi_get_knowbase_item'
    ]);
  });

  it('glpi_search_knowbase should call list and return formatted result', async () => {
    const searchTool = kbTools.find(t => t.tool.name === 'glpi_search_knowbase');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([{ id: 1, name: 'Test Article' }]);

    const result = await searchTool!.handler({ start: 0, limit: 10, filter: 'name=Test' });

    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Knowledgebase/Article', { params: { start: 0, limit: 10, filter: 'name=Test' } });
    expect(result.content[0].text).toContain('"Test Article"');
  });

  it('glpi_get_knowbase_item should call get and return formatted result', async () => {
    const getTool = kbTools.find(t => t.tool.name === 'glpi_get_knowbase_item');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce({ id: 1, name: 'Article 1' });

    const result = await getTool!.handler({ id: 1 });

    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Knowledgebase/Article/1', { params: {} });
    
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.name).toBe('Article 1');
  });

  it('glpi_get_knowbase_item should handle language parameter', async () => {
    const getTool = kbTools.find(t => t.tool.name === 'glpi_get_knowbase_item');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce({ id: 1, name: 'Article 1' });

    const result = await getTool!.handler({ id: 1, language: 'en_GB' });

    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Knowledgebase/Article/1', { params: { language: 'en_GB' } });
    
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.name).toBe('Article 1');
  });
});
