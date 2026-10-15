import { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { MapNode } from '../lib/types';
import { readableOn, shade, tint } from '../lib/palette';
import { SHAPE_PATHS } from './geometry';
import { useEditor } from './EditorContext';
import type { Dir } from './ops';

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

function IdeaNodeImpl({ id, data, selected }: NodeProps<IdeaRFNode>) {
  const n = data.node;
  const ed = useEditor();
  const editing = ed.editingId === id;
  const { bg, fg, border } = colors(n);
  const pathShape = SHAPE_PATHS[n.shape];

  const style: React.CSSProperties = {
    ['--bg' as string]: bg,
    ['--fg' as string]: fg,
    ['--bc' as string]: border,
    ['--bw' as string]: `${n.borderWidth}px`,
    ['--bs' as string]: n.borderStyle,
    fontSize: n.fontSize,
    fontWeight: n.bold ? 700 : 500,
  };

  return (
    <div
      className={`idea shape-${n.shape} ${pathShape ? 'path-shape' : ''} ${selected ? 'is-selected' : ''} ${
        ed.connectingFrom && ed.connectingFrom !== id ? 'connect-target' : ''
      } ${n.root ? 'is-root' : ''}`}
      style={style}
      onDoubleClick={(e) => {
        if (!ed.canEdit) return;
        e.stopPropagation();
        ed.setEditingId(id);
      }}
    >
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
        />
      ) : (
        <div className="idea-text">{n.text || ' '}</div>
      )}
      <Handle type="target" position={Position.Left} className="ghost-handle" isConnectable={false} />
      <Handle type="source" position={Position.Right} className="ghost-handle" isConnectable={false} />
      {ed.canEdit && !editing && (
        <>
          {(['right', 'left', 'down'] as Dir[]).map((d) => (
            <button
              key={d}
              className={`sprout sprout-${d} nodrag nopan`}
              title="Click to add an idea · drag to place it or link to another node"
              style={{ ['--c' as string]: n.color }}
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
        </>
      )}
    </div>
  );
}

function NodeTextEditor(props: {
  initial: string;
  onDone(t: string): void;
  onCancel(): void;
  onTab(t: string): void;
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
      value={value}
      rows={1}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(() => props.onDone(value))}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          finish(() => props.onDone(value));
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

export const IdeaNode = memo(IdeaNodeImpl);
