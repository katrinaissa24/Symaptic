import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

/** Avatar button with a small popover: rename yourself, upgrade a guest account, sign out. */
export function AccountMenu() {
  const { user, rename, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const ref = useRef<HTMLDivElement>(null);
  const loc = useLocation();
  const nav = useNavigate();

  useEffect(() => setName(user?.name ?? ''), [user?.name]);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  if (!user) return null;
  const save = () => name.trim() && name.trim() !== user.name && rename(name);

  return (
    <div className="account" ref={ref}>
      <button className={`avatar me ${user.isAnonymous ? 'guest' : ''}`} title={user.isAnonymous ? `${user.name} (guest)` : user.email} onClick={() => setOpen((o) => !o)}>
        {user.name[0]?.toUpperCase()}
      </button>
      {open && (
        <div className="account-pop" onKeyDown={(e) => e.stopPropagation()}>
          <label className="account-name">
            <small>Your name on comments</small>
            <input
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              onBlur={save}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
          </label>
          <p className="account-who">{user.isAnonymous ? 'Guest account on this browser' : user.email}</p>
          {user.isAnonymous && (
            <Link className="btn primary" to={`/login?next=${encodeURIComponent(loc.pathname)}`}>
              Sign in to keep your maps
            </Link>
          )}
          {loc.pathname !== '/app' && <Link className="btn ghost" to="/app">My maps</Link>}
          <button
            className="btn ghost"
            onClick={async () => {
              if (user.isAnonymous && !confirm('Guest maps are lost when you sign out, unless you sign in first. Sign out anyway?')) return;
              await signOut();
              nav('/');
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
