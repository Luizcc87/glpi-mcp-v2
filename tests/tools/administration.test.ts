import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { adminTools } from '../../src/tools/administration.js';
import * as client from '../../src/client.js';
import * as clientV1 from '../../src/clientV1.js';

vi.mock('../../src/client.js', () => ({
  glpiRequest: vi.fn()
}));

vi.mock('../../src/clientV1.js', () => ({
  glpiRequestV1: vi.fn()
}));

describe('Administration Tools', () => {
  beforeEach(() => {
    vi.mocked(client.glpiRequest).mockReset();
    vi.mocked(clientV1.glpiRequestV1).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export all 4 tools', () => {
    expect(adminTools.length).toBe(4);
    const names = adminTools.map(t => t.tool.name);
    expect(names).toEqual([
      'glpi_search_user',
      'glpi_get_user_context',
      'glpi_list_groups',
      'glpi_list_plugins'
    ]);
  });

  it('glpi_search_user should call list and return formatted result', async () => {
    const searchTool = adminTools.find(t => t.tool.name === 'glpi_search_user');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([{ id: 1, name: 'John Doe' }]);

    const result = await searchTool!.handler({ start: 0, limit: 10, filter: 'name=John' });

    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Administration/User', { params: { start: 0, limit: 10, filter: 'name=John' } });
    expect(result.content[0].text).toContain('"John Doe"');
  });

  it('glpi_list_groups should call list and return formatted result', async () => {
    const listTool = adminTools.find(t => t.tool.name === 'glpi_list_groups');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([{ id: 1, name: 'Support' }]);

    const result = await listTool!.handler({ start: 0, limit: 10, filter: 'name=Support' });

    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Administration/Group', { params: { start: 0, limit: 10, filter: 'name=Support' } });
    expect(result.content[0].text).toContain('"Support"');
  });

  it('glpi_get_user_context should call get and sub-resources and return formatted result', async () => {
    const getTool = adminTools.find(t => t.tool.name === 'glpi_get_user_context');
    
    vi.mocked(client.glpiRequest).mockResolvedValueOnce({ id: 1, name: 'John Doe' });
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([{ id: 10, name: 'Computer A' }]);
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([{ id: 20, name: 'Software B' }]);

    const result = await getTool!.handler({ id: 1 });

    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Administration/User/1');
    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Administration/User/1/UsedItem');
    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Administration/User/1/ManagedItem');
    
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.name).toBe('John Doe');
    expect(parsed.usedItems[0].name).toBe('Computer A');
    expect(parsed.managedItems[0].name).toBe('Software B');
  });

  it('glpi_get_user_context should ignore sub-resources failures', async () => {
    const getTool = adminTools.find(t => t.tool.name === 'glpi_get_user_context');
    
    vi.mocked(client.glpiRequest).mockResolvedValueOnce({ id: 1, name: 'John Doe' });
    vi.mocked(client.glpiRequest).mockRejectedValue(new Error("Not found"));

    const result = await getTool!.handler({ id: 1 });
    
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.name).toBe('John Doe');
    expect(parsed.usedItems.length).toBe(0);
    expect(parsed.managedItems.length).toBe(0);
  });

  it('glpi_list_plugins should query /Setup/Plugin via v2 API', async () => {
    const pluginsTool = adminTools.find(t => t.tool.name === 'glpi_list_plugins');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([
      { id: 1, key: 'formcreator', name: 'Form Creator', version: '2.13.0', is_active: true }
    ]);

    const result = await pluginsTool!.handler({ limit: 10 });

    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Setup/Plugin', { params: { limit: 10 } });
    expect(result.content[0].text).toContain('Form Creator');
  });

  it('glpi_list_plugins should fallback to v1 API /Plugin on v2 failure', async () => {
    const pluginsTool = adminTools.find(t => t.tool.name === 'glpi_list_plugins');
    vi.mocked(client.glpiRequest).mockRejectedValueOnce(new Error('404 Not Found'));
    vi.mocked(clientV1.glpiRequestV1).mockResolvedValueOnce([
      { id: 1, directory: 'formcreator', name: 'Form Creator', version: '2.13.0', state: 1 }
    ]);

    const result = await pluginsTool!.handler({});

    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Setup/Plugin', { params: {} });
    expect(clientV1.glpiRequestV1).toHaveBeenCalledWith('GET', '/Plugin', { params: {} });
    expect(result.content[0].text).toContain('Form Creator');
  });
});
