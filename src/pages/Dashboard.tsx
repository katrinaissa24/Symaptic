import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Copy, FilePlus2, LayoutGrid, List, LogIn, Map as MapIcon, MoreHorizontal, Pencil, Search, Share2, Trash2, Users } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { store } from '../lib/store';
import { isFirebaseConfigured } from '../lib/firebase';
import type { MapDoc } from '../lib/types';
import { TEMPLATES, type Template } from '../lib/templates';
import { absoluteTime, relativeTime } from '../lib/time';
import { Logo } from '../components/Logo';
import { AccountMenu } from '../components/AccountMenu';
import { CardSkeleton } from '../components/Skeleton';
import { MapThumb } from '../components/MapThumb';
import { toast } from '../components/Toast';
import { Button, Dialog, IconButton, Input, Menu, Segmented, Select, type MenuItem } from '../components/ui';

const ShareDialog = lazy(() => import('../components/ShareDialog').then((m) => ({ default: m.ShareDialog })));

type Tab = 'mine' | 'shared';
type Sort = 'recent' | 'name';
type View = 'grid' | 'list';
const UNDO_MS = 6000;

function readPref<T extends string>(key: string, fallback: T, allowed: T[]): T {
  try {
    const v = localStorage.getItem(key) as T | null;
    return v && allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

export default function Dashboard() {
  const { user, loading, getIdToken } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('mine');
  const [mine, setMine] = useState<MapDoc[] | null>(null);
  const [shared, setShared] = useState<MapDoc[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>(() => readPref('symaptic:sort', 'recent', ['recent', 'name']));
  const [view, setView] = useState<View>(() => readPref('symaptic:view', 'grid', ['grid', 'list']));
  const [picker, setPicker] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [sharing, setSharing] = useState<MapDoc | null>(null);
  const pendingDeletes = useRef(new Map<string, number>());

  useEffect(() => {
    if (!user) return;
    store.listOwned(user).then(setMine, (e) => setError(e.message));
    store.listShared(user).then(setShared, (e) => setError(e.message));
  }, [user]);
  useEffect(() => {
    try {
      localStorage.setItem('symaptic:sort', sort);
      localStorage.setItem('symaptic:view', view);
    } catch {
      /* ignore */
    }
  }, [sort, view]);
  // Flush pending deletes if the page is left before the undo window ends.
  useEffect(
    () => () => {
      for (const [id, t] of pendingDeletes.current) {
        clearTimeout(t);
        store.remove(id).catch(() => {});
      }
    },
    [],
  );

  const list = useMemo(() => {
    const src = (tab === 'mine' ? mine : shared) ?? null;
    if (!src) return null;
    const q = query.trim().toLowerCase();
    const filtered = q ? src.filter((d) => d.title.toLowerCase().includes(q) || Object.values(d.nodes ?? {}).some((n) => n.text.toLowerCase().includes(q))) : src;
    return [...filtered].sort((a, b) => (sort === 'name' ? a.title.localeCompare(b.title) : (b.updatedAt ?? 0) - (a.updatedAt ?? 0)));
  }, [tab, mine, shared, query, sort]);

  if (loading) return <DashboardSkeleton />;
  if (!user) return <Navigate to="/login?next=/app" replace />;

  const patchLocal = (id: string, patch: Partial<MapDoc>) => {
    const up = (l: MapDoc[] | null) => l?.map((d) => (d.id === id ? { ...d, ...patch } : d)) ?? null;
    setMine(up);
    setShared(up);
    setSharing((s) => (s && s.id === id ? { ...s, ...patch } : s));
  };

  // Optimistic: navigate straight into the new map; the editor serves it while the write lands.
  const create = (t: Template) => {
    setPicker(false);
    const { id, done } = store.createOptimistic(user, t.id === 'blank' ? 'Untitled map' : t.name, t.build());
    done.catch((e: Error) => toast.error('Couldn’t create the map', { description: e.message }));
    nav(`/d/${id}`);
  };

  const rename = async (d: MapDoc, title: string) => {
    setRenaming(null);
    const t = title.trim();
    if (!t || t === d.title) return;
    patchLocal(d.id, { title: t });
    try {
      await store.patchMeta(d.id, { title: t });
    } catch (e) {
      patchLocal(d.id, { title: d.title });
      toast.error('Couldn’t rename the map', { description: (e as Error).message });
    }
  };

  const duplicate = (d: MapDoc) => {
    const { id, done } = store.createOptimistic(user, `${d.title} (copy)`, { v: d.v, nodes: d.nodes, edges: d.edges, comments: {} });
    const copy: MapDoc = { ...d, id, title: `${d.title} (copy)`, ownerId: user.uid, ownerEmail: user.email, ownerName: user.name, members: {}, memberEmails: [], linkRole: 'none', comments: {}, createdAt: Date.now(), updatedAt: Date.now() };
    setMine((m) => [copy, ...(m ?? [])]);
    done.then(
      () => toast.success('Map duplicated', { action: { label: 'Open', onClick: () => nav(`/d/${id}`) } }),
      (e: Error) => {
        setMine((m) => m?.filter((x) => x.id !== id) ?? null);
        toast.error('Couldn’t duplicate the map', { description: e.message });
      },
    );
  };

  // Delete now in the UI, really delete after the undo window.
  const remove = (d: MapDoc) => {
    setMine((m) => m?.filter((x) => x.id !== d.id) ?? null);
    const timer = window.setTimeout(async () => {
      pendingDeletes.current.delete(d.id);
      try {
        await store.remove(d.id);
      } catch (e) {
        setMine((m) => [d, ...(m ?? [])]);
        toast.error('Couldn’t delete the map', { description: (e as Error).message });
      }
    }, UNDO_MS);
    pendingDeletes.current.set(d.id, timer);
    toast.info(`Deleted “${d.title}”`, {
      duration: UNDO_MS,
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(timer);
          pendingDeletes.current.delete(d.id);
          setMine((m) => [d, ...(m ?? [])]);
        },
      },
    });
  };

  const menuFor = (d: MapDoc): MenuItem[] => [
    { label: 'Open', icon: <MapIcon />, onSelect: () => nav(`/d/${d.id}`) },
    { label: 'Rename', icon: <Pencil />, onSelect: () => setRenaming(d.id) },
    { label: 'Duplicate', icon: <Copy />, onSelect: () => duplicate(d) },
    { label: 'Share', icon: <Share2 />, onSelect: () => setSharing(d) },
    'separator',
    { label: 'Delete', icon: <Trash2 />, danger: true, onSelect: () => remove(d) },
  ];

  return (
    <div className="page dash page-enter">
      {!isFirebaseConfigured && (
        <div className="banner" role="status">
          Demo mode: maps are saved in this browser only. Add your Firebase keys to <code>.env</code> to enable accounts and sharing.
        </div>
      )}
      <header className="page-top">
        <Logo />
        <div className="spacer" />
        <Input icon={<Search />} placeholder="Search maps" aria-label="Search maps" value={query} onChange={(e) => setQuery(e.target.value)} className="dash-search" />
        <AccountMenu />
      </header>

      {user.isAnonymous && (
        <div className="banner banner-accent">
          <span>
            You’re mapping as a guest, so your maps live in this browser. Sign in to keep them on any device.
          </span>
          <Button size="sm" asChild icon={<LogIn />}>
            <Link to="/login?next=/app">Sign in</Link>
          </Button>
        </div>
      )}

      <main className="page-main">
        <div className="dash-head">
          <div className="dash-tabs" role="tablist" aria-label="Maps">
            <button role="tab" aria-selected={tab === 'mine'} className={`dash-tab${tab === 'mine' ? ' is-on' : ''}`} onClick={() => setTab('mine')}>
              My maps {mine && <span className="tag">{mine.length}</span>}
            </button>
            <button role="tab" aria-selected={tab === 'shared'} className={`dash-tab${tab === 'shared' ? ' is-on' : ''}`} onClick={() => setTab('shared')}>
              Shared with me {shared && <span className="tag">{shared.length}</span>}
            </button>
          </div>
          <div className="dash-tools">
            <Select<Sort> ariaLabel="Sort" value={sort} onValueChange={setSort} variant="ghost" size="sm" options={[{ value: 'recent', label: 'Recent' }, { value: 'name', label: 'Name' }]} />
            <Segmented<View>
              ariaLabel="View"
              value={view}
              onChange={setView}
              size="sm"
              options={[
                { value: 'grid', label: 'Grid', icon: <LayoutGrid />, iconOnly: true },
                { value: 'list', label: 'List', icon: <List />, iconOnly: true },
              ]}
            />
            <Button variant="primary" icon={<FilePlus2 />} onClick={() => setPicker(true)}>
              New map
            </Button>
          </div>
        </div>
        {error && <p className="note err">{error}</p>}

        {!list ? (
          <div className="map-grid">{[0, 1, 2, 3].map((i) => <CardSkeleton key={i} />)}</div>
        ) : list.length === 0 && query ? (
          <div className="empty">
            <Search />
            <h3>No maps match “{query}”</h3>
            <p>Try a different word, or clear the search.</p>
            <Button variant="secondary" size="sm" onClick={() => setQuery('')}>
              Clear search
            </Button>
          </div>
        ) : list.length === 0 && tab === 'shared' ? (
          <div className="empty">
            <Users />
            <h3>Nothing shared with you yet</h3>
            <p>{user.isAnonymous ? 'Sign in with your email to see maps people share with you.' : `Maps people share with ${user.email} will show up here.`}</p>
          </div>
        ) : list.length === 0 ? (
          <div className="empty">
            <MapIcon />
            <h3>No maps yet</h3>
            <p>Start from a blank canvas or a template.</p>
            <Button variant="primary" icon={<FilePlus2 />} onClick={() => setPicker(true)}>
              New map
            </Button>
          </div>
        ) : (
          <div className={view === 'grid' ? 'map-grid' : 'map-list'}>
            {tab === 'mine' && view === 'grid' && !query && (
              <button type="button" className="map-card map-card-new" onClick={() => setPicker(true)}>
                <FilePlus2 />
                <span>New map</span>
              </button>
            )}
            {list.map((d) => (
              <article key={d.id} className="map-card">
                <Link to={`/d/${d.id}`} className="map-card-link" aria-label={`Open ${d.title}`}>
                  <MapThumb doc={d} className="map-card-thumb" />
                </Link>
                <div className="map-card-meta">
                  {renaming === d.id ? (
                    <input
                      className="map-card-rename"
                      defaultValue={d.title}
                      autoFocus
                      aria-label="Map title"
                      onFocus={(e) => e.target.select()}
                      onBlur={(e) => rename(d, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') setRenaming(null);
                      }}
                    />
                  ) : (
                    <Link to={`/d/${d.id}`} className="map-card-title truncate" onDoubleClick={(e) => tab === 'mine' && (e.preventDefault(), setRenaming(d.id))}>
                      {d.title}
                    </Link>
                  )}
                  <span className="map-card-sub truncate">
                    {tab === 'shared' && `${d.ownerName} · `}
                    <time dateTime={new Date(d.updatedAt).toISOString()} title={absoluteTime(d.updatedAt)}>
                      {relativeTime(d.updatedAt)}
                    </time>
                    {tab === 'mine' && d.memberEmails?.length ? ` · shared with ${d.memberEmails.length}` : ''}
                  </span>
                </div>
                {tab === 'mine' && (
                  <div className="map-card-actions">
                    <Menu
                      align="end"
                      items={menuFor(d)}
                      trigger={
                        <span>
                          <IconButton label={`More actions for ${d.title}`} size="sm" tooltip={false}>
                            <MoreHorizontal />
                          </IconButton>
                        </span>
                      }
                    />
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </main>

      <Dialog open={picker} onOpenChange={setPicker} title="New map" description="Start from a blank canvas or a template." width={620}>
        <div className="template-grid">
          {TEMPLATES.map((t) => (
            <button key={t.id} type="button" className="template-card" onClick={() => create(t)}>
              <TemplatePreview t={t} />
              <strong>{t.name}</strong>
              <span>{t.description}</span>
            </button>
          ))}
        </div>
      </Dialog>

      {sharing && (
        <Suspense fallback={null}>
          <ShareDialog
            doc={sharing}
            user={user}
            getIdToken={getIdToken}
            updateMeta={async (p) => {
              patchLocal(sharing.id, p as Partial<MapDoc>);
              await store.patchMeta(sharing.id, p);
            }}
            onClose={() => setSharing(null)}
          />
        </Suspense>
      )}
    </div>
  );
}

function TemplatePreview({ t }: { t: Template }) {
  const row = (items: string[], side: 'l' | 'r') => items.map((label) => <i key={label} className={`tp-branch tp-${side}`} title={label} />);
  return (
    <div className="tp" aria-hidden>
      <div className="tp-side">{row(t.preview.left, 'l')}</div>
      <span className="tp-root" />
      <div className="tp-side">{row(t.preview.right, 'r')}</div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="page dash" role="status" aria-label="Loading">
      <header className="page-top">
        <Logo />
      </header>
      <main className="page-main">
        <div className="map-grid">{[0, 1, 2, 3].map((i) => <CardSkeleton key={i} />)}</div>
      </main>
    </div>
  );
}
