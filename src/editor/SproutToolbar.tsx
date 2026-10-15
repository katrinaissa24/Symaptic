import { memo, useEffect, useRef } from 'react';
import { NodeToolbar, Position } from '@xyflow/react';
import { Plus } from 'lucide-react';
import { useEditor } from './EditorContext';
import { useUIStore } from './uiStore';
import type { Dir } from './ops';

const PLACES: { dir: Dir; position: Position; label: string }[] = [
  { dir: 'right', position: Position.Right, label: 'Add idea to the right' },
  { dir: 'left', position: Position.Left, label: 'Add idea to the left' },
  { dir: 'down', position: Position.Bottom, label: 'Add idea below' },
];

/**
 * One set of "+" buttons shared by every idea, shown next to the hovered or selected one.
 * (Rendering three buttons inside each of 500 nodes tripled the DOM and the per-frame paint walk.)
 */
export const SproutToolbar = memo(function SproutToolbar({ selectedId }: { selectedId: string | null }) {
  const ed = useEditor();
  const hoverId = useUIStore((s) => s.hoverId);
  const dragging = useUIStore((s) => s.dragging);
  const editing = useUIStore((s) => s.editingId);
  const target = hoverId ?? selectedId;
  const hideTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (hideTimer.current != null) clearTimeout(hideTimer.current);
  }, []);
  if (!ed.canEdit || !target || dragging || editing === target) return null;

  const keep = () => {
    if (hideTimer.current != null) clearTimeout(hideTimer.current);
    hideTimer.current = null;
    useUIStore.getState().setHoverId(target);
  };
  const release = () => {
    if (hideTimer.current != null) clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => useUIStore.getState().setHoverId(null), 150);
  };

  return (
    <>
      {PLACES.map((p) => (
        <NodeToolbar key={p.dir} nodeId={target} isVisible position={p.position} offset={6} className="sprout-toolbar nodrag nopan">
          <button
            type="button"
            className="sprout"
            aria-label={p.label}
            title={`${p.label} · drag to place it or link to another idea`}
            tabIndex={-1}
            onPointerEnter={keep}
            onPointerLeave={release}
            onPointerDown={(e) => {
              e.stopPropagation();
              ed.startSprout(target, p.dir, e);
            }}
          >
            <Plus />
          </button>
        </NodeToolbar>
      ))}
    </>
  );
});
