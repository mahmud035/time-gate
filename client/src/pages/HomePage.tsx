import { Clock } from 'lucide-react';
import { Link } from 'react-router';

/**
 * The bare address is a helpful dead end, not a 404.
 *
 * The punch page is deliberately unguessable, so someone who types the domain
 * from memory lands here. Telling them where the link comes from is more use
 * than an error, and it gives away nothing — the slug is still the gate.
 */
const HomePage = () => (
  <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10 text-center">
    <div className="mx-auto mb-7 flex size-14 items-center justify-center rounded-2xl bg-brand/10">
      <Clock className="size-7 text-brand" aria-hidden="true" />
    </div>
    <h1 className="text-2xl font-semibold tracking-tight">TimeGate</h1>
    <p className="mt-3 text-base text-content-muted">
      To clock in or out, open the link your manager sent you. Save it to your
      home screen and it is one tap from then on.
    </p>
    <p className="mt-8 text-sm text-content-muted">
      Managers can{' '}
      <Link to="/login" className="font-medium text-brand underline underline-offset-4">
        sign in here
      </Link>
      .
    </p>
  </main>
);

export default HomePage;
