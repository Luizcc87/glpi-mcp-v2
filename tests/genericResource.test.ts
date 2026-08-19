import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeItemtypeHandlers } from '../src/resources/genericResource.js';
import * as client from '../src/client.js';

vi.mock('../src/client.js', () => ({
  glpiRequest: vi.fn()
}));

describe('genericResource', () => {
  beforeEach(() => {
    vi.mocked(client.glpiRequest).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call list correctly', async () => {
    const handlers = makeItemtypeHandlers('Ticket');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([{ id: 1 }]);
    
    const result = await handlers.list({ limit: 10 });
    
    expect(result).toEqual([{ id: 1 }]);
    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assistance/Ticket', { params: { limit: 10 } });
  });

  it('should call get correctly', async () => {
    const handlers = makeItemtypeHandlers('Problem');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce({ id: 42 });
    
    const result = await handlers.get(42);
    
    expect(result).toEqual({ id: 42 });
    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assistance/Problem/42', { params: undefined });
  });

  it('should call create correctly', async () => {
    const handlers = makeItemtypeHandlers('Change');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce({ id: 100 });
    
    const result = await handlers.create({ name: 'New Change' });
    
    expect(result).toEqual({ id: 100 });
    expect(client.glpiRequest).toHaveBeenCalledWith('POST', '/Assistance/Change', { body: { name: 'New Change' } });
  });

  it('should call update correctly', async () => {
    const handlers = makeItemtypeHandlers('Ticket');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce({ id: 1 });
    
    const result = await handlers.update(1, { status: 2 });
    
    expect(result).toEqual({ id: 1 });
    expect(client.glpiRequest).toHaveBeenCalledWith('PATCH', '/Assistance/Ticket/1', { body: { status: 2 } });
  });

  it('should call remove correctly', async () => {
    const handlers = makeItemtypeHandlers('Ticket');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce({});
    
    await handlers.remove(1);
    
    expect(client.glpiRequest).toHaveBeenCalledWith('DELETE', '/Assistance/Ticket/1');
  });

  it('should call getTimeline correctly', async () => {
    const handlers = makeItemtypeHandlers('Ticket');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([{ id: 1, type: 'Followup' }]);
    
    const result = await handlers.getTimeline(1);
    
    expect(result).toEqual([{ id: 1, type: 'Followup' }]);
    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assistance/Ticket/1/Timeline', { params: undefined });
  });

  it('should call getCost correctly', async () => {
    const handlers = makeItemtypeHandlers('Ticket');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([{ id: 1, cost: 10 }]);
    
    const result = await handlers.getCost(1);
    
    expect(result).toEqual([{ id: 1, cost: 10 }]);
    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assistance/Ticket/1/Cost', { params: undefined });
  });

  it('should call getTeamMember correctly', async () => {
    const handlers = makeItemtypeHandlers('Ticket');
    vi.mocked(client.glpiRequest).mockResolvedValueOnce([{ id: 1, type: 'User' }]);
    
    const result = await handlers.getTeamMember(1);
    
    expect(result).toEqual([{ id: 1, type: 'User' }]);
    expect(client.glpiRequest).toHaveBeenCalledWith('GET', '/Assistance/Ticket/1/TeamMember', { params: undefined });
  });
});
