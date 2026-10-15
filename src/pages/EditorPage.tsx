import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { useAuth } from '../lib/auth';
import { accessFor } from '../lib/store';
import { useMapDoc } from '../editor/useMapDoc';
import { MapEditor } from '../editor/MapEditor';
import { Icon } from '../editor/icons';
import { Logo } from '../components/Logo';
import { AccountMenu } from '../components/AccountMenu';
import { EditorSkeleton } from '../components/Skeleton';
import { toast } from '../components/Toast';

const ShareDialog = lazy(() => import('../components/ShareDialog').then((m) => ({ default: m.ShareDialog })));

const ROLE_BADGE = { owner: 'Owner', edit: 'Editor', comment: 'Commenter', view: 'Viewer', none: '' } as const;

export default function EditorPage() {
  const { id = '' } = useParams();
  const { user, loading, getIdToken, ensureUser } = useAuth();
  const nav = useNavigate();
  const api = useMapDoc(id);
  const [sharing, setSharing] = useState(false);
  const [title, setTitle] = useState('');
  const [guestError, setGuestError] = useState('');

  // Visitors who open a comment/edit link get a guest identity automatically, no sign-up needed.
  const linkRole = api.meta?.linkRole;
  useEffect(() => {
    if (loading || user || (linkRole !== 'comment' && linkRole !== 'edit')) return;
    ensureUser().catch((e) => setGuestError(/operation-not-allowed|admin-restricted/.test((e as { code?: string }).code ?? '')
      ? 'Guest access isn’t switched on yet (Firebase → Authentication → Sign-in method → Anonymous).'
      : (e as Error).message));
  }, [loading, user, linkRole]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (api.meta) setTitle(api.meta.title);
  }, [api.meta?.title]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (api.meta) document.title = `${api.meta.title} · Symaptic`;
  }, [api.meta]);

  if (loading || api.status === 'loading') return <EditorSkeleton />;

  if (api.status !== 'ready' || !api.meta || !api.graph) {
    return (
      <div className="center-screen">
        <div className="empty-card">
          <Logo />
          <h2>{api.status === 'missing' ? 'This map doesn’t exist' : 'You don’t have access to this map'}</h2>
          <p>
            {user && !user.isAnonymous
              ? `You’re signed in as ${user.email}. Ask the owner to share it with this address.`
              : 'If it was shared with your email, sign in with that address.'}
          </p>
          {user && !user.isAnonymous ? (
            <Link className="btn btn-primary" to="/app">Back to my maps</Link>
          ) : (
            <Link className="btn btn-primary" to={`/login?next=/d/${id}`}>Sign in</Link>
          )}
        </div>
      </div>
    );
  }

  const access = accessFor(api.meta, user);
  const canEdit = access === 'owner' || access === 'edit';
  const canComment = canEdit || access === 'comment';

  return (
    <div className="editor-page">
      <header className="topbar">
        <button className="btn btn-ghost btn-icon" title="My maps" onClick={() => nav(user ? '/app' : '/')}>{Icon.back}</button>
        <Logo small />
        <input
          className="title-input"
          value={title}
          disabled={!canEdit}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            const t = title.trim();
            if (!t || t === api.meta!.title) return setTitle(api.meta!.title);
            api.updateMeta({ title: t }).catch(() => {
              setTitle(api.meta!.title);
              toast.error('Couldn’t rename the map');
            });
          }}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        />
        <span className={`save-state ${api.save}`} role="status">
          <span className={`save-dot ${api.save}`} />
          {api.save === 'saved' ? 'Saved' : api.save === 'saving' ? 'Saving…' : api.save === 'offline' ? 'Offline' : <button className="save-retry" onClick={api.retrySave}>Couldn’t save · Retry</button>}
        </span>
        <div className="spacer" />
        {(canEdit || canComment) && (
          <>
            <button className="btn btn-ghost btn-icon" title="Undo (⌘Z)" disabled={!api.canUndo} onClick={api.undo}>{Icon.undo}</button>
            <button className="btn btn-ghost btn-icon" title="Redo (⇧⌘Z)" disabled={!api.canRedo} onClick={api.redo}>{Icon.redo}</button>
          </>
        )}
        {access !== 'owner' && access !== 'none' && <span className="badge">{ROLE_BADGE[access]}</span>}
        {guestError && <span className="note err slim">{guestError}</span>}
        {!user && api.meta.linkRole === 'view' && <Link className="btn btn-ghost" to={`/login?next=/d/${id}`}>Sign in</Link>}
        {access === 'owner' && user && (
          <button className="btn btn-primary" onClick={() => setSharing(true)}>
            {Icon.share} Share
          </button>
        )}
        <AccountMenu />
      </header>

      <ReactFlowProvider>
        <MapEditor
          graph={api.graph}
          commit={api.commit}
          snapshot={api.snapshot}
          undo={api.undo}
          redo={api.redo}
          canEdit={canEdit}
          canComment={canComment && !!user}
          user={user}
        />
      </ReactFlowProvider>

      {sharing && user && (
        <Suspense fallback={null}>
          <ShareDialog doc={api.meta} user={user} updateMeta={api.updateMeta} getIdToken={getIdToken} onClose={() => setSharing(false)} />
        </Suspense>
      )}
    </div>
  );
}
