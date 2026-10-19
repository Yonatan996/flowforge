import { apiClient } from './client';
import { DashboardSummary, ExecutionTrendPoint } from '../types';

export const dashboardApi = {
  getSummary: (): Promise<DashboardSummary> => apiClient<DashboardSummary>('/dashboard/summary'),

  getTrends: (days: number = 7): Promise<ExecutionTrendPoint[]> =>
    apiClient<ExecutionTrendPoint[]>(`/dashboard/execution-trends?days=${days}`),
};
