import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { MapNode } from '../lib/types';
import { displayColor, displayHex, readableOn } from '../lib/palette';
import { SHAPE_PATHS } from './geometry';
import { useEditor } from './EditorContext';
import { useUIStore } from './uiStore';
import { displayBorderWidth, displayFontSize, displayShape } from './compat';
import { perfCount } from '../lib/perf';

export type IdeaRFNode = Node<{ node: MapNode; legacy: boolean }, 'idea'>;

const DASH = { solid: undefined, dashed: '6 4', dotted: '1 3' } as const;

function IdeaNodeImpl({ id, data, selected }: NodeProps<IdeaRFNode>) {
  perfCount('IdeaNode');
  const { node: n, legacy } = data;
  const ed = useEditor();
  const editing = useUIStore((s) => s.editingId === id);
  const connectTarget = useUIStore((s) => s.connectingFrom !== null && s.connectingFrom !== id);
  const remote = useUIStore((s) => s.remoteSelections[id]);
  const shape = displayShape(n.shape);
  const pathShape = SHAPE_PATHS[shape];

  const style = useMemo<React.CSSProperties>(() => {
    const fs = displayFontSize(n.fontSize, legacy);
    return {
      ['--c' as string]: displayColor(n.color),
      ['--remote' as string]: remote ? `var(--palette-${remote})` : undefined,
      ['--bw' as string]: `${displayBorderWidth(n.borderWidth, legacy)}px`,
      ['--bs' as string]: n.borderStyle,
      ['--ink-solid' as string]: readableOn(displayHex(n.color)),
      fontSize: fs,
      lineHeight: `${Math.round(fs * 1.4)}px`,
      fontWeight: n.bold || n.root ? 600 : 400,
    };
  }, [n.color, n.borderWidth, n.borderStyle, n.fontSize, n.bold, n.root, legacy, remote]);

  const className =
    `idea shape-${shape} fill-${n.fill}` +
    (pathShape ? ' path-shape' : '') +
    (selected ? ' is-selected' : '') +
    (connectTarget ? ' connect-target' : '') +
    (n.root ? ' is-root' : '') +
    (remote ? ' is-remote-selected' : '') +
    (editing ? ' is-editing' : '');

  return (
    <div
      className={className}
      style={style}
      role="group"
      aria-label={`${n.root ? 'Central idea' : 'Idea'}: ${n.text || 'empty'}`}
      onDoubleClick={(e) => {
        if (!ed.canEdit) return;
        e.stopPropagation();
        ed.setEditingId(id);
      }}
    >
      <div className="idea-box">
        {pathShape && (
          <svg className="shape-bg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <path d={pathShape} strokeDasharray={DASH[n.borderStyle]} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </svg>
        )}
        {editing ? (
          <NodeTextEditor
            initial={n.text}
            onDone={(t) => ed.setNodeText(id, t)}
            onCancel={() => ed.setEditingId(null)}
            onTab={(t) => ed.textThenChild(id, t)}
            onEnter={(t) => ed.textThenSibling(id, t)}
          />
        ) : (
          <div className="idea-text">{n.text || ' '}</div>
        )}
      </div>
      <Handle type="target" position={Position.Left} className="ghost-handle" isConnectable={false} />
      <Handle type="source" position={Position.Right} className="ghost-handle" isConnectable={false} />
    </div>
  );
}

function NodeTextEditor(props: {
  initial: string;
  onDone(t: string): void;
  onCancel(): void;
  onTab(t: string): void;
  onEnter(t: string): void;
}) {
  const [value, setValue] = useState(props.initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  const done = useRef(false);

  useEffect(() => {
    // New nodes stay visibility:hidden until React Flow measures them, and hidden elements
    // can't take focus, so keep trying for a few frames.
    let tries = 0;
    let timer = 0;
    const tryFocus = () => {
      const el = ref.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      if (document.activeElement === el) el.select();
      else if (tries++ < 30) timer = window.setTimeout(tryFocus, 16);
    };
    tryFocus();
    return () => clearTimeout(timer);
  }, []);

  const finish = (fn: () => void) => {
    if (done.current) return;
    done.current = true;
    fn();
  };

  return (
    <div className="grow-wrap" data-value={value}>
      <textarea
        ref={ref}
        className="idea-input nodrag nopan nowheel"
        aria-label="Idea text"
        value={value}
        rows={1}
        spellCheck
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => finish(() => props.onDone(value))}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            finish(() => (e.metaKey || e.ctrlKey ? props.onDone(value) : props.onEnter(value)));
          } else if (e.key === 'Escape') {
            e.preventDefault();
            finish(props.onCancel);
          } else if (e.key === 'Tab') {
            e.preventDefault();
            finish(() => props.onTab(value));
          }
        }}
      />
    </div>
  );
}

/** Position props change every frame while dragging; the component only cares about its data and selection. */
export const IdeaNode = memo(IdeaNodeImpl, (a, b) => a.id === b.id && a.data === b.data && a.selected === b.selected);
