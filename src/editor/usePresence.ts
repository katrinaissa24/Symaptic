import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppUser } from '../lib/types';
import { joinPresence, type PresenceEntry, type PresenceSession } from '../lib/presence';

export interface PresenceApi {
  /** Other people with the map open (one entry per open tab). */
  others: PresenceEntry[];
  setCursor(c: { x: number; y: number } | null): void;
  setSelection(ids: string[]): void;
}

export function usePresence(docId: string, user: AppUser | null, enabled: boolean): PresenceApi {
  const [others, setOthers] = useState<PresenceEntry[]>([]);
  const session = useRef<PresenceSession | null>(null);
  const uid = user?.uid;
  const name = user?.name;
  useEffect(() => {
    if (!enabled || !user || !docId) return;
    const s = joinPresence(docId, user);
    session.current = s;
    const unsub = s.subscribe(setOthers);
    return () => {
      unsub();
      s.leave();
      session.current = null;
      setOthers([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, uid, name, enabled]);
  const setCursor = useCallback((cursor: { x: number; y: number } | null) => session.current?.update({ cursor }), []);
  const setSelection = useCallback((selection: string[]) => session.current?.update({ selection }), []);
  return { others, setCursor, setSelection };
}
