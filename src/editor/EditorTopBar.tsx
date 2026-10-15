import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, CloudOff, Redo2, RotateCcw, Share2, Undo2 } from 'lucide-react';
import type { AccessRole, AppUser, MapDoc } from '../lib/types';
import type { SaveState } from './useMapDoc';
import { Avatar, Button, IconButton, Tooltip } from '../components/ui';
import { AccountMenu } from '../components/AccountMenu';
import { LogoMark } from '../components/Logo';

const ROLE_BADGE: Record<AccessRole, string> = { owner: '', edit: 'Editor', comment: 'Commenter', view: 'Viewer', none: '' };

export function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry(): void }) {
  if (state === 'error')
    return (
      <button type="button" className="save-state is-error" onClick={onRetry} aria-live="polite">
        <RotateCcw /> Couldn’t save · Retry
      </button>
    );
  return (
    <span className={`save-state is-${state}`} role="status" aria-live="polite">
      {state === 'saved' && <Check />}
      {state === 'saving' && <span className="save-spinner" aria-hidden />}
      {state === 'offline' && <CloudOff />}
      {state === 'saved' ? 'Saved' : state === 'saving' ? 'Saving…' : 'Offline'}
    </span>
  );
}

export function EditorTopBar({
  doc,
  user,
  access,
  save,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onRetry,
  onRename,
  onShare,
  renameSignal,
  guestError,
}: {
  doc: MapDoc;
  user: AppUser | null;
  access: AccessRole;
  save: SaveState;
  canUndo: boolean;
  canRedo: boolean;
  onUndo(): void;
  onRedo(): void;
  onRetry(): void;
  onRename(title: string): Promise<void>;
  onShare(): void;
  /** Increment to focus the title input (used by the command palette). */
  renameSignal?: number;
  guestError?: string;
}) {
  const canEdit = access === 'owner' || access === 'edit';
  const canAct = canEdit || access === 'comment';
  const [title, setTitle] = useState(doc.title);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => setTitle(doc.title), [doc.title]);
  useEffect(() => {
    if (renameSignal) {
      input.current?.focus();
      input.current?.select();
    }
  }, [renameSignal]);

  const commitTitle = () => {
    const t = title.trim();
    if (!t || t === doc.title) return setTitle(doc.title);
    onRename(t).catch(() => setTitle(doc.title));
  };

  const people = [{ name: doc.ownerName, email: doc.ownerEmail }, ...Object.keys(doc.members ?? {}).map((email) => ({ name: email.split('@')[0], email }))];

  return (
    <header className="topbar">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Tooltip content={user ? 'My maps' : 'Home'}>
          <Link to={user ? '/app' : '/'} className="btn btn-ghost btn-sm crumb-home" aria-label={user ? 'Back to My maps' : 'Home'}>
            <ArrowLeft className="crumb-back" />
            <LogoMark size={18} />
            <span className="crumb-text">My maps</span>
          </Link>
        </Tooltip>
        <span className="crumb-sep" aria-hidden>
          /
        </span>
        <input
          ref={input}
          className="title-input"
          value={title}
          readOnly={!canEdit}
          aria-label="Map title"
          placeholder="Untitled map"
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') {
              setTitle(doc.title);
              (e.target as HTMLInputElement).blur();
            }
          }}
        />
        {canAct && <SaveIndicator state={save} onRetry={onRetry} />}
      </nav>

      <div className="spacer" />

      {canAct && (
        <div className="topbar-group" role="group" aria-label="History">
          <IconButton label="Undo" shortcut="Mod+Z" disabled={!canUndo} onClick={onUndo}>
            <Undo2 />
          </IconButton>
          <IconButton label="Redo" shortcut="Mod+Shift+Z" disabled={!canRedo} onClick={onRedo}>
            <Redo2 />
          </IconButton>
        </div>
      )}
      {ROLE_BADGE[access] && <span className="tag">{ROLE_BADGE[access]}</span>}
      {guestError && <span className="note err text-xs">{guestError}</span>}
      {people.length > 1 && (
        <div className="avatar-stack topbar-people" aria-label={`Shared with ${people.length - 1} ${people.length === 2 ? 'person' : 'people'}`}>
          {people.slice(0, 4).map((p) => (
            <Avatar key={p.email} name={p.name} user={{ name: p.name, email: p.email }} size="sm" title={p.email} />
          ))}
          {people.length > 4 && <span className="avatar sm">+{people.length - 4}</span>}
        </div>
      )}
      {!user && doc.linkRole === 'view' && (
        <Button variant="ghost" asChild>
          <Link to={`/login?next=/d/${doc.id}`}>Sign in</Link>
        </Button>
      )}
      {access === 'owner' && user && (
        <Button variant="primary" icon={<Share2 />} onClick={onShare}>
          Share
        </Button>
      )}
      <AccountMenu />
    </header>
  );
}
