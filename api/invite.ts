// Vercel serverless function: POST /api/invite
// Emails people who were just given access to a map. Uses Resend (https://resend.com).
//
// Security without a Firebase service account:
//  1. Verify the caller's Firebase ID token against Google's public keys.
//  2. Read the map through the Firestore REST API *as the caller*, so Firestore rules apply,
//     and check they own it and that each invitee really is a member.
import { createRemoteJWKSet, jwtVerify } from 'jose';
import tokens from './_tokens.json' with { type: 'json' };

// Light-theme colours from src/styles/tokens.css (regenerate with `npm run tokens`).
const t = (name: string) => (tokens as Record<string, string>)[name];

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '';
const JWKS = createRemoteJWKSet(
  new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'),
);

const ROLE_TEXT: Record<string, string> = {
  view: 'view',
  comment: 'view and comment on',
  edit: 'edit',
};

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function emailHtml(o: { inviter: string; title: string; role: string; url: string }) {
  return `<!doctype html><html><body style="margin:0;background:${t('color-bg')};font-family:Inter,-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${t('color-text')}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${t('color-surface')};border:1px solid ${t('color-border')};border-radius:12px">
    <tr><td style="padding:28px 32px 4px;font-size:14px;color:${t('color-text-3')};font-weight:600">Symaptic</td></tr>
    <tr><td style="padding:0 32px;font-size:20px;font-weight:600;line-height:1.3">
      ${esc(o.inviter)} invited you to ${ROLE_TEXT[o.role] ?? 'view'} “${esc(o.title)}”
    </td></tr>
    <tr><td style="padding:12px 32px 0;font-size:14px;line-height:1.5;color:${t('color-text-2')}">
      Sign in with this email address (or Google) to open the mind map.
    </td></tr>
    <tr><td style="padding:24px 32px 32px">
      <a href="${o.url}" style="display:inline-block;background:${t('color-accent')};color:${t('color-text-on-accent')};text-decoration:none;font-weight:600;padding:10px 18px;border-radius:6px;font-size:14px">Open the map</a>
    </td></tr>
  </table>
  <p style="font-size:12px;color:${t('color-text-3')}">If you weren’t expecting this, you can ignore it.</p>
  </td></tr></table></body></html>`;
}

type Req = { method?: string; headers: Record<string, string | string[] | undefined>; body: unknown };
type Res = { status(n: number): Res; json(b: unknown): void };

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY is not set on the server' });
  if (!PROJECT_ID) return res.status(500).json({ error: 'FIREBASE_PROJECT_ID is not set on the server' });

  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  let inviterName = 'Someone';
  let uid = '';
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    inviterName = String(payload.name || payload.email || inviterName);
    uid = String(payload.sub);
  } catch {
    return res.status(401).json({ error: 'Not signed in' });
  }

  const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as { docId?: string; emails?: string[] };
  const docId = String(body?.docId || '');
  const emails = (body?.emails || []).map((e) => String(e).toLowerCase()).slice(0, 25);
  if (!/^[a-z0-9]{6,40}$/.test(docId) || !emails.length) return res.status(400).json({ error: 'Bad request' });

  const r = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/docs/${docId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!r.ok) return res.status(403).json({ error: 'Cannot read that map' });
  const doc = (await r.json()) as { fields: Record<string, any> }; // eslint-disable-line @typescript-eslint/no-explicit-any
  const f = doc.fields;
  if (f.ownerId?.stringValue !== uid) return res.status(403).json({ error: 'Only the owner can send invites' });
  const members: Record<string, { stringValue?: string }> = f.members?.mapValue?.fields || {};
  const title = f.title?.stringValue || 'Untitled map';
  inviterName = f.ownerName?.stringValue || inviterName;

  const origin = process.env.APP_URL || `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
  const url = `${origin.replace(/\/$/, '')}/d/${docId}`;
  const from = process.env.EMAIL_FROM || 'Symaptic <onboarding@resend.dev>';

  const results = await Promise.all(
    emails.map(async (to) => {
      const role = members[to]?.stringValue;
      if (!role) return { to, ok: false, error: 'not a member' };
      const send = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to,
          subject: `${inviterName} shared “${title}” with you`,
          html: emailHtml({ inviter: inviterName, title, role, url }),
        }),
      });
      const j = (await send.json().catch(() => ({}))) as { message?: string };
      return { to, ok: send.ok, error: send.ok ? undefined : j.message || send.statusText };
    }),
  );
  const failed = results.filter((x) => !x.ok);
  if (failed.length) return res.status(502).json({ error: failed.map((x) => `${x.to}: ${x.error}`).join('; '), results });
  return res.status(200).json({ ok: true, results });
}
