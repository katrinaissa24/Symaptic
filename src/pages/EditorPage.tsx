import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import { useAuth } from '../lib/auth';
import { accessFor } from '../lib/store';
import { useMapDoc } from '../editor/useMapDoc';
import { MapEditor } from '../editor/MapEditor';
import { Logo } from '../components/Logo';
import { EditorTopBar } from '../editor/EditorTopBar';
import { EditorSkeleton } from '../components/Skeleton';
import { toast } from '../components/Toast';

const ShareDialog = lazy(() => import('../components/ShareDialog').then((m) => ({ default: m.ShareDialog })));

export default function EditorPage() {
  const { id = '' } = useParams();
  const { user, loading, getIdToken, ensureUser } = useAuth();
  const api = useMapDoc(id);
  const [sharing, setSharing] = useState(false);
  const [renameSignal, setRenameSignal] = useState(0);
  const [guestError, setGuestError] = useState('');
  const openShare = useCallback(() => setSharing(true), []);
  const focusTitle = useCallback(() => setRenameSignal((n) => n + 1), []);

  // Visitors who open a comment/edit link get a guest identity automatically, no sign-up needed.
  const linkRole = api.meta?.linkRole;
  useEffect(() => {
    if (loading || user || (linkRole !== 'comment' && linkRole !== 'edit')) return;
    ensureUser().catch((e) => setGuestError(/operation-not-allowed|admin-restricted/.test((e as { code?: string }).code ?? '')
      ? 'Guest access isn’t switched on yet (Firebase → Authentication → Sign-in method → Anonymous).'
      : (e as Error).message));
  }, [loading, user, linkRole]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <EditorTopBar
        doc={api.meta}
        user={user}
        access={access}
        save={api.save}
        canUndo={api.canUndo}
        canRedo={api.canRedo}
        onUndo={api.undo}
        onRedo={api.redo}
        onRetry={api.retrySave}
        onRename={(t) =>
          api.updateMeta({ title: t }).catch((e: Error) => {
            toast.error('Couldn’t rename the map', { description: e.message });
            throw e;
          })
        }
        onShare={openShare}
        renameSignal={renameSignal}
        guestError={guestError}
      />

      <ReactFlowProvider>
        <MapEditor
          graph={api.graph}
          commit={api.commit}
          snapshot={api.snapshot}
          undo={api.undo}
          redo={api.redo}
          canUndo={api.canUndo}
          canRedo={api.canRedo}
          canEdit={canEdit}
          canComment={canComment && !!user}
          user={user}
          onShare={access === 'owner' && user ? openShare : undefined}
          onRenameTitle={canEdit ? focusTitle : undefined}
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
