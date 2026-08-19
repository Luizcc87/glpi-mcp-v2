import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { statsTools } from '../../src/tools/statistics.js';
import * as client from '../../src/client.js';

vi.mock('../../src/client.js', () => ({
  glpiRequest: vi.fn()
}));

describe('Statistics Tools', () => {
  beforeEach(() => {
    vi.mocked(client.glpiRequest).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export 1 tool', () => {
    expect(statsTools.length).toBe(1);
    const names = statsTools.map(t => t.tool.name);
    expect(names).toEqual([
      'glpi_get_asset_stats'
    ]);
  });

  it('glpi_get_asset_stats should call correct path and return formatted result', async () => {
    const statsTool = statsTools.find(t => t.tool.name === 'glpi_get_asset_stats');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce({ total: 10 });

    const result = await statsTool!.handler({ itemtype: 'Ticket', date_start: '2024-01-01' });

    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assistance/Stat/Ticket/Asset', { params: { date_start: '2024-01-01' } });
    expect(result.content[0].text).toContain('"total": 10');
  });
});
