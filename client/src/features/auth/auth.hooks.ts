import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from './auth.api.ts';
import type { LoginCredentials, SessionPayload } from './auth.types.ts';

export const sessionQueryKey = ['auth', 'session'] as const;

/**
 * The signed-in user, and the single source of truth for "am I logged in".
 *
 * A 401 is a legitimate answer, not a failure to retry — the axios interceptor
 * has already attempted one silent refresh by the time it surfaces here.
 */
export const useSession = () =>
  useQuery<SessionPayload>({
    queryKey: sessionQueryKey,
    queryFn: authApi.me,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (session) => {
      // Seed the cache from the login response so the dashboard renders
      // immediately instead of flashing a skeleton for a round trip.
      queryClient.setQueryData(sessionQueryKey, session);
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      // Even a failed logout clears local state — the cookies are gone or the
      // server is unreachable, and either way this browser is signed out.
      queryClient.clear();
    },
  });
};
