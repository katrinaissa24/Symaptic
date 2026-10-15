import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { isFirebaseConfigured } from '../lib/firebase';
import { Logo } from '../components/Logo';
import { Button, Field, Input } from '../components/ui';
import { usePageTitle } from '../lib/usePageTitle';

function friendly(e: unknown, method: 'google' | 'link' | 'guest'): string {
  const code = (e as { code?: string }).code ?? '';
  if (method === 'guest' && code === 'auth/admin-restricted-operation')
    return 'Guest access isn’t switched on yet. Enable “Anonymous” in Firebase → Authentication → Sign-in method.';
  if (code === 'auth/operation-not-allowed')
    return method === 'guest'
      ? 'Guest access isn’t switched on yet. Enable “Anonymous” in Firebase → Authentication → Sign-in method.'
      : method === 'google'
        ? 'Google sign-in isn’t switched on yet. Enable it in Firebase → Authentication → Sign-in method.'
        : 'Magic links aren’t switched on yet. In Firebase → Authentication → Sign-in method → Email/Password, enable “Email link (passwordless sign-in)”.';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return '';
  if (code === 'auth/invalid-email') return 'That email address doesn’t look right.';
  if (code === 'auth/invalid-action-code') return 'That sign-in link has expired or was already used. Request a new one.';
  if (code === 'auth/unauthorized-domain') return 'This website isn’t on Firebase’s list of authorized domains yet.';
  return (e as Error).message;
}

const GoogleMark = () => (
  <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);

export default function Login() {
  usePageTitle('Sign in');
  const auth = useAuth();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const next = params.get('next') || '/app';
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'finishing' | 'need-email'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    setState('finishing');
    auth.completeMagicLink().then(
      (r) => setState(r === 'need-email' ? 'need-email' : 'idle'),
      (e) => {
        setError(friendly(e, 'link'));
        setState('idle');
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guests may come here to upgrade, so only bounce people who already have a real account.
  if (auth.user && !auth.user.isAnonymous) return <Navigate to={next} replace />;
  const upgrading = !!auth.user?.isAnonymous;

  const guest = async () => {
    setError('');
    try {
      await auth.ensureUser();
      nav(next, { replace: true });
    } catch (e) {
      setError(friendly(e, 'guest'));
    }
  };

  const google = async () => {
    setError('');
    try {
      await auth.signInWithGoogle();
    } catch (e) {
      setError(friendly(e, 'google'));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isFirebaseConfigured) {
      auth.signInDemo(name.trim() || email.split('@')[0], email.trim());
      return;
    }
    try {
      if (state === 'need-email') {
        setState('finishing');
        await auth.completeMagicLink(email.trim());
        return;
      }
      setState('sending');
      await auth.sendMagicLink(email.trim(), next);
      setState('sent');
    } catch (err) {
      setError(friendly(err, 'link'));
      setState('idle');
    }
  };

  const busy = state === 'sending' || state === 'finishing';

  return (
    <main className="login page-enter">
      <div className="login-card">
        <Logo />
        {state === 'sent' ? (
          <>
            <h1>Check your inbox</h1>
            <p className="text-2">
              We sent a sign-in link to <strong>{email}</strong>. Open it on this device and you’re in.
            </p>
            <Button variant="ghost" onClick={() => setState('idle')}>
              Use a different email
            </Button>
          </>
        ) : (
          <>
            <h1>{state === 'need-email' ? 'Confirm your email' : upgrading ? 'Keep your maps' : 'Sign in'}</h1>
            <p className="text-2">
              {state === 'need-email'
                ? 'You opened the link on a different device. Type the email you used once more.'
                : upgrading
                  ? `You’re ${auth.user!.name}, a guest. Sign in and everything you made comes with you.`
                  : isFirebaseConfigured
                    ? 'No passwords. Use Google or get a sign-in link by email.'
                    : 'Demo mode: pick any name and email to try it locally.'}
            </p>
            {isFirebaseConfigured && state !== 'need-email' && (
              <>
                <Button size="lg" block icon={<GoogleMark />} onClick={google}>
                  Continue with Google
                </Button>
                <div className="or">
                  <span>or</span>
                </div>
              </>
            )}
            <form onSubmit={submit} className="login-form">
              {!isFirebaseConfigured && (
                <Field label="Name">{(f) => <Input id={f.id} inputSize="lg" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />}</Field>
              )}
              <Field label="Email">
                {(f) => <Input id={f.id} inputSize="lg" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />}
              </Field>
              <Button type="submit" variant="primary" size="lg" block disabled={busy}>
                {state === 'sending' ? 'Sending…' : state === 'finishing' ? 'Signing in…' : isFirebaseConfigured ? (state === 'need-email' ? 'Sign in' : 'Email me a link') : 'Enter demo'}
              </Button>
            </form>
            {!upgrading && state !== 'need-email' && (
              <Button variant="ghost" className="login-guest" icon={<ArrowRight />} onClick={guest}>
                Continue as a guest
              </Button>
            )}
          </>
        )}
        {error && (
          <p className="note err" role="alert">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
