import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { PALETTE } from './palette';
import type { AppUser } from './types';

/**
 * Presence: who is looking at a map right now, where their pointer is and what they selected.
 *
 * Firebase: one document per open tab under docs/{id}/presence/{clientId}. Cursor updates are
 * coalesced to at most one write every PUSH_MS; a heartbeat refreshes lastSeen; entries older
 * than STALE_MS are ignored, so a closed laptop disappears without a server-side cleanup.
 * Demo mode: the same protocol over a BroadcastChannel between tabs of this browser.
 */
export interface PresenceEntry {
  clientId: string;
  uid: string;
  name: string;
  /** Palette key, e.g. "blue". */
  color: string;
  cursor: { x: number; y: number } | null;
  selection: string[];
  lastSeen: number;
}

export interface PresenceSession {
  update(patch: Partial<Pick<PresenceEntry, 'cursor' | 'selection'>>): void;
  subscribe(cb: (others: PresenceEntry[]) => void): () => void;
  leave(): void;
}

const PUSH_MS = isFirebaseConfigured ? 250 : 80;
const HEARTBEAT_MS = 20_000;
const STALE_MS = 45_000;
const SWEEP_MS = 10_000;

const CURSOR_COLORS = PALETTE.filter((p) => p.key !== 'gray').map((p) => p.key);

/** Stable colour per person, from their uid. */
export function presenceColor(uid: string): string {
  let h = 0;
  for (let i = 0; i < uid.length; i++) h = (h * 31 + uid.charCodeAt(i)) >>> 0;
  return CURSOR_COLORS[h % CURSOR_COLORS.length];
}

const clientId = (() => {
  try {
    const k = 'symaptic:client';
    let v = sessionStorage.getItem(k);
    if (!v) sessionStorage.setItem(k, (v = Math.random().toString(36).slice(2, 10)));
    return v;
  } catch {
    return Math.random().toString(36).slice(2, 10);
  }
})();

function fresh(entries: Iterable<PresenceEntry>, now = Date.now()): PresenceEntry[] {
  return [...entries].filter((e) => e.clientId !== clientId && now - e.lastSeen < STALE_MS);
}

/** Shared throttling/heartbeat logic; `send` writes the full entry, `remove` deletes it. */
function makeSession(entry: PresenceEntry, send: (e: PresenceEntry) => void, remove: () => void): Pick<PresenceSession, 'update' | 'leave'> & { current(): PresenceEntry } {
  let cur = entry;
  let timer: number | null = null;
  let dirty = false;
  const flush = () => {
    timer = null;
    if (!dirty) return;
    dirty = false;
    cur = { ...cur, lastSeen: Date.now() };
    send(cur);
  };
  const heartbeat = window.setInterval(() => {
    cur = { ...cur, lastSeen: Date.now() };
    send(cur);
  }, HEARTBEAT_MS);
  send(cur);
  const leave = () => {
    clearInterval(heartbeat);
    if (timer != null) clearTimeout(timer);
    remove();
  };
  window.addEventListener('pagehide', leave, { once: true });
  return {
    current: () => cur,
    update(patch) {
      cur = { ...cur, ...patch };
      dirty = true;
      if (timer == null) timer = window.setTimeout(flush, PUSH_MS);
    },
    leave() {
      window.removeEventListener('pagehide', leave);
      leave();
    },
  };
}

function firebaseJoin(docId: string, entry: PresenceEntry): PresenceSession {
  const ref = doc(db!, 'docs', docId, 'presence', entry.clientId);
  const base = makeSession(
    entry,
    (e) => void setDoc(ref, e, { merge: true }).catch(() => {}),
    () => void deleteDoc(ref).catch(() => {}),
  );
  return {
    ...base,
    subscribe(cb) {
      let latest = new Map<string, PresenceEntry>();
      const emit = () => cb(fresh(latest.values()));
      const unsub = onSnapshot(collection(db!, 'docs', docId, 'presence'), (snap) => {
        latest = new Map(snap.docs.map((d) => [d.id, d.data() as PresenceEntry]));
        emit();
      }, () => {});
      const sweep = window.setInterval(emit, SWEEP_MS);
      return () => {
        unsub();
        clearInterval(sweep);
      };
    },
  };
}

function localJoin(docId: string, entry: PresenceEntry): PresenceSession {
  const channel = new BroadcastChannel(`symaptic:presence:${docId}`);
  const peers = new Map<string, PresenceEntry>();
  const listeners = new Set<(o: PresenceEntry[]) => void>();
  const emit = () => {
    const list = fresh(peers.values());
    listeners.forEach((l) => l(list));
  };
  const base = makeSession(
    entry,
    (e) => channel.postMessage({ type: 'presence', entry: e }),
    () => channel.postMessage({ type: 'leave', clientId }),
  );
  channel.onmessage = (ev: MessageEvent) => {
    const m = ev.data as { type: string; entry?: PresenceEntry; clientId?: string };
    if (m.type === 'presence' && m.entry) peers.set(m.entry.clientId, m.entry);
    else if (m.type === 'leave' && m.clientId) peers.delete(m.clientId);
    else if (m.type === 'hello') channel.postMessage({ type: 'presence', entry: base.current() });
    emit();
  };
  channel.postMessage({ type: 'hello' });
  const sweep = window.setInterval(emit, SWEEP_MS);
  return {
    update: base.update,
    subscribe(cb) {
      listeners.add(cb);
      cb(fresh(peers.values()));
      return () => listeners.delete(cb);
    },
    leave() {
      base.leave();
      clearInterval(sweep);
      channel.close();
    },
  };
}

export function joinPresence(docId: string, user: AppUser): PresenceSession {
  const entry: PresenceEntry = { clientId, uid: user.uid, name: user.name, color: presenceColor(user.uid), cursor: null, selection: [], lastSeen: Date.now() };
  return isFirebaseConfigured ? firebaseJoin(docId, entry) : localJoin(docId, entry);
}
