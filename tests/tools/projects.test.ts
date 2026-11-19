import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { projectTools } from '../../src/tools/projects.js';
import * as clientV1 from '../../src/clientV1.js';

vi.mock('../../src/clientV1.js', () => ({
  glpiRequestV1: vi.fn()
}));

function getTool(name: string) {
  const found = projectTools.find(t => t.tool.name === name);
  if (!found) throw new Error(`Tool ${name} not found`);
  return found;
}

describe('Project Tools (API v1)', () => {
  beforeEach(() => {
    vi.mocked(clientV1.glpiRequestV1).mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should export all 10 project tools and no delete tools', () => {
    expect(projectTools).toHaveLength(10);
    const names = projectTools.map(t => t.tool.name);
    expect(names).toEqual([
      'glpi_search_projects',
      'glpi_get_project',
      'glpi_create_project',
      'glpi_update_project',
      'glpi_create_project_task',
      'glpi_update_project_task',
      'glpi_link_project_itil',
      'glpi_link_task_ticket',
      'glpi_add_project_team',
      'glpi_list_project_states'
    ]);
    expect(names.some(n => n.includes('delete'))).toBe(false);
  });

  it('glpi_search_projects should send GET /Project with expand_dropdowns, pagination and searchText', async () => {
    const tool = getTool('glpi_search_projects');
    vi.mocked(clientV1.glpiRequestV1).mockResolvedValueOnce([{ id: 1, name: 'Migração ERP' }]);

    const result = await tool.handler({ start: 5, limit: 10, searchText: 'ERP' });

    expect(clientV1.glpiRequestV1).toHaveBeenCalledWith('GET', '/Project', {
      params: {
        expand_dropdowns: true,
        range: '5-14',
        'searchText[name]': 'ERP'
      },
      headers: {
        Range: '5-14'
      }
    });
    expect(JSON.parse(result.content[0].text)).toEqual([{ id: 1, name: 'Migração ERP' }]);
  });

  it('glpi_search_projects should work without pagination or searchText', async () => {
    const tool = getTool('glpi_search_projects');
    vi.mocked(clientV1.glpiRequestV1).mockResolvedValueOnce([]);

    await tool.handler({});

    expect(clientV1.glpiRequestV1).toHaveBeenCalledWith('GET', '/Project', {
      params: { expand_dropdowns: true },
      headers: {}
    });
  });

  it('glpi_get_project should fetch project and subitems in parallel', async () => {
    const tool = getTool('glpi_get_project');
    vi.mocked(clientV1.glpiRequestV1)
      .mockResolvedValueOnce({ id: 7, name: 'Projeto Alpha' })
      .mockResolvedValueOnce([{ id: 10, name: 'Tarefa 1' }])
      .mockResolvedValueOnce([{ id: 20, itemtype: 'User', items_id: 2 }])
      .mockResolvedValueOnce([{ id: 30, itemtype: 'Ticket', items_id: 99 }]);

    const result = await tool.handler({ id: 7 });

    expect(clientV1.glpiRequestV1).toHaveBeenCalledWith('GET', '/Project/7', {
      params: { expand_dropdowns: true }
    });
    expect(clientV1.glpiRequestV1).toHaveBeenCalledWith('GET', '/Project/7/ProjectTask');
    expect(clientV1.glpiRequestV1).toHaveBeenCalledWith('GET', '/Project/7/ProjectTeam');
    expect(clientV1.glpiRequestV1).toHaveBeenCalledWith('GET', '/Project/7/Itil_Project');

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({
      project: { id: 7, name: 'Projeto Alpha' },
      tasks: [{ id: 10, name: 'Tarefa 1' }],
      team: [{ id: 20, itemtype: 'User', items_id: 2 }],
      itil: [{ id: 30, itemtype: 'Ticket', items_id: 99 }]
    });
  });

  it('glpi_get_project should tolerate subitem failures and store error string in field', async () => {
    const tool = getTool('glpi_get_project');
    vi.mocked(clientV1.glpiRequestV1)
      .mockResolvedValueOnce({ id: 7, name: 'Projeto Alpha' })
      .mockRejectedValueOnce(new Error('403 Forbidden on ProjectTask'))
      .mockResolvedValueOnce([{ id: 20, itemtype: 'User', items_id: 2 }])
      .mockRejectedValueOnce('Network failure');

    const result = await tool.handler({ id: 7 });
    const parsed = JSON.parse(result.content[0].text);

    expect(parsed.project).toEqual({ id: 7, name: 'Projeto Alpha' });
    expect(parsed.tasks).toBe('403 Forbidden on ProjectTask');
    expect(parsed.team).toEqual([{ id: 20, itemtype: 'User', items_id: 2 }]);
    expect(parsed.itil).toBe('Network failure');
  });

  it('glpi_create_project should POST /Project with { input } and strip unknown keys', async () => {
    const tool = getTool('glpi_create_project');
    vi.mocked(clientV1.glpiRequestV1).mockResolvedValueOnce({ id: 12, message: 'Item adicionado' });

    const result = await tool.handler({
      name: 'Novo Projeto',
      code: 'PRJ-01',
      entities_id: 0,
      is_recursive: 1,
      projectstates_id: 2,
      projecttypes_id: 1,
      projects_id: 0,
      users_id: 5,
      groups_id: 3,
      plan_start_date: '2026-01-10 08:00:00',
      plan_end_date: '2026-06-30 18:00:00',
      real_start_date: '2026-01-12 09:00:00',
      real_end_date: '2026-07-01 17:00:00',
      percent_done: 25,
      auto_percent_done: 0,
      show_on_global_gantt: 1,
      priority: 3,
      content: 'Descrição do projeto',
      comment: 'Observação',
      unknown_field: 'should_be_ignored',
      extra_secret: 999
    });

    expect(clientV1.glpiRequestV1).toHaveBeenCalledWith('POST', '/Project', {
      body: {
        input: {
          name: 'Novo Projeto',
          code: 'PRJ-01',
          entities_id: 0,
          is_recursive: 1,
          projectstates_id: 2,
          projecttypes_id: 1,
          projects_id: 0,
          users_id: 5,
          groups_id: 3,
          plan_start_date: '2026-01-10 08:00:00',
          plan_end_date: '2026-06-30 18:00:00',
          real_start_date: '2026-01-12 09:00:00',
          real_end_date: '2026-07-01 17:00:00',
          percent_done: 25,
          auto_percent_done: 0,
          show_on_global_gantt: 1,
          priority: 3,
          content: 'Descrição do projeto',
          comment: 'Observação'
        }
      }
    });
    expect(JSON.parse(result.content[0].text)).toEqual({ id: 12, message: 'Item adicionado' });
  });

  it('glpi_update_project should PUT /Project/{id} with { input } and strip unknown keys', async () => {
    const tool = getTool('glpi_update_project');
    vi.mocked(clientV1.glpiRequestV1).mockResolvedValueOnce([{ '12': true }]);

    await tool.handler({
      id: 12,
      percent_done: 80,
      projectstates_id: 3,
      invalid_key: 'drop-me'
    });

    expect(clientV1.glpiRequestV1).toHaveBeenCalledWith('PUT', '/Project/12', {
      body: {
        input: {
          percent_done: 80,
          projectstates_id: 3
        }
      }
    });
  });

  it('glpi_update_project should throw error if no known fields besides id are provided', async () => {
    const tool = getTool('glpi_update_project');

    await expect(tool.handler({ id: 12 })).rejects.toThrow();
    await expect(tool.handler({ id: 12, unknown_only: 'x' })).rejects.toThrow();
    expect(clientV1.glpiRequestV1).not.toHaveBeenCalled();
  });

  it('glpi_create_project_task should POST /ProjectTask with { input } and strip unknown keys', async () => {
    const tool = getTool('glpi_create_project_task');
    vi.mocked(clientV1.glpiRequestV1).mockResolvedValueOnce({ id: 55 });

    const result = await tool.handler({
      name: 'Configurar banco',
      projects_id: 12,
      projecttasks_id: 0,
      projectstates_id: 1,
      projecttasktypes_id: 2,
      entities_id: 0,
      plan_start_date: '2026-02-01 08:00:00',
      plan_end_date: '2026-02-05 18:00:00',
      real_start_date: '2026-02-01 09:00:00',
      real_end_date: '2026-02-04 16:00:00',
      percent_done: 50,
      auto_percent_done: 0,
      is_milestone: 1,
      content: 'Detalhes da tarefa',
      comment: 'Nota',
      extraneous: true
    });

    expect(clientV1.glpiRequestV1).toHaveBeenCalledWith('POST', '/ProjectTask', {
      body: {
        input: {
          name: 'Configurar banco',
          projects_id: 12,
          projecttasks_id: 0,
          projectstates_id: 1,
          projecttasktypes_id: 2,
          entities_id: 0,
          plan_start_date: '2026-02-01 08:00:00',
          plan_end_date: '2026-02-05 18:00:00',
          real_start_date: '2026-02-01 09:00:00',
          real_end_date: '2026-02-04 16:00:00',
          percent_done: 50,
          auto_percent_done: 0,
          is_milestone: 1,
          content: 'Detalhes da tarefa',
          comment: 'Nota'
        }
      }
    });
    expect(JSON.parse(result.content[0].text)).toEqual({ id: 55 });
  });

  it('glpi_update_project_task should PUT /ProjectTask/{id} with { input } and strip unknown keys', async () => {
    const tool = getTool('glpi_update_project_task');
    vi.mocked(clientV1.glpiRequestV1).mockResolvedValueOnce([{ '55': true }]);

    await tool.handler({
      id: 55,
      percent_done: 100,
      is_milestone: 0,
      bogus: 'ignored'
    });

    expect(clientV1.glpiRequestV1).toHaveBeenCalledWith('PUT', '/ProjectTask/55', {
      body: {
        input: {
          percent_done: 100,
          is_milestone: 0
        }
      }
    });
  });

  it('glpi_update_project_task should throw error if no known fields besides id are provided', async () => {
    const tool = getTool('glpi_update_project_task');

    await expect(tool.handler({ id: 55 })).rejects.toThrow();
    await expect(tool.handler({ id: 55, invalid: 123 })).rejects.toThrow();
    expect(clientV1.glpiRequestV1).not.toHaveBeenCalled();
  });

  it('glpi_link_project_itil should POST /Itil_Project with { input } and strip unknown keys', async () => {
    const tool = getTool('glpi_link_project_itil');
    vi.mocked(clientV1.glpiRequestV1).mockResolvedValueOnce({ id: 77 });

    const result = await tool.handler({
      projects_id: 12,
      itemtype: 'Ticket',
      items_id: 345,
      extra: 'nope'
    });

    expect(clientV1.glpiRequestV1).toHaveBeenCalledWith('POST', '/Itil_Project', {
      body: {
        input: {
          projects_id: 12,
          itemtype: 'Ticket',
          items_id: 345
        }
      }
    });
    expect(JSON.parse(result.content[0].text)).toEqual({ id: 77 });
  });

  it('glpi_link_task_ticket should POST /ProjectTask_Ticket with { input } and strip unknown keys', async () => {
    const tool = getTool('glpi_link_task_ticket');
    vi.mocked(clientV1.glpiRequestV1).mockResolvedValueOnce({ id: 88 });

    const result = await tool.handler({
      projecttasks_id: 55,
      tickets_id: 345,
      unrelated: 'ignore'
    });

    expect(clientV1.glpiRequestV1).toHaveBeenCalledWith('POST', '/ProjectTask_Ticket', {
      body: {
        input: {
          projecttasks_id: 55,
          tickets_id: 345
        }
      }
    });
    expect(JSON.parse(result.content[0].text)).toEqual({ id: 88 });
  });

  it('glpi_add_project_team should POST /ProjectTeam with { input } and strip unknown keys', async () => {
    const tool = getTool('glpi_add_project_team');
    vi.mocked(clientV1.glpiRequestV1).mockResolvedValueOnce({ id: 99 });

    const result = await tool.handler({
      projects_id: 12,
      itemtype: 'Group',
      items_id: 4,
      injected: 'no'
    });

    expect(clientV1.glpiRequestV1).toHaveBeenCalledWith('POST', '/ProjectTeam', {
      body: {
        input: {
          projects_id: 12,
          itemtype: 'Group',
          items_id: 4
        }
      }
    });
    expect(JSON.parse(result.content[0].text)).toEqual({ id: 99 });
  });

  it('glpi_list_project_states should GET /ProjectState', async () => {
    const tool = getTool('glpi_list_project_states');
    vi.mocked(clientV1.glpiRequestV1).mockResolvedValueOnce([
      { id: 1, name: 'Em processamento' },
      { id: 2, name: 'Concluído' }
    ]);

    const result = await tool.handler({});

    expect(clientV1.glpiRequestV1).toHaveBeenCalledWith('GET', '/ProjectState');
    expect(JSON.parse(result.content[0].text)).toEqual([
      { id: 1, name: 'Em processamento' },
      { id: 2, name: 'Concluído' }
    ]);
  });
});
