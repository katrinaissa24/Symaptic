import { useCallback, useEffect, useRef, useState } from 'react';
import { store } from '../lib/store';
import type { Graph, MapDoc, Patch } from '../lib/types';

const COLS = ['nodes', 'edges', 'comments'] as const;
type Col = (typeof COLS)[number];

export type SaveState = 'saved' | 'saving' | 'error';

/**
 * Keeps a local copy of the map in sync with the store.
 * Local edits are diffed per item (node/edge/comment) and written as field-level patches,
 * so two people editing different nodes never overwrite each other.
 */
export function useMapDoc(id: string) {
  const [meta, setMeta] = useState<MapDoc | null>(null);
  const [graph, setGraphState] = useState<Graph | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'denied'>('loading');
  const [save, setSave] = useState<SaveState>('saved');
  const [, setHistoryTick] = useState(0);

  const graphRef = useRef<Graph | null>(null);
  const dirty = useRef(new Set<string>());
  const timer = useRef<number | null>(null);
  const past = useRef<Graph[]>([]);
  const future = useRef<Graph[]>([]);

  const setGraph = (g: Graph) => {
    graphRef.current = g;
    setGraphState(g);
  };

  const flush = useCallback(() => {
    timer.current = null;
    const g = graphRef.current;
    if (!g || !dirty.current.size) return;
    const patch: Patch = {};
    for (const key of dirty.current) {
      const [col, itemId] = key.split('.') as [Col, string];
      patch[key] = g[col][itemId] ?? null;
    }
    dirty.current.clear();
    setSave('saving');
    store.applyPatch(id, patch).then(
      () => setSave(dirty.current.size ? 'saving' : 'saved'),
      (e) => {
        console.error(e);
        setSave('error');
      },
    );
  }, [id]);

  const schedule = useCallback(() => {
    // Throttle rather than debounce so collaborators see drags move live.
    if (timer.current == null) timer.current = window.setTimeout(flush, 180);
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
      setMeta(d);
      const remote: Graph = { nodes: d.nodes ?? {}, edges: d.edges ?? {}, comments: d.comments ?? {} };
      const local = graphRef.current;
      if (local && dirty.current.size) {
        // Keep our own unsent edits on top of what the server says.
        for (const key of dirty.current) {
          const [col, itemId] = key.split('.') as [Col, string];
          const mine = local[col][itemId];
          remote[col] = { ...remote[col] } as never;
          if (mine) (remote[col] as Record<string, unknown>)[itemId] = mine;
          else delete (remote[col] as Record<string, unknown>)[itemId];
        }
      }
      setGraph(remote);
      setStatus('ready');
    });
    return () => {
      unsub();
      if (timer.current != null) {
        clearTimeout(timer.current);
        flush();
      }
    };
  }, [id, flush]);

  const markDiff = (a: Graph, b: Graph) => {
    for (const col of COLS) {
      const keys = new Set([...Object.keys(a[col]), ...Object.keys(b[col])]);
      for (const k of keys) if (a[col][k] !== b[col][k]) dirty.current.add(`${col}.${k}`);
    }
  };

  /** Apply a change. `history: false` is for continuous gestures (drag) whose start was already snapshotted. */
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

  /** Top-level document fields (title, sharing). */
  const updateMeta = useCallback(
    async (patch: Patch) => {
      setMeta((m) => (m ? ({ ...m, ...patch } as MapDoc) : m));
      await store.applyPatch(id, patch);
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
  };
}

export type MapDocApi = ReturnType<typeof useMapDoc>;
