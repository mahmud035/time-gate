import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { timesheetApi } from './timesheet.api.ts';

export const todayQueryKey = ['timesheet', 'today'] as const;
export const rangeQueryKey = (from: string, to: string) =>
  ['timesheet', 'range', from, to] as const;

export const useToday = () =>
  useQuery({
    queryKey: todayQueryKey,
    queryFn: timesheetApi.today,
    /** The board is a live picture of the floor, so it goes stale quickly. */
    refetchInterval: 60_000,
  });

export const useTimesheet = (from: string, to: string) =>
  useQuery({
    queryKey: rangeQueryKey(from, to),
    queryFn: () => timesheetApi.range(from, to),
  });

/**
 * A correction changes hours, so everything derived from punches is dropped —
 * the range being viewed and the board alike. Re-deriving is cheap; showing a
 * total that no longer matches the punches behind it is not.
 */
const useCorrection = <TArgs>(fn: (args: TArgs) => Promise<unknown>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['timesheet'] }),
  });
};

export const useAddPunch = () => useCorrection(timesheetApi.addPunch);

export const useAmendPunch = () =>
  useCorrection(({ id, at }: { id: string; at: string }) =>
    timesheetApi.amendPunch(id, at),
  );

export const useVoidPunch = () => useCorrection(timesheetApi.voidPunch);
