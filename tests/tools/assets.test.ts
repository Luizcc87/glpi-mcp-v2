import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { assetTools } from '../../src/tools/assets.js';
import * as client from '../../src/client.js';

vi.mock('../../src/client.js', () => ({
  glpiRequest: vi.fn()
}));

describe('Assets Tools', () => {
  beforeEach(() => {
    vi.mocked(client.glpiRequest).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export all 2 tools', () => {
    expect(assetTools.length).toBe(2);
    const names = assetTools.map(t => t.tool.name);
    expect(names).toEqual([
      'glpi_list_computers',
      'glpi_get_computer'
    ]);
  });

  it('glpi_list_computers should call list and return formatted result', async () => {
    const listTool = assetTools.find(t => t.tool.name === 'glpi_list_computers');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([{ id: 1, name: 'Computer A' }]);

    const result = await listTool!.handler({ start: 0, limit: 10, filter: 'name=Computer' });

    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assets/Computer', { params: { start: 0, limit: 10, filter: 'name=Computer' } });
    expect(result.content[0].text).toContain('"Computer A"');
  });

  it('glpi_list_computers with include_specs should call sub-resources', async () => {
    const listTool = assetTools.find(t => t.tool.name === 'glpi_list_computers');
    // List returns 1 computer
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([{ id: 1, name: 'Computer A' }]);
    // 6 specs calls per computer
    for (let i = 0; i < 6; i++) {
        vi.mocked(client.glpiRequest).mockResolvedValueOnce([]);
    }

    const result = await listTool!.handler({ include_specs: true });

    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assets/Computer', { params: {} });
    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assets/Computer/1/Component/Processor');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed[0].specs.processors).toEqual([]);
  });

  it('glpi_get_computer should call get and sub-resources and return formatted result', async () => {
    const getTool = assetTools.find(t => t.tool.name === 'glpi_get_computer');
    
    // 1st call for computer
    vi.mocked(client.glpiRequest).mockResolvedValueOnce({ id: 1, name: 'Computer A' });
    
    // Next 6 calls for specs
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([{ name: 'Intel i7' }]); // processors
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([{ name: '16GB' }]);     // memory
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([]);                     // hardDrives
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([]);                     // drives
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([]);                     // networkCards
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([]);                     // software

    const result = await getTool!.handler({ id: 1 });

    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assets/Computer/1');
    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assets/Computer/1/Component/Processor');
    
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.name).toBe('Computer A');
    expect(parsed.specs.processors[0].name).toBe('Intel i7');
    expect(parsed.specs.memory[0].name).toBe('16GB');
  });

  it('glpi_get_computer should ignore sub-resources failures', async () => {
    const getTool = assetTools.find(t => t.tool.name === 'glpi_get_computer');
    
    vi.mocked(client.glpiRequest).mockResolvedValueOnce({ id: 1, name: 'Computer A' });
    // Make specs fail
    vi.mocked(client.glpiRequest).mockRejectedValue(new Error("Not found"));

    const result = await getTool!.handler({ id: 1 });
    
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.name).toBe('Computer A');
    // Failed requests just leave specs as undefined/empty object
    expect(Object.keys(parsed.specs).length).toBe(0);
  });
});
