import { glpiRequest } from '../client.js';

export type Itemtype = 'Ticket' | 'Problem' | 'Change';

export interface GenericHandlers<T = any> {
  list(params?: Record<string, any>): Promise<T[]>;
  get(id: number | string, params?: Record<string, any>): Promise<T>;
  create(data: any): Promise<T>;
  update(id: number | string, data: any): Promise<T>;
  remove(id: number | string): Promise<void>;
  getTimeline(id: number | string, params?: Record<string, any>): Promise<any[]>;
  getCost(id: number | string, params?: Record<string, any>): Promise<any[]>;
  getTeamMember(id: number | string, params?: Record<string, any>): Promise<any[]>;
}

export function makeItemtypeHandlers<T = any>(itemtype: Itemtype): GenericHandlers<T> {
  const basePath = `/Assistance/${itemtype}`;

  return {
    list: (params) => glpiRequest<T[]>('GET', basePath, { params }),
    get: (id, params) => glpiRequest<T>('GET', `${basePath}/${id}`, { params }),
    create: (data) => glpiRequest<T>('POST', basePath, { body: data }),
    update: (id, data) => glpiRequest<T>('PATCH', `${basePath}/${id}`, { body: data }),
    remove: (id) => glpiRequest<void>('DELETE', `${basePath}/${id}`),
    getTimeline: (id, params) => glpiRequest<any[]>('GET', `${basePath}/${id}/Timeline`, { params }),
    getCost: (id, params) => glpiRequest<any[]>('GET', `${basePath}/${id}/Cost`, { params }),
    getTeamMember: (id, params) => glpiRequest<any[]>('GET', `${basePath}/${id}/TeamMember`, { params }),
  };
}
