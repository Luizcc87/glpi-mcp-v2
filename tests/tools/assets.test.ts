import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { assetTools } from '../../src/tools/assets.js';
import * as client from '../../src/client.js';
import * as clientV1 from '../../src/clientV1.js';

vi.mock('../../src/client.js', () => ({
  glpiRequest: vi.fn()
}));

vi.mock('../../src/clientV1.js', () => ({
  glpiRequestV1: vi.fn()
}));

const v1Computer = {
  id: 1,
  _softwares: [
    { softwares_id: 'Sysmo S1', softwareversions_id: '2.86.06.000', softwarecategories_id: 0, is_dynamic: 1, is_valid: 1, links: [] },
    { softwares_id: 'Google Chrome', softwareversions_id: '156.0', softwarecategories_id: 'Aplicativos', is_dynamic: 1, is_valid: 1, links: [] }
  ]
};

describe('Assets Tools', () => {
  beforeEach(() => {
    vi.mocked(client.glpiRequest).mockReset();
    vi.mocked(clientV1.glpiRequestV1).mockReset();
    vi.mocked(clientV1.glpiRequestV1).mockResolvedValue(v1Computer);
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
    // 5 component calls per computer (software vem da v1)
    for (let i = 0; i < 5; i++) {
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
    
    // Next 5 calls for components
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([{ name: 'Intel i7' }]); // processors
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([{ name: '16GB' }]);     // memory
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([]);                     // hardDrives
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([]);                     // drives
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([]);                     // networkCards

    const result = await getTool!.handler({ id: 1 });

    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assets/Computer/1');
    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assets/Computer/1/Component/Processor');
    expect(clientV1.glpiRequestV1).toHaveBeenCalledWith('GET', '/Computer/1', { params: { with_softwares: true, expand_dropdowns: true } });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.name).toBe('Computer A');
    expect(parsed.specs.processors[0].name).toBe('Intel i7');
    expect(parsed.specs.memory[0].name).toBe('16GB');
    expect(parsed.specs.software).toEqual([
      { name: 'Sysmo S1', version: '2.86.06.000', category: null, is_dynamic: true, is_valid: true },
      { name: 'Google Chrome', version: '156.0', category: 'Aplicativos', is_dynamic: true, is_valid: true }
    ]);
  });

  it('glpi_get_computer should filter software by name', async () => {
    const getTool = assetTools.find(t => t.tool.name === 'glpi_get_computer');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce({ id: 1, name: 'Computer A' });
    vi.mocked(client.glpiRequest).mockResolvedValue([]);

    const result = await getTool!.handler({ id: 1, software_filter: 'sysmo' });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.specs.software).toHaveLength(1);
    expect(parsed.specs.software[0].name).toBe('Sysmo S1');
  });

  it('glpi_get_computer should report software errors instead of hiding them', async () => {
    const getTool = assetTools.find(t => t.tool.name === 'glpi_get_computer');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce({ id: 1, name: 'Computer A' });
    vi.mocked(client.glpiRequest).mockResolvedValue([]);
    vi.mocked(clientV1.glpiRequestV1).mockRejectedValue(new Error('GLPI_API_V1_APP_TOKEN e GLPI_API_V1_USER_TOKEN são necessários'));

    const result = await getTool!.handler({ id: 1 });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.specs.software).toBeUndefined();
    expect(parsed.specs.software_error).toContain('GLPI_API_V1_APP_TOKEN');
  });

  it('glpi_get_computer should ignore sub-resources failures', async () => {
    const getTool = assetTools.find(t => t.tool.name === 'glpi_get_computer');
    
    vi.mocked(client.glpiRequest).mockResolvedValueOnce({ id: 1, name: 'Computer A' });
    // Make component specs fail
    vi.mocked(client.glpiRequest).mockRejectedValue(new Error("Not found"));

    const result = await getTool!.handler({ id: 1 });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.name).toBe('Computer A');
    // Failed component requests are omitted; software still comes from v1
    expect(Object.keys(parsed.specs)).toEqual(['software']);
  });
});
