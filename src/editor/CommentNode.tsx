import { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Check, MessageSquare, RotateCcw, Trash2, X } from 'lucide-react';
import type { MapComment } from '../lib/types';
import { useEditor } from './EditorContext';
import { useUIStore } from './uiStore';
import { uid } from '../lib/store';
import { isMine } from './ops';
import { Avatar, avatarColors, initials } from '../components/ui/Avatar';
import { relativeTime } from '../lib/time';
import { perfCount } from '../lib/perf';

export type CommentRFNode = Node<{ comment: MapComment }, 'comment'>;

function CommentNodeImpl({ id, data, selected }: NodeProps<CommentRFNode>) {
  perfCount('CommentNode');
  const c = data.comment;
  const ed = useEditor();
  const mine = isMine(c, ed.user);
  const open = useUIStore((s) => s.openCommentId === id);
  const [editing, setEditing] = useState(mine && !c.text);
  const [draft, setDraft] = useState(c.text);
  const [reply, setReply] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing || !open) return;
    let tries = 0;
    let timer = 0;
    const tryFocus = () => {
      taRef.current?.focus({ preventScroll: true });
      if (document.activeElement !== taRef.current && tries++ < 30) timer = window.setTimeout(tryFocus, 16);
    };
    tryFocus();
    return () => clearTimeout(timer);
  }, [editing, open]);

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
      replies: [...c.replies, { id: uid('r_'), text: t, authorName: ed.user.name, authorEmail: ed.user.email, authorId: ed.user.uid, createdAt: Date.now() }],
    });
    setReply('');
  };

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  if (!open) {
    return (
      <button
        type="button"
        className={`comment-chip${c.resolved ? ' is-resolved' : ''}${selected ? ' is-selected' : ''}`}
        aria-label={`${c.resolved ? 'Resolved comment' : 'Comment'} by ${c.authorName}: ${c.text}`}
        title={c.text}
        onClick={(e) => {
          stop(e);
          ed.setOpenCommentId(id);
        }}
      >
        {c.resolved ? <Check /> : <span className="avatar sm comment-chip-avatar" style={avatarColors(c.authorName)} data-initials={initials(c.authorName)} aria-hidden />}
        {!c.resolved && c.replies.length > 0 && <span className="comment-chip-count" data-count={c.replies.length + 1} aria-hidden />}
        <Handle type="target" position={Position.Left} className="ghost-handle" isConnectable={false} />
      </button>
    );
  }

  return (
    <div className={`comment-card nowheel${selected ? ' is-selected' : ''}${c.resolved ? ' is-resolved' : ''}`} role="dialog" aria-label={`Comment by ${c.authorName}`} onClick={stop}>
      <div className="comment-head">
        <Avatar name={c.authorName} size="sm" />
        <span className="comment-author truncate">{c.authorName}</span>
        <time className="comment-time" dateTime={new Date(c.createdAt).toISOString()} title={new Date(c.createdAt).toLocaleString()}>
          {relativeTime(c.createdAt)}
        </time>
        <span className="comment-actions nodrag">
          {ed.canComment && (
            <button type="button" className="comment-icon-btn" aria-label={c.resolved ? 'Reopen' : 'Resolve'} title={c.resolved ? 'Reopen' : 'Resolve'} onClick={() => ed.updateComment(id, { resolved: !c.resolved })}>
              {c.resolved ? <RotateCcw /> : <Check />}
            </button>
          )}
          {(mine || ed.canEdit) && (
            <button type="button" className="comment-icon-btn" aria-label="Delete comment" title="Delete" onClick={() => ed.deleteComment(id)}>
              <Trash2 />
            </button>
          )}
          <button type="button" className="comment-icon-btn" aria-label="Close" title="Close" onClick={() => ed.setOpenCommentId(null)}>
            <X />
          </button>
        </span>
      </div>
      {editing ? (
        <textarea
          ref={taRef}
          className="comment-input nodrag nopan"
          placeholder="Write a comment…"
          aria-label="Comment text"
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
        <div
          className="comment-text"
          onDoubleClick={() => {
            if (mine) setEditing(true);
          }}
        >
          {c.text}
        </div>
      )}
      {c.replies.length > 0 && (
        <div className="comment-replies">
          {c.replies.map((r) => (
            <div className="comment-reply" key={r.id}>
              <Avatar name={r.authorName} size="sm" />
              <div className="comment-reply-body">
                <div className="comment-reply-head">
                  <span className="comment-author truncate">{r.authorName}</span>
                  <time className="comment-time" dateTime={new Date(r.createdAt).toISOString()} title={new Date(r.createdAt).toLocaleString()}>
                    {relativeTime(r.createdAt)}
                  </time>
                </div>
                <div className="comment-text">{r.text}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {ed.canComment && !editing && (
        <form
          className="comment-reply-form nodrag nopan"
          onSubmit={(e) => {
            e.preventDefault();
            sendReply();
          }}
        >
          <input className="input input-sm" value={reply} placeholder="Reply…" aria-label="Reply" onChange={(e) => setReply(e.target.value)} onKeyDown={stop} />
          <button type="submit" className="btn btn-primary btn-sm" disabled={!reply.trim()} aria-label="Send reply">
            <MessageSquare />
          </button>
        </form>
      )}
      <Handle type="target" position={Position.Left} className="ghost-handle" isConnectable={false} />
    </div>
  );
}

export const CommentNode = memo(CommentNodeImpl, (a, b) => a.id === b.id && a.data === b.data && a.selected === b.selected);
