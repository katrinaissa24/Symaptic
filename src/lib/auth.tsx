import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { getFirebase, isFirebaseConfigured } from './firebase';
import type { AppUser } from './types';

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  /** Returns the current user, quietly creating a guest account if nobody is signed in. */
  ensureUser(): Promise<AppUser>;
  signInWithGoogle(): Promise<void>;
  sendMagicLink(email: string, next: string): Promise<void>;
  /** Finishes a magic-link sign in if the current URL is one. */
  completeMagicLink(emailOverride?: string): Promise<'done' | 'need-email' | 'not-a-link'>;
  rename(name: string): Promise<void>;
  signInDemo(name: string, email: string): void;
  signOut(): Promise<void>;
  getIdToken(): Promise<string | null>;
}

const Ctx = createContext<AuthState | null>(null);
const EMAIL_KEY = 'symaptic:magic-email';
const DEMO_KEY = 'symaptic:demo-user';

const ADJ = ['Curious', 'Brave', 'Sunny', 'Dreamy', 'Clever', 'Gentle', 'Bold', 'Merry', 'Quiet', 'Lucky', 'Witty', 'Cosmic'];
const ANIMAL = ['Otter', 'Fox', 'Panda', 'Koala', 'Heron', 'Lynx', 'Puffin', 'Gecko', 'Owl', 'Moth', 'Badger', 'Narwhal'];
export const guestName = () =>
  `${ADJ[Math.floor(Math.random() * ADJ.length)]} ${ANIMAL[Math.floor(Math.random() * ANIMAL.length)]}`;

function toAppUser(u: User): AppUser {
  const email = (u.email ?? '').toLowerCase();
  return {
    uid: u.uid,
    email,
    name: u.displayName || email.split('@')[0] || 'Guest',
    photoURL: u.photoURL,
    isAnonymous: u.isAnonymous,
  };
}

const alreadyUsed = (e: unknown) => {
  const code = (e as { code?: string }).code;
  return code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use';
};

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
    let unsub: (() => void) | null = null;
    let cancelled = false;
    getFirebase().then(({ auth, A }) => {
      if (cancelled) return;
      unsub = A.onAuthStateChanged(auth, (u) => {
        setUser(u ? toAppUser(u) : null);
        setLoading(false);
      });
    });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  /** Re-read the Firebase user after linking/renaming (onAuthStateChanged doesn't fire for those). */
  const refresh = async () => {
    const { auth } = await getFirebase();
    const u = auth.currentUser;
    if (!u) return;
    await u.reload();
    await u.getIdToken(true); // fresh token so Firestore sees the new email
    setUser(toAppUser(auth.currentUser!));
  };

  const saveDemo = (u: AppUser) => {
    localStorage.setItem(DEMO_KEY, JSON.stringify(u));
    setUser(u);
  };

  const value: AuthState = {
    user,
    loading,
    async ensureUser() {
      if (user) return user;
      if (!isFirebaseConfigured) {
        const u: AppUser = { uid: 'demo-guest-' + Math.random().toString(36).slice(2, 9), email: '', name: guestName(), isAnonymous: true };
        saveDemo(u);
        return u;
      }
      const { auth, A } = await getFirebase();
      const cred = await A.signInAnonymously(auth);
      await A.updateProfile(cred.user, { displayName: guestName() });
      const u = toAppUser(cred.user);
      setUser(u);
      return u;
    },
    async signInWithGoogle() {
      const { auth, A } = await getFirebase();
      const provider = new A.GoogleAuthProvider();
      const cur = auth.currentUser;
      if (cur?.isAnonymous) {
        // Upgrade the guest account in place so their maps come along.
        try {
          await A.linkWithPopup(cur, provider, A.browserPopupRedirectResolver);
          await refresh();
          return;
        } catch (e) {
          if (!alreadyUsed(e)) throw e;
          const c = A.GoogleAuthProvider.credentialFromError(e as never);
          if (c) {
            await A.signInWithCredential(auth, c);
            return;
          }
        }
      }
      await A.signInWithPopup(auth, provider, A.browserPopupRedirectResolver);
    },
    async sendMagicLink(email, next) {
      const { auth, A } = await getFirebase();
      const url = `${window.location.origin}/login?next=${encodeURIComponent(next)}`;
      await A.sendSignInLinkToEmail(auth, email, { url, handleCodeInApp: true });
      localStorage.setItem(EMAIL_KEY, email);
    },
    async completeMagicLink(emailOverride) {
      if (!isFirebaseConfigured) return 'not-a-link';
      const { auth, A } = await getFirebase();
      if (!A.isSignInWithEmailLink(auth, window.location.href)) return 'not-a-link';
      const email = emailOverride || localStorage.getItem(EMAIL_KEY);
      if (!email) return 'need-email';
      await auth.authStateReady();
      const cur = auth.currentUser;
      if (cur?.isAnonymous) {
        try {
          await A.linkWithCredential(cur, A.EmailAuthProvider.credentialWithLink(email, window.location.href));
          await refresh();
          localStorage.removeItem(EMAIL_KEY);
          return 'done';
        } catch (e) {
          // That email already has an account: just sign into it.
          if (!alreadyUsed(e)) throw e;
        }
      }
      await A.signInWithEmailLink(auth, email, window.location.href);
      localStorage.removeItem(EMAIL_KEY);
      return 'done';
    },
    async rename(name) {
      const n = name.trim().slice(0, 40);
      if (!n || !user) return;
      if (!isFirebaseConfigured) return saveDemo({ ...user, name: n });
      const { auth, A } = await getFirebase();
      await A.updateProfile(auth.currentUser!, { displayName: n });
      await refresh();
    },
    signInDemo(name, email) {
      saveDemo({ uid: 'demo-' + email.toLowerCase(), email: email.toLowerCase(), name, isAnonymous: false });
    },
    async signOut() {
      if (isFirebaseConfigured) {
        const { auth, A } = await getFirebase();
        await A.signOut(auth);
      } else {
        localStorage.removeItem(DEMO_KEY);
        setUser(null);
      }
    },
    async getIdToken() {
      if (!isFirebaseConfigured) return null;
      const { auth } = await getFirebase();
      return auth.currentUser ? auth.currentUser.getIdToken() : null;
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
