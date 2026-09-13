import { api } from '@/api/axios.ts';
import type { ApiResponse } from '@/api/types.ts';
import type { PunchAction, PunchResult, StaffStatus } from './punch.types.ts';

/**
 * Both calls carry the slug and the code in the body rather than the URL.
 *
 * Staff hold no session, so the code authenticates each request on its own; in
 * a query string it would end up in server logs and browser history instead.
 */
export const punchApi = {
  lookup: async (slug: string, code: string): Promise<StaffStatus> => {
    const response = await api.post<ApiResponse<StaffStatus>>('/punch/lookup', {
      slug,
      code,
    });

    return response.data.data;
  },

  punch: async (input: {
    slug: string;
    code: string;
    action: PunchAction;
    idempotencyKey: string;
  }): Promise<PunchResult> => {
    const response = await api.post<ApiResponse<PunchResult>>('/punch', input);

    return response.data.data;
  },
};
