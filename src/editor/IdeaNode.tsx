import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { MapNode } from '../lib/types';
import { readableOn, shade, tint } from '../lib/palette';
import { SHAPE_PATHS } from './geometry';
import { useEditor } from './EditorContext';
import { useUIStore } from './uiStore';
import type { Dir } from './ops';
import { perfCount } from '../lib/perf';

export type IdeaRFNode = Node<{ node: MapNode }, 'idea'>;

function colors(n: MapNode) {
  const c = n.color;
  if (n.shape === 'underline' || n.shape === 'text') {
    return { bg: 'transparent', fg: n.bold ? shade(c, 0.35) : 'var(--ink-2)', border: c };
  }
  if (n.fill === 'solid') return { bg: c, fg: readableOn(c), border: shade(c, 0.12) };
  if (n.fill === 'soft') return { bg: tint(c, 0.82), fg: shade(c, 0.5), border: c };
  return { bg: 'var(--surface)', fg: shade(c, 0.4), border: c };
}

const DASH = { solid: undefined, dashed: '7 5', dotted: '1.5 4.5' } as const;
const DIRS: Dir[] = ['right', 'left', 'down'];

function IdeaNodeImpl({ id, data, selected }: NodeProps<IdeaRFNode>) {
  perfCount('IdeaNode');
  const n = data.node;
  const ed = useEditor();
  const editing = useUIStore((s) => s.editingId === id);
  const connectTarget = useUIStore((s) => s.connectingFrom !== null && s.connectingFrom !== id);
  const pathShape = SHAPE_PATHS[n.shape];

  const { bg, fg, border } = useMemo(() => colors(n), [n]);
  const style = useMemo<React.CSSProperties>(
    () => ({
      ['--bg' as string]: bg,
      ['--fg' as string]: fg,
      ['--bc' as string]: border,
      ['--bw' as string]: `${n.borderWidth}px`,
      ['--bs' as string]: n.borderStyle,
      ['--c' as string]: n.color,
      fontSize: n.fontSize,
      fontWeight: n.bold ? 700 : 500,
    }),
    [bg, fg, border, n.borderWidth, n.borderStyle, n.color, n.fontSize, n.bold],
  );

  const className = `idea shape-${n.shape}${pathShape ? ' path-shape' : ''}${selected ? ' is-selected' : ''}${connectTarget ? ' connect-target' : ''}${n.root ? ' is-root' : ''}`;

  return (
    <div
      className={className}
      style={style}
      onDoubleClick={(e) => {
        if (!ed.canEdit) return;
        e.stopPropagation();
        ed.setEditingId(id);
      }}
    >
      <div className="idea-box">
        {pathShape && (
          <svg className="shape-bg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <path
              d={pathShape}
              fill={bg === 'transparent' ? 'none' : bg}
              stroke={border}
              strokeWidth={n.borderWidth}
              strokeDasharray={DASH[n.borderStyle]}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
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
      {ed.canEdit && !editing &&
        DIRS.map((d) => (
          <button
            key={d}
            type="button"
            className={`sprout sprout-${d} nodrag nopan`}
            aria-label={`Add idea ${d === 'down' ? 'below' : `to the ${d}`}`}
            title="Click to add an idea · drag to place it or link to another idea"
            onPointerDown={(e) => {
              e.stopPropagation();
              ed.startSprout(id, d, e);
            }}
          >
            <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        ))}
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
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => finish(() => props.onDone(value))}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            finish(() => (e.metaKey || e.ctrlKey ? props.onDone(value) : props.onEnter(value)));
          } else if (e.key === 'Escape') {
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
export const IdeaNode = memo(
  IdeaNodeImpl,
  (a, b) => a.id === b.id && a.data === b.data && a.selected === b.selected,
);
