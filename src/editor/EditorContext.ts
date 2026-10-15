import { createContext, useContext } from 'react';
import type { AppUser, MapComment } from '../lib/types';
import type { Dir } from './ops';

export interface EditorCtx {
  user: AppUser | null;
  canEdit: boolean;
  canComment: boolean;
  editingId: string | null;
  setEditingId(id: string | null): void;
  setNodeText(id: string, text: string): void;
  /** Tab while typing: save text and grow a child. */
  textThenChild(id: string, text: string): void;
  startSprout(id: string, dir: Dir, e: React.PointerEvent): void;
  openCommentId: string | null;
  setOpenCommentId(id: string | null): void;
  updateComment(id: string, props: Partial<MapComment>): void;
  deleteComment(id: string): void;
  connectingFrom: string | null;
}

export const EditorContext = createContext<EditorCtx | null>(null);

export function useEditor(): EditorCtx {
  const v = useContext(EditorContext);
  if (!v) throw new Error('useEditor outside editor');
  return v;
}
