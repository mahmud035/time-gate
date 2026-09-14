import { api } from '@/api/axios.ts';
import type { ApiResponse } from '@/api/types.ts';
import type { IssuedCode, PublicUser } from './user.types.ts';

export const userApi = {
  list: async (): Promise<PublicUser[]> => {
    const response = await api.get<ApiResponse<{ users: PublicUser[] }>>('/users');

    return response.data.data.users;
  },

  create: async (input: { name: string; payrollRef?: string }): Promise<IssuedCode> => {
    const response = await api.post<ApiResponse<IssuedCode>>('/users', input);

    return response.data.data;
  },

  update: async (
    id: string,
    changes: { name?: string; payrollRef?: string | null; isActive?: boolean },
  ): Promise<PublicUser> => {
    const response = await api.patch<ApiResponse<{ user: PublicUser }>>(
      `/users/${id}`,
      changes,
    );

    return response.data.data.user;
  },

  resetCode: async (id: string): Promise<IssuedCode> => {
    const response = await api.post<ApiResponse<IssuedCode>>(`/users/${id}/code`, {});

    return response.data.data;
  },
};
