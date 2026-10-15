import type { AppUser } from '../../lib/types';

const HUES = [210, 260, 330, 20, 150, 185, 40, 290];

export function initials(name: string) {
  return name
    .split(/[\s._@-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

/** Deterministic, low-saturation colour pair for a name. */
export function avatarColors(seed: string): React.CSSProperties {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = HUES[h % HUES.length];
  return { ['--avatar-bg' as string]: `hsl(${hue} 45% 91%)`, ['--avatar-fg' as string]: `hsl(${hue} 55% 26%)` };
}

export function Avatar({
  user,
  name,
  photo,
  size,
  title,
}: {
  user?: Pick<AppUser, 'name' | 'photoURL' | 'email'> | null;
  name?: string;
  photo?: string | null;
  size?: 'sm' | 'md' | 'lg';
  title?: string;
}) {
  const n = name ?? user?.name ?? '?';
  const p = photo ?? user?.photoURL;
  return (
    <span className={`avatar${size && size !== 'md' ? ` ${size}` : ''}`} style={avatarColors(user?.email || n)} title={title} aria-hidden={title ? undefined : true}>
      {p ? <img src={p} alt="" referrerPolicy="no-referrer" /> : initials(n)}
    </span>
  );
}
