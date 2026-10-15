import { useState } from 'react';
import type { AppUser, LinkRole, MapDoc, Patch, Role } from '../lib/types';
import { isFirebaseConfigured } from '../lib/firebase';

const ROLE_LABEL: Record<Role, string> = { view: 'Can view', comment: 'Can comment', edit: 'Can edit' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ShareDialog({
  doc,
  user,
  updateMeta,
  getIdToken,
  onClose,
}: {
  doc: MapDoc;
  user: AppUser;
  updateMeta(p: Patch): Promise<void>;
  getIdToken(): Promise<string | null>;
  onClose(): void;
}) {
  const [emails, setEmails] = useState('');
  const [role, setRole] = useState<Role>('edit');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: 'ok' | 'warn' | 'err'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/d/${doc.id}`;

  const setMembers = (members: Record<string, Role>) =>
    updateMeta({ members, memberEmails: Object.keys(members) });

  const invite = async () => {
    const list = emails
      .split(/[\s,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const bad = list.filter((e) => !EMAIL_RE.test(e));
    if (!list.length) return;
    if (bad.length) return setNote({ kind: 'err', text: `That doesn't look like an email: ${bad.join(', ')}` });
    const fresh = list.filter((e) => e !== doc.ownerEmail);
    setBusy(true);
    setNote(null);
    try {
      const members = { ...doc.members };
      for (const e of fresh) members[e] = role;
      await setMembers(members);
      setEmails('');
      if (!isFirebaseConfigured) {
        setNote({ kind: 'warn', text: 'Added. Demo mode: no email was sent. Connect Firebase + Resend to send real invites.' });
        return;
      }
      const token = await getIdToken();
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ docId: doc.id, emails: fresh }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) setNote({ kind: 'ok', text: `Invite sent to ${fresh.join(', ')} ✉️` });
      else setNote({ kind: 'warn', text: `Access granted, but the email failed: ${body.error ?? res.statusText}` });
    } catch (e) {
      setNote({ kind: 'err', text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="modal-backdrop" onPointerDown={onClose}>
      <div className="modal share" onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <header>
          <h2>Share “{doc.title}”</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </header>

        <div className="invite-row">
          <input
            autoFocus
            placeholder="Add emails, separated by commas"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && invite()}
          />
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
          <button className="btn primary" disabled={busy || !emails.trim()} onClick={invite}>
            {busy ? 'Sending…' : 'Invite'}
          </button>
        </div>
        {note && <p className={`note ${note.kind}`}>{note.text}</p>}

        <h3>People with access</h3>
        <ul className="people">
          <li>
            <span className="avatar">{doc.ownerName[0]?.toUpperCase()}</span>
            <div>
              <b>{doc.ownerName}{doc.ownerId === user.uid ? ' (you)' : ''}</b>
              <small>{doc.ownerEmail}</small>
            </div>
            <span className="role-fixed">Owner</span>
          </li>
          {Object.entries(doc.members).map(([email, r]) => (
            <li key={email}>
              <span className="avatar">{email[0].toUpperCase()}</span>
              <div>
                <b>{email.split('@')[0]}</b>
                <small>{email}</small>
              </div>
              <select
                value={r}
                onChange={(e) => {
                  const v = e.target.value;
                  const m = { ...doc.members };
                  if (v === 'remove') delete m[email];
                  else m[email] = v as Role;
                  setMembers(m);
                }}
              >
                {(Object.keys(ROLE_LABEL) as Role[]).map((x) => (
                  <option key={x} value={x}>{ROLE_LABEL[x]}</option>
                ))}
                <option value="remove">Remove</option>
              </select>
            </li>
          ))}
        </ul>

        <h3>Link sharing</h3>
        <div className="link-row">
          <div className={`link-icon ${doc.linkRole !== 'none' ? 'on' : ''}`}>🔗</div>
          <div className="link-text">
            <select value={doc.linkRole} onChange={(e) => updateMeta({ linkRole: e.target.value as LinkRole })}>
              <option value="none">Only people added above</option>
              <option value="view">Anyone with the link can view</option>
              <option value="comment">Anyone with the link can comment</option>
              <option value="edit">Anyone with the link can edit</option>
            </select>
            <small>
              {doc.linkRole === 'none'
                ? 'The link only works for people you invited.'
                : doc.linkRole === 'view'
                  ? 'No sign-in needed to view.'
                  : 'Visitors sign in (email or Google) to comment or edit.'}
            </small>
          </div>
          <button className="btn" onClick={copy}>{copied ? 'Copied!' : 'Copy link'}</button>
        </div>
      </div>
    </div>
  );
}
