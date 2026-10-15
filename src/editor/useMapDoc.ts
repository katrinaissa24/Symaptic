import { useCallback, useEffect, useRef, useState } from 'react';
import { store } from '../lib/store';
import type { Graph, MapDoc, Patch } from '../lib/types';
import { toast } from '../components/Toast';

const COLS = ['nodes', 'edges', 'comments'] as const;
type Col = (typeof COLS)[number];

/** Saves wait this long after the last edit… */
const DEBOUNCE_MS = 600;
/** …but never longer than this since the first unsaved edit. */
const MAX_WAIT_MS = 2500;

export type SaveState = 'saved' | 'saving' | 'error' | 'offline';

function sameItem(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    const va = (a as Record<string, unknown>)[k];
    const vb = (b as Record<string, unknown>)[k];
    if (va === vb) continue;
    if (typeof va === 'object' && typeof vb === 'object') {
      if (JSON.stringify(va) !== JSON.stringify(vb)) return false;
    } else return false;
  }
  return true;
}

/** Keep local item objects when the remote copy is identical, so unchanged nodes keep their identity. */
function reuseCollection<T>(local: Record<string, T> | undefined, remote: Record<string, T>): Record<string, T> {
  if (!local) return remote;
  const out: Record<string, T> = {};
  let identical = Object.keys(local).length === Object.keys(remote).length;
  for (const [k, v] of Object.entries(remote)) {
    const l = local[k];
    if (l !== undefined && sameItem(l, v)) out[k] = l;
    else {
      out[k] = v;
      identical = false;
    }
  }
  return identical ? local : out;
}

/**
 * Keeps a local copy of the map in sync with the store.
 * Local edits are diffed per item (node/edge/comment) and written as field-level patches,
 * so two people editing different nodes never overwrite each other. Saves are debounced.
 */
export function useMapDoc(id: string) {
  const [meta, setMeta] = useState<MapDoc | null>(null);
  const [graph, setGraphState] = useState<Graph | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'denied'>('loading');
  const [save, setSave] = useState<SaveState>('saved');
  const [, setHistoryTick] = useState(0);

  const graphRef = useRef<Graph | null>(null);
  const dirty = useRef(new Set<string>());
  const firstDirtyAt = useRef(0);
  const inflight = useRef(0);
  const timer = useRef<number | null>(null);
  const past = useRef<Graph[]>([]);
  const future = useRef<Graph[]>([]);

  const setGraph = (g: Graph) => {
    graphRef.current = g;
    setGraphState(g);
  };

  const flush = useCallback(() => {
    if (timer.current != null) clearTimeout(timer.current);
    timer.current = null;
    const g = graphRef.current;
    if (!g || !dirty.current.size) return;
    if (!navigator.onLine) {
      setSave('offline');
      return;
    }
    const keys = [...dirty.current];
    const patch: Patch = {};
    for (const key of keys) {
      const [col, itemId] = key.split('.') as [Col, string];
      patch[key] = g[col][itemId] ?? null;
    }
    dirty.current.clear();
    firstDirtyAt.current = 0;
    inflight.current++;
    setSave('saving');
    store.applyPatch(id, patch).then(
      () => {
        inflight.current--;
        setSave(dirty.current.size || inflight.current ? 'saving' : 'saved');
      },
      (e) => {
        inflight.current--;
        console.error(e);
        // Put the failed keys back so a retry (or the next edit) sends them again.
        for (const k of keys) dirty.current.add(k);
        if (!firstDirtyAt.current) firstDirtyAt.current = Date.now();
        setSave((prev) => {
          if (prev !== 'error') toast.error('Couldn’t save your changes', { description: (e as Error).message, action: { label: 'Retry', onClick: () => flushRef.current() } });
          return 'error';
        });
      },
    );
  }, [id]);

  const flushRef = useRef(flush);
  flushRef.current = flush;

  const schedule = useCallback(() => {
    const now = Date.now();
    if (!firstDirtyAt.current) firstDirtyAt.current = now;
    if (timer.current != null) clearTimeout(timer.current);
    const wait = Math.max(0, Math.min(DEBOUNCE_MS, MAX_WAIT_MS - (now - firstDirtyAt.current)));
    timer.current = window.setTimeout(flush, wait);
  }, [flush]);

  // Retry automatically when the connection comes back; flush when the tab is hidden.
  useEffect(() => {
    const online = () => {
      if (dirty.current.size) flush();
      else setSave((s) => (s === 'offline' ? 'saved' : s));
    };
    const offline = () => setSave((s) => (dirty.current.size || inflight.current ? 'offline' : s));
    const hidden = () => document.visibilityState === 'hidden' && dirty.current.size && flush();
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current.size || inflight.current) {
        flush();
        e.preventDefault();
      }
    };
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [flush]);

  useEffect(() => {
    setStatus('loading');
    past.current = [];
    future.current = [];
    const unsub = store.subscribe(id, (d, err) => {
      if (err) {
        setStatus('denied');
        return;
      }
      if (!d) {
        setStatus('missing');
        return;
      }
      setMeta((m) => (m && sameItem(m, d) ? m : d));
      const local = graphRef.current;
      let remote: Graph = {
        v: d.v,
        nodes: reuseCollection(local?.nodes, d.nodes ?? {}),
        edges: reuseCollection(local?.edges, d.edges ?? {}),
        comments: reuseCollection(local?.comments, d.comments ?? {}),
      };
      if (local && dirty.current.size) {
        // Keep our own unsent edits on top of what the server says.
        for (const key of dirty.current) {
          const [col, itemId] = key.split('.') as [Col, string];
          const mine = local[col][itemId];
          remote = { ...remote, [col]: { ...remote[col] } };
          if (mine) (remote[col] as Record<string, unknown>)[itemId] = mine;
          else delete (remote[col] as Record<string, unknown>)[itemId];
        }
      }
      if (local && remote.nodes === local.nodes && remote.edges === local.edges && remote.comments === local.comments) remote = local;
      if (remote !== local) setGraph(remote);
      setStatus('ready');
    });
    return () => {
      unsub();
      if (dirty.current.size) flush();
    };
  }, [id, flush]);

  const markDiff = (a: Graph, b: Graph) => {
    for (const col of COLS) {
      if (a[col] === b[col]) continue;
      const keys = new Set([...Object.keys(a[col]), ...Object.keys(b[col])]);
      for (const k of keys) if (a[col][k] !== b[col][k]) dirty.current.add(`${col}.${k}`);
    }
  };

  /** Apply a change. `history: false` is for gestures (drag) whose start was already snapshotted. */
  const commit = useCallback(
    (fn: (g: Graph) => Graph, opts: { history?: boolean } = {}) => {
      const prev = graphRef.current;
      if (!prev) return;
      const next = fn(prev);
      if (next === prev) return;
      if (opts.history !== false) {
        past.current.push(prev);
        if (past.current.length > 150) past.current.shift();
        future.current = [];
        setHistoryTick((t) => t + 1);
      }
      markDiff(prev, next);
      setGraph(next);
      schedule();
    },
    [schedule],
  );

  const snapshot = useCallback(() => {
    if (!graphRef.current) return;
    past.current.push(graphRef.current);
    future.current = [];
    setHistoryTick((t) => t + 1);
  }, []);

  const travel = useCallback(
    (from: React.RefObject<Graph[]>, to: React.RefObject<Graph[]>) => {
      const cur = graphRef.current;
      const next = from.current.pop();
      if (!cur || !next) return;
      to.current.push(cur);
      markDiff(cur, next);
      setGraph(next);
      setHistoryTick((t) => t + 1);
      schedule();
    },
    [schedule],
  );
  const undo = useCallback(() => travel(past, future), [travel]);
  const redo = useCallback(() => travel(future, past), [travel]);

  /** Top-level document fields (title, sharing). Applied optimistically, rolled back on failure. */
  const updateMeta = useCallback(
    async (patch: Patch) => {
      let before: MapDoc | null = null;
      setMeta((m) => {
        before = m;
        return m ? ({ ...m, ...patch } as MapDoc) : m;
      });
      try {
        await store.applyPatch(id, patch);
      } catch (e) {
        if (before) setMeta(before);
        throw e;
      }
    },
    [id],
  );

  return {
    meta,
    graph,
    status,
    save,
    commit,
    snapshot,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    updateMeta,
    retrySave: flush,
  };
}

export type MapDocApi = ReturnType<typeof useMapDoc>;
