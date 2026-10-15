import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogIn, LogOut, Map as MapIcon, Monitor, Moon, Pencil, Sun } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { getThemePref, setThemePref, type ThemePref } from '../lib/theme';
import { Avatar, Button, Dialog, Field, Input, Menu, type MenuItem } from './ui';

/** Avatar button with a dropdown: name, theme, My maps, sign in (guests) and sign out. */
export function AccountMenu() {
  const { user, rename, signOut } = useAuth();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(user?.name ?? '');
  const [theme, setTheme] = useState<ThemePref>(getThemePref());
  const loc = useLocation();
  const nav = useNavigate();

  useEffect(() => setName(user?.name ?? ''), [user?.name]);
  useEffect(() => {
    const sync = () => setTheme(getThemePref());
    window.addEventListener('symaptic:theme', sync);
    return () => window.removeEventListener('symaptic:theme', sync);
  }, []);

  if (!user) return null;

  const items: MenuItem[] = [
    { label: user.isAnonymous ? `${user.name} · guest` : user.name, kind: 'label' },
    ...(user.isAnonymous ? [] : [{ label: user.email, kind: 'label' as const }]),
    'separator',
    { label: 'Change name', icon: <Pencil />, onSelect: () => setRenaming(true) },
    {
      label: 'Theme',
      icon: theme === 'dark' ? <Moon /> : theme === 'light' ? <Sun /> : <Monitor />,
      items: [
        { label: 'System', checked: theme === 'system', onSelect: () => setThemePref('system') },
        { label: 'Light', checked: theme === 'light', onSelect: () => setThemePref('light') },
        { label: 'Dark', checked: theme === 'dark', onSelect: () => setThemePref('dark') },
      ],
    },
    ...(loc.pathname !== '/app' ? [{ label: 'My maps', icon: <MapIcon />, onSelect: () => nav('/app') }] : []),
    'separator',
    ...(user.isAnonymous
      ? [{ label: 'Sign in to keep your maps', icon: <LogIn />, onSelect: () => nav(`/login?next=${encodeURIComponent(loc.pathname)}`) }]
      : []),
    {
      label: 'Sign out',
      icon: <LogOut />,
      onSelect: async () => {
        if (user.isAnonymous && !confirm('Guest maps are lost when you sign out, unless you sign in first. Sign out anyway?')) return;
        await signOut();
        nav('/');
      },
    },
  ];

  return (
    <>
      <Menu
        trigger={
          <button className="avatar-btn" aria-label={`Account: ${user.name}`}>
            <Avatar user={user} />
          </button>
        }
        items={items}
      />
      <Dialog
        open={renaming}
        onOpenChange={setRenaming}
        title="Your name"
        description="Shown on comments and shared maps."
        width={400}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenaming(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!name.trim()}
              onClick={async () => {
                if (name.trim() && name.trim() !== user.name) await rename(name);
                setRenaming(false);
              }}
            >
              Save
            </Button>
          </>
        }
      >
        <Field label="Name">
          {(f) => <Input id={f.id} value={name} maxLength={40} autoFocus onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && name.trim() && (rename(name), setRenaming(false))} />}
        </Field>
      </Dialog>
    </>
  );
}
