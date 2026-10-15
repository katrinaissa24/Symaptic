import { useEffect } from 'react';
import { useUIStore } from '../../editor/uiStore';

/**
 * Registers an open overlay (dialog, menu, popover, palette) so canvas keyboard shortcuts are
 * paused while it is open. Delete, Undo and friends never fire behind a dialog.
 */
export function useModalLayer(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const s = useUIStore.getState();
    s.pushModal();
    return () => useUIStore.getState().popModal();
  }, [open]);
}
