import { apiClient } from './client';
import { Workflow, ValidationResult } from '../types';

export const workflowsApi = {
  list: (params?: { search?: string; status?: string; trigger_type?: string }): Promise<Workflow[]> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.trigger_type) query.append('trigger_type', params.trigger_type);
    const qs = query.toString();
    return apiClient<Workflow[]>(`/workflows${qs ? `?${qs}` : ''}`);
  },

  get: (id: string): Promise<Workflow> => apiClient<Workflow>(`/workflows/${id}`),

  create: (data: { name: string; description?: string; trigger_type?: string; definition_json?: any }): Promise<Workflow> =>
    apiClient<Workflow>('/workflows', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Workflow>): Promise<Workflow> =>
    apiClient<Workflow>(`/workflows/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<{ message: string }> =>
    apiClient<{ message: string }>(`/workflows/${id}`, {
      method: 'DELETE',
    }),

  activate: (id: string): Promise<Workflow> =>
    apiClient<Workflow>(`/workflows/${id}/activate`, {
      method: 'POST',
    }),

  deactivate: (id: string): Promise<Workflow> =>
    apiClient<Workflow>(`/workflows/${id}/deactivate`, {
      method: 'POST',
    }),

  duplicate: (id: string): Promise<Workflow> =>
    apiClient<Workflow>(`/workflows/${id}/duplicate`, {
      method: 'POST',
    }),

  validate: (id: string): Promise<ValidationResult> =>
    apiClient<ValidationResult>(`/workflows/${id}/validate`, {
      method: 'POST',
    }),
};
