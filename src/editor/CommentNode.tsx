import { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { MapComment } from '../lib/types';
import { cloudPath } from './geometry';
import { useEditor } from './EditorContext';
import { uid } from '../lib/store';
import { isMine } from './ops';

export type CommentRFNode = Node<{ comment: MapComment }, 'comment'>;

const CLOUD = cloudPath(11);

function initials(name: string) {
  return name
    .split(/[\s._@-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

function ago(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function CommentNodeImpl({ id, data, selected }: NodeProps<CommentRFNode>) {
  const c = data.comment;
  const ed = useEditor();
  const mine = isMine(c, ed.user);
  const open = ed.openCommentId === id;
  const [editing, setEditing] = useState(mine && !c.text);
  const [draft, setDraft] = useState(c.text);
  const [reply, setReply] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) return;
    // Like new ideas, a new bubble is hidden until measured and can't take focus yet.
    let tries = 0;
    let timer = 0;
    const tryFocus = () => {
      taRef.current?.focus({ preventScroll: true });
      if (document.activeElement !== taRef.current && tries++ < 30) timer = window.setTimeout(tryFocus, 16);
    };
    tryFocus();
    return () => clearTimeout(timer);
  }, [editing]);

  const saveText = () => {
    setEditing(false);
    const t = draft.trim();
    if (!t && !c.replies.length) ed.deleteComment(id);
    else if (t !== c.text) ed.updateComment(id, { text: t });
  };

  const sendReply = () => {
    const t = reply.trim();
    if (!t || !ed.user) return;
    ed.updateComment(id, {
      replies: [
        ...c.replies,
        { id: uid('r_'), text: t, authorName: ed.user.name, authorEmail: ed.user.email, authorId: ed.user.uid, createdAt: Date.now() },
      ],
    });
    setReply('');
  };

  if (c.resolved && !open) {
    return (
      <div className="thought resolved" title="Resolved comment – click to reopen" onClick={() => ed.setOpenCommentId(id)}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="thought-cloud" aria-hidden>
          <path d={CLOUD} vectorEffect="non-scaling-stroke" />
        </svg>
        <span className="thought-check">✓</span>
        <Handle type="target" position={Position.Left} className="ghost-handle" isConnectable={false} />
      </div>
    );
  }

  return (
    <div className={`thought-wrap ${open ? 'open' : ''} ${selected ? 'is-selected' : ''}`}>
      <div
        className="thought"
        onClick={(e) => {
          e.stopPropagation();
          if (!open) ed.setOpenCommentId(id);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (mine) {
            ed.setOpenCommentId(id);
            setEditing(true);
          }
        }}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="thought-cloud" aria-hidden>
          <path d={CLOUD} vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="thought-body">
          <div className="thought-head">
            <span className="avatar" title={c.authorEmail || 'Guest'}>
              {initials(c.authorName)}
            </span>
            <span className="thought-author">{c.authorName}</span>
            {c.replies.length > 0 && !open && <span className="thought-count">{c.replies.length}↩</span>}
          </div>
          {editing ? (
            <textarea
              ref={taRef}
              className="thought-input nodrag nopan nowheel"
              placeholder="What are you thinking?"
              value={draft}
              rows={2}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={saveText}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  saveText();
                }
                if (e.key === 'Escape') saveText();
              }}
            />
          ) : (
            <div className={`thought-text ${open ? '' : 'clamp'}`}>{c.text}</div>
          )}
        </div>
      </div>

      {open && !editing && (
        <div className="thread nodrag nopan nowheel" onClick={(e) => e.stopPropagation()}>
          <div className="thread-meta">
            {ago(c.createdAt)}
            <span className="thread-actions">
              {ed.canComment && (
                <button onClick={() => ed.updateComment(id, { resolved: !c.resolved })}>
                  {c.resolved ? 'Reopen' : 'Resolve'}
                </button>
              )}
              {(mine || ed.canEdit) && <button onClick={() => ed.deleteComment(id)}>Delete</button>}
              <button aria-label="Close" onClick={() => ed.setOpenCommentId(null)}>
                ✕
              </button>
            </span>
          </div>
          {c.replies.map((r) => (
            <div className="reply" key={r.id}>
              <span className="avatar small">{initials(r.authorName)}</span>
              <div>
                <div className="reply-head">
                  <b>{r.authorName}</b> <span>{ago(r.createdAt)}</span>
                </div>
                <div className="reply-text">{r.text}</div>
              </div>
            </div>
          ))}
          {ed.canComment && (
            <form
              className="reply-form"
              onSubmit={(e) => {
                e.preventDefault();
                sendReply();
              }}
            >
              <input
                value={reply}
                placeholder="Reply…"
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
              />
              <button type="submit" disabled={!reply.trim()}>
                Send
              </button>
            </form>
          )}
        </div>
      )}
      <Handle type="target" position={Position.Left} className="ghost-handle" isConnectable={false} />
    </div>
  );
}

export const CommentNode = memo(CommentNodeImpl);
