import { createContext, useContext } from 'react';
import type { AppUser, MapComment } from '../lib/types';
import type { Dir } from './ops';

/**
 * Stable editor actions shared with node components. Everything here is referentially stable for
 * the life of the editor (callbacks read the latest closures through a ref), so a context update
 * never forces every node to re-render. Per-node state (editing, open comment) lives in uiStore.
 */
export interface EditorActions {
  user: AppUser | null;
  canEdit: boolean;
  canComment: boolean;
  setEditingId(id: string | null): void;
  setNodeText(id: string, text: string): void;
  /** Tab while typing: save text and grow a child. */
  textThenChild(id: string, text: string): void;
  /** Enter while typing: save text and add a sibling. */
  textThenSibling(id: string, text: string): void;
  startSprout(id: string, dir: Dir, e: React.PointerEvent): void;
  setOpenCommentId(id: string | null): void;
  updateComment(id: string, props: Partial<MapComment>): void;
  deleteComment(id: string): void;
}

export const EditorContext = createContext<EditorActions | null>(null);

export function useEditor(): EditorActions {
  const v = useContext(EditorContext);
  if (!v) throw new Error('useEditor outside editor');
  return v;
}
