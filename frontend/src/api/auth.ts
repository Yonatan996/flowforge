import { apiClient } from './client';
import { AuthResponse, User } from '../types';

export const authApi = {
  register: (email: string, password: string): Promise<AuthResponse> =>
    apiClient<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  login: (email: string, password: string): Promise<AuthResponse> =>
    apiClient<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: (): Promise<{ message: string }> =>
    apiClient<{ message: string }>('/auth/logout', {
      method: 'POST',
    }),

  me: (): Promise<User> => apiClient<User>('/auth/me'),
};
