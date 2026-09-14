import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi } from './user.api.ts';

export const staffQueryKey = ['users'] as const;

export const useStaff = () =>
  useQuery({ queryKey: staffQueryKey, queryFn: userApi.list });

/** Every write refreshes the list, so the table can never show a stale name. */
const useStaffMutation = <TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: staffQueryKey }),
  });
};

export const useCreateStaff = () => useStaffMutation(userApi.create);

export const useUpdateStaff = () =>
  useStaffMutation(
    ({ id, ...changes }: { id: string } & Parameters<typeof userApi.update>[1]) =>
      userApi.update(id, changes),
  );

export const useResetCode = () => useStaffMutation(userApi.resetCode);
