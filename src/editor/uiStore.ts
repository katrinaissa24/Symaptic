import { create } from 'zustand';

/**
 * Transient editor UI state. Lives outside React Flow and outside the document so that nodes can
 * subscribe to exactly the slice they need (e.g. "am I being edited?") instead of re-rendering
 * whenever anything in the editor changes.
 */
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
  dragging: boolean;
  sprout: SproutState | null;
  /** How many modal layers (dialogs, menus, palette) are open. Canvas shortcuts pause while > 0. */
  modalDepth: number;
  setEditingId(id: string | null): void;
  setOpenCommentId(id: string | null): void;
  setConnectingFrom(id: string | null): void;
  setDragging(v: boolean): void;
  setSprout(s: SproutState | null): void;
  pushModal(): void;
  popModal(): void;
}

export const useUIStore = create<UIState>((set) => ({
  editingId: null,
  openCommentId: null,
  connectingFrom: null,
  dragging: false,
  sprout: null,
  modalDepth: 0,
  setEditingId: (editingId) => set((s) => (s.editingId === editingId ? s : { editingId })),
  setOpenCommentId: (openCommentId) => set((s) => (s.openCommentId === openCommentId ? s : { openCommentId })),
  setConnectingFrom: (connectingFrom) => set((s) => (s.connectingFrom === connectingFrom ? s : { connectingFrom })),
  setDragging: (dragging) => set((s) => (s.dragging === dragging ? s : { dragging })),
  setSprout: (sprout) => set({ sprout }),
  pushModal: () => set((s) => ({ modalDepth: s.modalDepth + 1 })),
  popModal: () => set((s) => ({ modalDepth: Math.max(0, s.modalDepth - 1) })),
}));

export const isModalOpen = () => useUIStore.getState().modalDepth > 0;
