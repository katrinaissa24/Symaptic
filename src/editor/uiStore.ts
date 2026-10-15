import { create } from 'zustand';
import type { Guide } from './snap';

/**
 * Transient editor UI state. Lives outside React Flow and outside the document so that nodes can
 * subscribe to exactly the slice they need (e.g. "am I being edited?") instead of re-rendering
 * whenever anything in the editor changes.
 */
export type Tool = 'select' | 'hand';

export interface SproutState {
  from: string;
  x: number;
  y: number;
  moved: boolean;
}

interface UIState {
  editingId: string | null;
  openCommentId: string | null;
  connectingFrom: string | null;
  /** Idea under the pointer (drives the shared + buttons). */
  hoverId: string | null;
  tool: Tool;
  dragging: boolean;
  sprout: SproutState | null;
  /** Alignment guides shown while dragging. */
  guides: Guide[];
  /** How many modal layers (dialogs, menus, palette) are open. Canvas shortcuts pause while > 0. */
  modalDepth: number;
  setEditingId(id: string | null): void;
  setOpenCommentId(id: string | null): void;
  setConnectingFrom(id: string | null): void;
  setHoverId(id: string | null): void;
  setTool(t: Tool): void;
  setDragging(v: boolean): void;
  setSprout(s: SproutState | null): void;
  setGuides(g: Guide[]): void;
  pushModal(): void;
  popModal(): void;
}

export const useUIStore = create<UIState>((set) => ({
  editingId: null,
  openCommentId: null,
  connectingFrom: null,
  hoverId: null,
  tool: 'select',
  dragging: false,
  sprout: null,
  guides: [],
  modalDepth: 0,
  setEditingId: (editingId) => set((s) => (s.editingId === editingId ? s : { editingId })),
  setOpenCommentId: (openCommentId) => set((s) => (s.openCommentId === openCommentId ? s : { openCommentId })),
  setConnectingFrom: (connectingFrom) => set((s) => (s.connectingFrom === connectingFrom ? s : { connectingFrom })),
  setTool: (tool) => set((s) => (s.tool === tool ? s : { tool })),
  setHoverId: (hoverId) => set((s) => (s.hoverId === hoverId ? s : { hoverId })),
  setDragging: (dragging) => set((s) => (s.dragging === dragging ? s : { dragging })),
  setSprout: (sprout) => set({ sprout }),
  setGuides: (guides) => set((s) => (s.guides.length === 0 && guides.length === 0 ? s : { guides })),
  pushModal: () => set((s) => ({ modalDepth: s.modalDepth + 1 })),
  popModal: () => set((s) => ({ modalDepth: Math.max(0, s.modalDepth - 1) })),
}));

export const isModalOpen = () => useUIStore.getState().modalDepth > 0;
