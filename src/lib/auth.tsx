import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';
import type { AppUser } from './types';

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  signInWithGoogle(): Promise<void>;
  sendMagicLink(email: string, next: string): Promise<void>;
  /** Finishes a magic-link sign in if the current URL is one. Returns true if handled. */
  completeMagicLink(emailOverride?: string): Promise<'done' | 'need-email' | 'not-a-link'>;
  signInDemo(name: string, email: string): void;
  signOut(): Promise<void>;
  getIdToken(): Promise<string | null>;
}

const Ctx = createContext<AuthState | null>(null);
const EMAIL_KEY = 'symaptic:magic-email';
const DEMO_KEY = 'symaptic:demo-user';

function toAppUser(u: User): AppUser {
  const email = (u.email ?? '').toLowerCase();
  return { uid: u.uid, email, name: u.displayName || email.split('@')[0] || 'Someone', photoURL: u.photoURL };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      try {
        const saved = localStorage.getItem(DEMO_KEY);
        if (saved) setUser(JSON.parse(saved));
      } catch { /* ignore */ }
      setLoading(false);
      return;
    }
    return onAuthStateChanged(auth!, (u) => {
      setUser(u ? toAppUser(u) : null);
      setLoading(false);
    });
  }, []);

  const value: AuthState = {
    user,
    loading,
    async signInWithGoogle() {
      await signInWithPopup(auth!, new GoogleAuthProvider());
    },
    async sendMagicLink(email, next) {
      const url = `${window.location.origin}/login?next=${encodeURIComponent(next)}`;
      await sendSignInLinkToEmail(auth!, email, { url, handleCodeInApp: true });
      localStorage.setItem(EMAIL_KEY, email);
    },
    async completeMagicLink(emailOverride) {
      if (!isFirebaseConfigured || !isSignInWithEmailLink(auth!, window.location.href)) return 'not-a-link';
      const email = emailOverride || localStorage.getItem(EMAIL_KEY);
      if (!email) return 'need-email';
      await signInWithEmailLink(auth!, email, window.location.href);
      localStorage.removeItem(EMAIL_KEY);
      return 'done';
    },
    signInDemo(name, email) {
      const u: AppUser = { uid: 'demo-' + email.toLowerCase(), email: email.toLowerCase(), name };
      localStorage.setItem(DEMO_KEY, JSON.stringify(u));
      setUser(u);
    },
    async signOut() {
      if (isFirebaseConfigured) await fbSignOut(auth!);
      else {
        localStorage.removeItem(DEMO_KEY);
        setUser(null);
      }
    },
    async getIdToken() {
      return isFirebaseConfigured && auth!.currentUser ? auth!.currentUser.getIdToken() : null;
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
