import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { store } from '../lib/store';
import { isFirebaseConfigured } from '../lib/firebase';
import type { MapDoc } from '../lib/types';
import { Logo } from '../components/Logo';

function Thumb({ d }: { d: MapDoc }) {
  const nodes = Object.values(d.nodes ?? {});
  if (!nodes.length) return <svg className="thumb" viewBox="0 0 200 120" />;
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  const minX = Math.min(...xs) - 60, maxX = Math.max(...xs) + 160;
  const minY = Math.min(...ys) - 40, maxY = Math.max(...ys) + 70;
  const s = Math.min(200 / (maxX - minX), 120 / (maxY - minY), 0.6);
  const ox = (200 - (maxX - minX) * s) / 2, oy = (120 - (maxY - minY) * s) / 2;
  const P = (x: number, y: number) => [ox + (x - minX) * s, oy + (y - minY) * s];
  return (
    <svg className="thumb" viewBox="0 0 200 120">
      {Object.values(d.edges ?? {}).map((e) => {
        const a = d.nodes[e.source], b = d.nodes[e.target];
        if (!a || !b) return null;
        const [x1, y1] = P(a.x + 50, a.y + 18);
        const [x2, y2] = P(b.x + 50, b.y + 18);
        const mx = (x1 + x2) / 2;
        return <path key={e.id} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} stroke={e.color} strokeWidth={Math.max(1.2, e.width * s * 0.8)} fill="none" strokeLinecap="round" />;
      })}
      {nodes.map((n) => {
        const [x, y] = P(n.x, n.y);
        return n.root ? (
          <rect key={n.id} x={x} y={y} width={100 * s} height={36 * s} rx={8 * s} fill={n.color} />
        ) : (
          <rect key={n.id} x={x} y={y + 30 * s} width={90 * s} height={Math.max(1.5, 3 * s)} rx="1" fill={n.color} />
        );
      })}
    </svg>
  );
}

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<'mine' | 'shared'>('mine');
  const [mine, setMine] = useState<MapDoc[] | null>(null);
  const [shared, setShared] = useState<MapDoc[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    const byDate = (a: MapDoc, b: MapDoc) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
    store.listOwned(user).then((d) => setMine(d.sort(byDate)), (e) => setError(e.message));
    store.listShared(user).then((d) => setShared(d.sort(byDate)), (e) => setError(e.message));
  }, [user]);

  if (loading) return <div className="center-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login?next=/app" replace />;

  const create = async () => {
    const id = await store.create(user, 'Untitled map');
    nav(`/d/${id}`);
  };
  const remove = async (d: MapDoc) => {
    if (!confirm(`Delete “${d.title}” for everyone? This can't be undone.`)) return;
    await store.remove(d.id);
    setMine((m) => m?.filter((x) => x.id !== d.id) ?? null);
  };

  const list = tab === 'mine' ? mine : shared;

  return (
    <div className="dash">
      {!isFirebaseConfigured && (
        <div className="demo-banner">Demo mode: maps are saved in this browser only. Add your Firebase keys to <code>.env</code> to enable accounts and sharing.</div>
      )}
      <header className="dash-top">
        <Logo />
        <div className="spacer" />
        <span className="who">{user.email}</span>
        <button className="btn ghost" onClick={() => signOut().then(() => nav('/'))}>Sign out</button>
      </header>

      <main className="dash-main">
        <div className="dash-head">
          <div className="tabs">
            <button className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>My maps {mine && <i>{mine.length}</i>}</button>
            <button className={tab === 'shared' ? 'on' : ''} onClick={() => setTab('shared')}>Shared with me {shared && <i>{shared.length}</i>}</button>
          </div>
          <button className="btn primary big" onClick={create}>＋ New map</button>
        </div>
        {error && <p className="note err">{error}</p>}

        <div className="grid">
          {tab === 'mine' && (
            <button className="card new-card" onClick={create}>
              <span className="plus-bloom">＋</span>
              Start a new map
            </button>
          )}
          {list?.map((d) => (
            <div key={d.id} className="card">
              <Link to={`/d/${d.id}`} className="card-link">
                <Thumb d={d} />
                <div className="card-meta">
                  <b>{d.title}</b>
                  <small>
                    {tab === 'shared' ? `by ${d.ownerName} · ` : ''}
                    {new Date(d.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    {tab === 'mine' && d.memberEmails?.length ? ` · shared with ${d.memberEmails.length}` : ''}
                  </small>
                </div>
              </Link>
              {tab === 'mine' && (
                <button className="card-del" title="Delete" onClick={() => remove(d)}>✕</button>
              )}
            </div>
          ))}
          {list && !list.length && tab === 'shared' && <p className="muted">Nothing shared with you yet. Maps people share with {user.email} show up here.</p>}
          {!list && <div className="spinner" />}
        </div>
      </main>
    </div>
  );
}
