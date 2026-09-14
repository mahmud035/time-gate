import { api } from '@/api/axios.ts';
import type { ApiResponse } from '@/api/types.ts';
import type { PunchType } from '@/features/punch/punch.types.ts';
import type { Timesheet, TodayEntry } from './timesheet.types.ts';

export const timesheetApi = {
  today: async (): Promise<TodayEntry[]> => {
    const response = await api.get<ApiResponse<{ staff: TodayEntry[] }>>(
      '/timesheet/today',
    );

    return response.data.data.staff;
  },

  range: async (from: string, to: string): Promise<Timesheet> => {
    const response = await api.get<ApiResponse<Timesheet>>('/timesheet', {
      params: { from, to },
    });

    return response.data.data;
  },

  /**
   * The export is a file, not an envelope, so it comes back as a blob and is
   * handed to the browser directly rather than through the response unwrapping
   * every other call uses.
   */
  exportCsv: async (from: string, to: string): Promise<void> => {
    const response = await api.get<Blob>('/timesheet/export', {
      params: { from, to },
      responseType: 'blob',
    });

    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');

    link.href = url;
    link.download = `timegate-${from}_to_${to}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },

  /** Inserts the punch a staff member never made — the forgotten clock-out. */
  addPunch: (input: { userId: string; type: PunchType; at: string }) =>
    api.post('/punch/manager', input),

  /** `at` is a local wall-clock string; the server reads it in London time. */
  amendPunch: (id: string, at: string) => api.patch(`/punch/${id}`, { at }),

  voidPunch: (id: string) => api.delete(`/punch/${id}`),
};
