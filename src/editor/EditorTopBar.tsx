import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, CloudOff, Redo2, RotateCcw, Share2, Undo2 } from 'lucide-react';
import type { AccessRole, AppUser, MapDoc } from '../lib/types';
import type { SaveState } from './useMapDoc';
import { Avatar, Button, IconButton, Tooltip } from '../components/ui';
import { AccountMenu } from '../components/AccountMenu';
import type { PresenceEntry } from '../lib/presence';
import { LogoMark } from '../components/Logo';

const ROLE_BADGE: Record<AccessRole, string> = { owner: '', edit: 'Editor', comment: 'Commenter', view: 'Viewer', none: '' };

export function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry(): void }) {
  if (state === 'error')
    return (
      <button type="button" className="save-state is-error" onClick={onRetry} aria-live="polite">
        <RotateCcw /> <span className="save-text">Couldn’t save · Retry</span>
      </button>
    );
  return (
    <span className={`save-state is-${state}`} role="status" aria-live="polite">
      {state === 'saved' && <Check />}
      {state === 'saving' && <span className="save-spinner" aria-hidden />}
      {state === 'offline' && <CloudOff />}
      <span className="save-text">{state === 'saved' ? 'Saved' : state === 'saving' ? 'Saving…' : 'Offline'}</span>
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
  others = [],
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
  /** People with the map open right now (live presence). */
  others?: PresenceEntry[];
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

  // One avatar per person, even if they have the map open in several tabs.
  const viewers = [...new Map(others.map((o) => [o.uid, o])).values()];

  return (
    <header className="topbar">
      <h1 className="visually-hidden">{doc.title}</h1>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Tooltip content={user ? 'My maps' : 'Home'}>
          <Link
            to={user ? '/app' : '/'}
            className="btn btn-ghost btn-sm crumb-home"
            aria-label={user ? 'Back to My maps' : 'Home'}
            onClick={(e) => {
              if (save === 'error' && !confirm('Some changes could not be saved. Leave anyway?')) e.preventDefault();
            }}
          >
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
      {viewers.length > 0 && (
        <div className="avatar-stack topbar-people" role="list" aria-label={`${viewers.length} ${viewers.length === 1 ? 'person' : 'people'} viewing now`}>
          {viewers.slice(0, 4).map((v) => (
            <Tooltip key={v.uid} content={`${v.name} is here`}>
              <span role="listitem" style={{ ['--ring' as string]: `var(--palette-${v.color})` }} className="avatar-ring">
                <Avatar name={v.name} user={{ name: v.name, email: v.uid }} size="sm" title={`${v.name} is viewing`} />
              </span>
            </Tooltip>
          ))}
          {viewers.length > 4 && <span className="avatar sm">+{viewers.length - 4}</span>}
        </div>
      )}
      {!user && doc.linkRole === 'view' && (
        <Button variant="ghost" asChild>
          <Link to={`/login?next=/d/${doc.id}`}>Sign in</Link>
        </Button>
      )}
      {access === 'owner' && user && (
        <Button variant="primary" icon={<Share2 />} onClick={onShare} aria-label="Share">
          <span className="topbar-share-text">Share</span>
        </Button>
      )}
      <AccountMenu />
    </header>
  );
}
