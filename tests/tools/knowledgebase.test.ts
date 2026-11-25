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

  it('should export all 6 tools', () => {
    expect(kbTools.length).toBe(6);
    const names = kbTools.map(t => t.tool.name);
    expect(names).toEqual([
      'glpi_search_knowbase',
      'glpi_get_knowbase_item',
      'glpi_search_faq',
      'glpi_create_knowbase_item',
      'glpi_update_knowbase_item',
      'glpi_delete_knowbase_item'
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

  it('glpi_create_knowbase_item should post new article', async () => {
    const createTool = kbTools.find(t => t.tool.name === 'glpi_create_knowbase_item');
    vi.mocked(clientV1.glpiRequestV1).mockResolvedValueOnce({ id: 20, message: 'Item successfully added' });

    const result = await createTool!.handler({
      name: 'Novo Artigo',
      answer: '<p>Conteudo</p>',
      is_faq: 1
    });

    expect(clientV1.glpiRequestV1).toHaveBeenCalledWith('POST', '/KnowbaseItem', {
      body: {
        input: {
          entities_id: 0,
          is_recursive: 1,
          name: 'Novo Artigo',
          answer: '<p>Conteudo</p>',
          is_faq: 1
        }
      }
    });
    expect(result.content[0].text).toContain('"Item successfully added"');
  });

  it('glpi_update_knowbase_item should put updated fields', async () => {
    const updateTool = kbTools.find(t => t.tool.name === 'glpi_update_knowbase_item');
    vi.mocked(clientV1.glpiRequestV1).mockResolvedValueOnce([{ 16: true, message: 'Item successfully updated' }]);

    const result = await updateTool!.handler({
      id: 16,
      name: 'Artigo Atualizado',
      answer: '<p>Novo conteudo</p>'
    });

    expect(clientV1.glpiRequestV1).toHaveBeenCalledWith('PUT', '/KnowbaseItem/16', {
      body: {
        input: {
          id: 16,
          name: 'Artigo Atualizado',
          answer: '<p>Novo conteudo</p>'
        }
      }
    });
    expect(result.content[0].text).toContain('Item successfully updated');
  });

  it('glpi_delete_knowbase_item should delete article', async () => {
    const deleteTool = kbTools.find(t => t.tool.name === 'glpi_delete_knowbase_item');
    vi.mocked(clientV1.glpiRequestV1).mockResolvedValueOnce([{ 16: true, message: 'Item successfully deleted' }]);

    const result = await deleteTool!.handler({ id: 16, force: true });

    expect(clientV1.glpiRequestV1).toHaveBeenCalledWith('DELETE', '/KnowbaseItem/16', {
      params: { force_purge: true }
    });
    expect(result.content[0].text).toContain('Item successfully deleted');
  });
});
