import { useState } from 'react';
import { Globe, Link2, Lock, Mail } from 'lucide-react';
import type { AppUser, LinkRole, MapDoc, Patch, Role } from '../lib/types';
import { isFirebaseConfigured } from '../lib/firebase';
import { Avatar, Button, Dialog, Field, Input, Select } from './ui';
import { toast } from './Toast';

const ROLE_LABEL: Record<Role, string> = { view: 'Can view', comment: 'Can comment', edit: 'Can edit' };
const ROLE_OPTIONS = (Object.keys(ROLE_LABEL) as Role[]).map((r) => ({ value: r, label: ROLE_LABEL[r] }));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type MemberChoice = Role | 'remove';

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
  const [error, setError] = useState('');
  const [note, setNote] = useState<{ kind: 'ok' | 'warn'; text: string } | null>(null);
  const link = `${window.location.origin}/d/${doc.id}`;

  const parsed = emails
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const invalid = parsed.filter((e) => !EMAIL_RE.test(e));

  const setMembers = (members: Record<string, Role>) => updateMeta({ members, memberEmails: Object.keys(members) });

  const invite = async () => {
    if (!parsed.length) return;
    if (invalid.length) return setError(`Not an email: ${invalid.join(', ')}`);
    const fresh = parsed.filter((e) => e !== doc.ownerEmail);
    setBusy(true);
    setError('');
    setNote(null);
    try {
      const members = { ...doc.members };
      for (const e of fresh) members[e] = role;
      await setMembers(members);
      setEmails('');
      const noEmail = `Added. They’ll see it under “Shared with me” once they sign in with ${fresh.length > 1 ? 'those emails' : 'that email'}. Invite emails aren’t set up, so copy the link below and send it to them.`;
      if (!isFirebaseConfigured) {
        setNote({ kind: 'ok', text: noEmail });
        return;
      }
      const token = await getIdToken();
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ docId: doc.id, emails: fresh }),
      }).catch(() => null);
      const body = res ? await res.json().catch(() => ({})) : {};
      if (res?.ok) toast.success(`Invite sent to ${fresh.join(', ')}`);
      else if (!res || res.status === 404 || (res.status === 500 && /RESEND/.test(body.error ?? ''))) setNote({ kind: 'ok', text: noEmail });
      else setNote({ kind: 'warn', text: `Access granted, but the email failed: ${body.error ?? res.statusText}` });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copied');
    } catch {
      toast.error('Couldn’t copy the link', { description: link });
    }
  };

  const linkOptions: { value: LinkRole; label: string; description: string }[] = [
    { value: 'none', label: 'Only people invited', description: 'The link works for people you added' },
    { value: 'view', label: 'Anyone with the link can view', description: 'No sign-in needed' },
    { value: 'comment', label: 'Anyone with the link can comment', description: 'Visitors sign in to comment' },
    { value: 'edit', label: 'Anyone with the link can edit', description: 'Visitors sign in to edit' },
  ];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={`Share “${doc.title}”`} width={520}>
      <form
        className="share-invite"
        onSubmit={(e) => {
          e.preventDefault();
          invite();
        }}
      >
        <Field label="Invite people" error={error || (invalid.length && emails.includes(' ') ? `Check: ${invalid.join(', ')}` : undefined)}>
          {(f) => (
            <div className="share-invite-row">
              <Input
                id={f.id}
                icon={<Mail />}
                placeholder="Emails, separated by commas"
                value={emails}
                autoFocus
                invalid={f.invalid}
                aria-describedby={f.describedBy}
                onChange={(e) => {
                  setEmails(e.target.value);
                  setError('');
                }}
              />
              <Select<Role> ariaLabel="Access level for invitees" value={role} onValueChange={setRole} options={ROLE_OPTIONS} />
              <Button type="submit" variant="primary" disabled={busy || !parsed.length}>
                {busy ? 'Sending…' : 'Invite'}
              </Button>
            </div>
          )}
        </Field>
      </form>
      {note && <p className={`note ${note.kind}`}>{note.text}</p>}

      <h3 className="share-heading">People with access</h3>
      <ul className="people">
        <li>
          <Avatar name={doc.ownerName} user={{ name: doc.ownerName, email: doc.ownerEmail }} />
          <div className="people-who">
            <span className="truncate">
              {doc.ownerName}
              {doc.ownerId === user.uid ? ' (you)' : ''}
            </span>
            <small className="truncate">{doc.ownerEmail}</small>
          </div>
          <span className="muted text-sm">Owner</span>
        </li>
        {Object.entries(doc.members).map(([email, r]) => (
          <li key={email}>
            <Avatar name={email} user={{ name: email.split('@')[0], email }} />
            <div className="people-who">
              <span className="truncate">{email.split('@')[0]}</span>
              <small className="truncate">{email}</small>
            </div>
            <Select<MemberChoice>
              ariaLabel={`Access for ${email}`}
              variant="ghost"
              value={r}
              onValueChange={(v) => {
                const m = { ...doc.members };
                if (v === 'remove') delete m[email];
                else m[email] = v;
                setMembers(m).catch((e: Error) => toast.error('Couldn’t update access', { description: e.message }));
              }}
              options={[...ROLE_OPTIONS, { value: 'remove', label: 'Remove access' }]}
            />
          </li>
        ))}
      </ul>

      <h3 className="share-heading">Link sharing</h3>
      <div className="share-link">
        <span className={`share-link-icon${doc.linkRole !== 'none' ? ' is-on' : ''}`} aria-hidden>
          {doc.linkRole === 'none' ? <Lock /> : <Globe />}
        </span>
        <div className="share-link-body">
          <Select<LinkRole>
            ariaLabel="Link access"
            variant="ghost"
            value={doc.linkRole}
            onValueChange={(linkRole) => updateMeta({ linkRole }).catch((e: Error) => toast.error('Couldn’t update link sharing', { description: e.message }))}
            options={linkOptions}
          />
          <small className="muted">{linkOptions.find((o) => o.value === doc.linkRole)?.description}</small>
        </div>
        <Button icon={<Link2 />} onClick={copy}>
          Copy link
        </Button>
      </div>
    </Dialog>
  );
}
