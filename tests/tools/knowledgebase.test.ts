import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { kbTools } from '../../src/tools/knowledgebase.js';
import * as clientV1 from '../../src/clientV1.js';

vi.mock('../../src/clientV1.js', () => ({
  glpiRequestV1: vi.fn()
}));

describe('Knowledgebase Tools (API v1)', () => {
  beforeEach(() => {
    vi.mocked(clientV1.glpiRequestV1).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export all 3 tools', () => {
    expect(kbTools.length).toBe(3);
    const names = kbTools.map(t => t.tool.name);
    expect(names).toEqual([
      'glpi_search_knowbase',
      'glpi_get_knowbase_item',
      'glpi_search_faq'
    ]);
  });

  it('glpi_search_knowbase should call list and return formatted result with Range and searchText', async () => {
    const searchTool = kbTools.find(t => t.tool.name === 'glpi_search_knowbase');
    vi.mocked(clientV1.glpiRequestV1).mockResolvedValueOnce([{ id: 1, name: 'Test Article' }]);

    const result = await searchTool!.handler({ start: 0, limit: 10, filter: 'name=Test' });

    expect(clientV1.glpiRequestV1).toHaveBeenCalledWith('GET', '/KnowbaseItem', {
      params: { 'searchText[name]': 'Test', range: '0-9' },
      headers: { Range: '0-9' }
    });
    expect(result.content[0].text).toContain('"Test Article"');
  });

  it('glpi_get_knowbase_item should call get and return formatted result', async () => {
    const getTool = kbTools.find(t => t.tool.name === 'glpi_get_knowbase_item');
    vi.mocked(clientV1.glpiRequestV1).mockResolvedValueOnce({ id: 1, name: 'Article 1' });

    const result = await getTool!.handler({ id: 1 });

    expect(clientV1.glpiRequestV1).toHaveBeenCalledWith('GET', '/KnowbaseItem/1', { params: {} });
    
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.name).toBe('Article 1');
  });

  it('glpi_get_knowbase_item should handle language parameter', async () => {
    const getTool = kbTools.find(t => t.tool.name === 'glpi_get_knowbase_item');
    vi.mocked(clientV1.glpiRequestV1).mockResolvedValueOnce({ id: 1, name: 'Article 1' });

    const result = await getTool!.handler({ id: 1, language: 'en_GB' });

    expect(clientV1.glpiRequestV1).toHaveBeenCalledWith('GET', '/KnowbaseItem/1', { params: { language: 'en_GB' } });
    
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.name).toBe('Article 1');
  });

  it('glpi_search_faq should query with searchText[is_faq]=1 and query in searchText[name]', async () => {
    const faqTool = kbTools.find(t => t.tool.name === 'glpi_search_faq');
    vi.mocked(clientV1.glpiRequestV1).mockResolvedValueOnce([{ id: 10, name: 'Como resetar senha' }]);

    const result = await faqTool!.handler({ query: 'senha', start: 0, limit: 5 });

    expect(clientV1.glpiRequestV1).toHaveBeenCalledWith('GET', '/KnowbaseItem', {
      params: {
        'searchText[is_faq]': '1',
        'searchText[name]': 'senha',
        range: '0-4'
      },
      headers: {
        Range: '0-4'
      }
    });
    expect(result.content[0].text).toContain('"Como resetar senha"');
  });

  it('glpi_search_faq should query without query parameter', async () => {
    const faqTool = kbTools.find(t => t.tool.name === 'glpi_search_faq');
    vi.mocked(clientV1.glpiRequestV1).mockResolvedValueOnce([{ id: 11, name: 'FAQ Geral' }]);

    const result = await faqTool!.handler({ language: 'pt_BR' });

    expect(clientV1.glpiRequestV1).toHaveBeenCalledWith('GET', '/KnowbaseItem', {
      params: {
        'searchText[is_faq]': '1',
        language: 'pt_BR'
      },
      headers: {}
    });
    expect(result.content[0].text).toContain('"FAQ Geral"');
  });
});
