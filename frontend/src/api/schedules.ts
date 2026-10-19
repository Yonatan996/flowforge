import { apiClient } from './client';
import { ScheduledJob } from '../types';

export const schedulesApi = {
  list: (): Promise<ScheduledJob[]> => apiClient<ScheduledJob[]>('/schedules'),
};
