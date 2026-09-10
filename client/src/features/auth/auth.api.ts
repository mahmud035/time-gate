import { api } from '@/api/axios.ts';
import type { ApiResponse } from '@/api/types.ts';
import type { LoginCredentials, SessionPayload } from './auth.types.ts';

/**
 * No token is ever read or stored here — the server sets HttpOnly cookies the
 * browser attaches on its own. There is deliberately nothing for JavaScript to
 * steal.
 */
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<SessionPayload> => {
    const response = await api.post<ApiResponse<SessionPayload>>(
      '/auth/login',
      credentials,
    );

    return response.data.data;
  },

  me: async (): Promise<SessionPayload> => {
    const response = await api.get<ApiResponse<SessionPayload>>('/auth/me');

    return response.data.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },
};
