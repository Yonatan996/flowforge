import { apiClient } from './client';
import { Execution, ExecutionStep } from '../types';

export const executionsApi = {
  list: (params?: { workflow_id?: string; status?: string }): Promise<Execution[]> => {
    const query = new URLSearchParams();
    if (params?.workflow_id) query.append('workflow_id', params.workflow_id);
    if (params?.status) query.append('status', params.status);
    const qs = query.toString();
    return apiClient<Execution[]>(`/executions${qs ? `?${qs}` : ''}`);
  },

  get: (id: string): Promise<Execution> => apiClient<Execution>(`/executions/${id}`),

  getSteps: (id: string): Promise<ExecutionStep[]> => apiClient<ExecutionStep[]>(`/executions/${id}/steps`),

  run: (workflowId: string, payload: Record<string, any> = {}): Promise<Execution> =>
    apiClient<Execution>(`/workflows/${workflowId}/run`, {
      method: 'POST',
      body: JSON.stringify({ payload }),
    }),

  retry: (executionId: string): Promise<Execution> =>
    apiClient<Execution>(`/executions/${executionId}/retry`, {
      method: 'POST',
    }),
};
