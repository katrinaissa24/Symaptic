import { getFirebase, isFirebaseConfigured } from './firebase';
import type { AccessRole, AppUser, Graph, LinkRole, MapDoc, MapNode, Patch, Role } from './types';
import { ROOT_COLOR } from './palette';

export function uid(prefix = ''): string {
  const a = new Uint8Array(10);
  crypto.getRandomValues(a);
  return prefix + Array.from(a, (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
}

export const SCHEMA_VERSION = 2;

export function rootNode(text = 'Central idea', at = { x: 0, y: 0 }): MapNode {
  return {
    id: uid('n_'),
    x: at.x,
    y: at.y,
    text,
    shape: 'rounded',
    color: ROOT_COLOR,
    fill: 'solid',
    fontSize: 16,
    bold: true,
    borderWidth: 1,
    borderStyle: 'solid',
    root: true,
  };
}

export function starterGraph(): Graph {
  const root = rootNode();
  return { v: SCHEMA_VERSION, nodes: { [root.id]: root }, edges: {}, comments: {} };
}

export function accessFor(d: MapDoc, user: AppUser | null): AccessRole {
  if (user && d.ownerId === user.uid) return 'owner';
  const email = user?.email?.toLowerCase();
  const member = email ? d.members?.[email] : undefined;
  const rank = { none: 0, view: 1, comment: 2, edit: 3 } as const;
  let best: Role | 'none' = member ?? 'none';
  // Link access to comment/edit requires being signed in (mirrors firestore.rules).
  const link: LinkRole = d.linkRole ?? 'none';
  const linkEff: Role | 'none' = !user && link !== 'view' && link !== 'none' ? 'view' : link;
  if (rank[linkEff] > rank[best]) best = linkEff;
  return best;
}

/** Firestore rejects `undefined`; JSON round-trip strips it. */
const clean = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

interface Store {
  listOwned(user: AppUser): Promise<MapDoc[]>;
  listShared(user: AppUser): Promise<MapDoc[]>;
  create(user: AppUser, title: string, graph?: Graph): Promise<string>;
  /**
   * Optimistic create: the id is available immediately and `subscribe(id)` serves the new map
   * while the write is still in flight. `done` rejects if the write failed.
   */
  createOptimistic(user: AppUser, title: string, graph?: Graph): { id: string; done: Promise<void> };
  remove(id: string): Promise<void>;
  /** Rename or otherwise patch top-level fields of a map without opening it. */
  patchMeta(id: string, patch: Patch): Promise<void>;
  subscribe(id: string, cb: (d: MapDoc | null, err?: Error) => void): () => void;
  applyPatch(id: string, patch: Patch): Promise<void>;
}

function newDoc(user: AppUser, id: string, title: string, graph?: Graph): MapDoc {
  const now = Date.now();
  return {
    id,
    title,
    ownerId: user.uid,
    ownerEmail: user.email.toLowerCase(),
    ownerName: user.name,
    members: {},
    memberEmails: [],
    linkRole: 'none',
    createdAt: now,
    updatedAt: now,
    ...(graph ?? starterGraph()),
    // A copied legacy map keeps its (absent) version so it still renders with the legacy mapping.
    v: graph ? graph.v : SCHEMA_VERSION,
  };
}

/** Maps whose first write hasn't been confirmed yet (Firebase only). */
const pending = new Map<string, MapDoc>();

// ---------------------------------------------------------------- Firebase

const firebaseStore: Store = {
  async listOwned(user) {
    const { db, F } = await getFirebase();
    const snap = await F.getDocs(F.query(F.collection(db, 'docs'), F.where('ownerId', '==', user.uid)));
    return snap.docs.map((s) => ({ ...(s.data() as MapDoc), id: s.id }));
  },
  async listShared(user) {
    if (!user.email) return []; // guests have no email to share with
    const { db, F } = await getFirebase();
    const snap = await F.getDocs(F.query(F.collection(db, 'docs'), F.where('memberEmails', 'array-contains', user.email.toLowerCase())));
    return snap.docs.map((s) => ({ ...(s.data() as MapDoc), id: s.id }));
  },
  createOptimistic(user, title, graph) {
    const id = uid();
    const d = newDoc(user, id, title, graph);
    const { id: _omit, ...data } = d;
    void _omit;
    pending.set(id, d);
    const done = getFirebase()
      .then(({ db, F }) => F.setDoc(F.doc(db, 'docs', id), clean(data)))
      .finally(() => pending.delete(id));
    return { id, done };
  },
  async create(user, title, graph) {
    const r = firebaseStore.createOptimistic(user, title, graph);
    await r.done;
    return r.id;
  },
  async remove(id) {
    const { db, F } = await getFirebase();
    await F.deleteDoc(F.doc(db, 'docs', id));
  },
  patchMeta(id, patch) {
    return firebaseStore.applyPatch(id, patch);
  },
  subscribe(id, cb) {
    const p = pending.get(id);
    if (p) queueMicrotask(() => cb(p));
    let unsub: (() => void) | null = null;
    let cancelled = false;
    getFirebase().then(
      ({ db, F }) => {
        if (cancelled) return;
        unsub = F.onSnapshot(
          F.doc(db, 'docs', id),
          (s) => {
            if (!s.exists() && pending.has(id)) return; // still being written
            cb(s.exists() ? ({ ...(s.data() as MapDoc), id: s.id }) : null);
          },
          (err) => cb(null, err),
        );
      },
      (err: Error) => cb(null, err),
    );
    return () => {
      cancelled = true;
      unsub?.();
    };
  },
  async applyPatch(id, patch) {
    const { db, F } = await getFirebase();
    const data: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [k, v] of Object.entries(patch)) data[k] = v === null ? F.deleteField() : clean(v);
    await F.updateDoc(F.doc(db, 'docs', id), data);
  },
};

// ---------------------------------------------------------------- Local demo

const KEY = 'symaptic:docs';
const listeners = new Map<string, Set<(d: MapDoc | null) => void>>();

function readAll(): Record<string, MapDoc> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}
function writeAll(all: Record<string, MapDoc>) {
  localStorage.setItem(KEY, JSON.stringify(all));
}
function emit(id: string) {
  const d = readAll()[id] ?? null;
  listeners.get(id)?.forEach((cb) => cb(d));
}
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) listeners.forEach((_, id) => emit(id));
  });
}

const localStore: Store = {
  async listOwned(user) {
    return Object.values(readAll()).filter((d) => d.ownerId === user.uid);
  },
  async listShared(user) {
    if (!user.email) return [];
    return Object.values(readAll()).filter((d) => d.memberEmails.includes(user.email.toLowerCase()));
  },
  createOptimistic(user, title, graph) {
    const id = uid();
    const all = readAll();
    all[id] = newDoc(user, id, title, graph);
    writeAll(all);
    return { id, done: Promise.resolve() };
  },
  async create(user, title, graph) {
    return localStore.createOptimistic(user, title, graph).id;
  },
  async remove(id) {
    const all = readAll();
    delete all[id];
    writeAll(all);
    emit(id);
  },
  patchMeta(id, patch) {
    return localStore.applyPatch(id, patch);
  },
  subscribe(id, cb) {
    if (!listeners.has(id)) listeners.set(id, new Set());
    listeners.get(id)!.add(cb);
    queueMicrotask(() => cb(readAll()[id] ?? null));
    return () => listeners.get(id)?.delete(cb);
  },
  async applyPatch(id, patch) {
    const all = readAll();
    const d = all[id] as unknown as Record<string, Record<string, unknown>>;
    if (!d) return;
    for (const [path, v] of Object.entries(patch)) {
      const [top, key] = path.split(/\.(.+)/);
      if (key === undefined) {
        if (v === null) delete d[top];
        else d[top] = clean(v) as Record<string, unknown>;
      } else {
        d[top] = { ...(d[top] ?? {}) };
        if (v === null) delete d[top][key];
        else d[top][key] = clean(v);
      }
    }
    (d as unknown as MapDoc).updatedAt = Date.now();
    writeAll(all);
    emit(id);
  },
};

export const store: Store = isFirebaseConfigured ? firebaseStore : localStore;
