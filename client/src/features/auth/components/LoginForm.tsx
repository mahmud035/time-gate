import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getApiErrorMessage } from '@/api/axios.ts';
import { useLogin } from '../auth.hooks.ts';

const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

type LoginFields = z.infer<typeof loginSchema>;

/** Manager sign-in. Employees have no password and never see this form. */
export const LoginForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const login = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit((fields) => {
    login.mutate(fields, { onSuccess });
  });

  return (
    <form
      onSubmit={(event) => {
        // handleSubmit returns a promise; React expects a void handler.
        void submit(event);
      }}
      noValidate
      className="space-y-4"
    >
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          {...register('email')}
          aria-invalid={errors.email ? 'true' : 'false'}
          className="mt-1 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 outline-none focus:border-brand focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-danger">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register('password')}
          aria-invalid={errors.password ? 'true' : 'false'}
          className="mt-1 w-full rounded-lg border border-border bg-surface-raised px-3 py-2.5 outline-none focus:border-brand focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
        />
        {errors.password && (
          <p className="mt-1 text-sm text-danger">{errors.password.message}</p>
        )}
      </div>

      {login.isError && (
        <p
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-sm text-danger"
        >
          {getApiErrorMessage(login.error, 'Could not sign you in')}
        </p>
      )}

      <button
        type="submit"
        disabled={login.isPending}
        className="w-full rounded-lg bg-brand px-4 py-3 font-medium text-brand-contrast transition-[filter] duration-100 hover:brightness-110 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60"
      >
        {login.isPending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
};
