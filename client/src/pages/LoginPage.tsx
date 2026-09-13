import { Clock } from 'lucide-react';
import { useNavigate } from 'react-router';
import { LoginForm } from '@/features/auth/components/LoginForm.tsx';

const LoginPage = () => {
  const navigate = useNavigate();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-5 py-10">
      <div className="mb-7 flex items-center gap-2.5">
        <Clock className="size-6 text-brand" aria-hidden="true" />
        <span className="text-xl font-semibold tracking-tight">TimeGate</span>
      </div>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Manager sign-in</h1>
        <p className="mt-2 text-sm text-content-muted">
          Staff clock in with their code, not here.
        </p>
      </header>

      <LoginForm
        onSuccess={() => {
          void navigate('/dashboard', { replace: true });
        }}
      />
    </main>
  );
};

export default LoginPage;
