import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import type { AccessRole, AppUser, Graph, LinkRole, MapDoc, Patch, Role } from './types';
import { ROOT_COLOR } from './palette';

export function uid(prefix = ''): string {
  const a = new Uint8Array(10);
  crypto.getRandomValues(a);
  return prefix + Array.from(a, (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
}

export function starterGraph(): Graph {
  const rootId = uid('n_');
  return {
    nodes: {
      [rootId]: {
        id: rootId,
        x: 0,
        y: 0,
        text: 'Central idea',
        shape: 'rounded',
        color: ROOT_COLOR,
        fill: 'solid',
        fontSize: 20,
        bold: true,
        borderWidth: 2,
        borderStyle: 'solid',
        root: true,
      },
    },
    edges: {},
    comments: {},
  };
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
  create(user: AppUser, title: string): Promise<string>;
  remove(id: string): Promise<void>;
  subscribe(id: string, cb: (d: MapDoc | null, err?: Error) => void): () => void;
  applyPatch(id: string, patch: Patch): Promise<void>;
}

function newDoc(user: AppUser, id: string, title: string): MapDoc {
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
    ...starterGraph(),
  };
}

// ---------------------------------------------------------------- Firebase

const firebaseStore: Store = {
  async listOwned(user) {
    const snap = await getDocs(query(collection(db!, 'docs'), where('ownerId', '==', user.uid)));
    return snap.docs.map((s) => ({ ...(s.data() as MapDoc), id: s.id }));
  },
  async listShared(user) {
    const snap = await getDocs(
      query(collection(db!, 'docs'), where('memberEmails', 'array-contains', user.email.toLowerCase())),
    );
    return snap.docs.map((s) => ({ ...(s.data() as MapDoc), id: s.id }));
  },
  async create(user, title) {
    const id = uid();
    const { id: _omit, ...data } = newDoc(user, id, title);
    void _omit;
    await setDoc(doc(db!, 'docs', id), clean(data));
    return id;
  },
  async remove(id) {
    await deleteDoc(doc(db!, 'docs', id));
  },
  subscribe(id, cb) {
    return onSnapshot(
      doc(db!, 'docs', id),
      (s) => cb(s.exists() ? ({ ...(s.data() as MapDoc), id: s.id }) : null),
      (err) => cb(null, err),
    );
  },
  async applyPatch(id, patch) {
    const data: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [k, v] of Object.entries(patch)) data[k] = v === null ? deleteField() : clean(v);
    await updateDoc(doc(db!, 'docs', id), data);
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
    return Object.values(readAll()).filter((d) => d.memberEmails.includes(user.email.toLowerCase()));
  },
  async create(user, title) {
    const id = uid();
    const all = readAll();
    all[id] = newDoc(user, id, title);
    writeAll(all);
    return id;
  },
  async remove(id) {
    const all = readAll();
    delete all[id];
    writeAll(all);
    emit(id);
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
