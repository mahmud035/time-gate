import { useNavigate } from 'react-router';
import { LoginForm } from '@/features/auth/components/LoginForm.tsx';

const LoginPage = () => {
  const navigate = useNavigate();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">TimeGate</h1>
        <p className="mt-1 text-sm text-content-muted">
          Manager sign-in. Staff clock in with their code, not here.
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
