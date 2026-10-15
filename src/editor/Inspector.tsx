import type { CurveStyle, FillStyle, Graph, LineStyle, MapEdge, MapNode, Shape } from '../lib/types';
import { BRANCH_COLORS, WHEEL_OUTER } from '../lib/palette';
import { SHAPE_LABELS } from './geometry';
import { ShapeIcon } from './icons';
import { incomingEdgeIds, recolor, setEdgeProps, setNodeProps } from './ops';

const SHAPES = Object.keys(SHAPE_LABELS) as Shape[];
const SWATCHES = [...BRANCH_COLORS, ...WHEEL_OUTER.filter((c) => !['#cfcfcf'].includes(c))];

function Seg<T extends string>({ value, options, onChange }: { value?: T; options: [T, string][]; onChange(v: T): void }) {
  return (
    <div className="seg">
      {options.map(([v, label]) => (
        <button key={v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

const same = <T, K extends keyof T>(items: T[], k: K): T[K] | undefined =>
  items.length && items.every((i) => i[k] === items[0][k]) ? items[0][k] : undefined;

export function Inspector({
  graph,
  nodeIds,
  edgeIds,
  commit,
  onClose,
}: {
  graph: Graph;
  nodeIds: string[];
  edgeIds: string[];
  commit(fn: (g: Graph) => Graph): void;
  onClose(): void;
}) {
  const nodes = nodeIds.map((id) => graph.nodes[id]).filter(Boolean) as MapNode[];
  // Branch settings apply to explicitly selected edges, or the branches leading into selected nodes.
  const branchIds = edgeIds.length ? edgeIds : incomingEdgeIds(graph, nodeIds);
  const edges = branchIds.map((id) => graph.edges[id]).filter(Boolean) as MapEdge[];
  if (!nodes.length && !edges.length) return null;

  const setN = (p: Partial<MapNode>) => commit((g) => setNodeProps(g, nodeIds, p));
  const setE = (p: Partial<MapEdge>) => commit((g) => setEdgeProps(g, branchIds, p));
  const color = same(nodes, 'color') ?? same(edges, 'color');

  return (
    <aside className="inspector" onKeyDown={(e) => e.stopPropagation()}>
      <header>
        <span>{nodes.length ? `${nodes.length} idea${nodes.length > 1 ? 's' : ''}` : `${edges.length} branch${edges.length > 1 ? 'es' : ''}`}</span>
        <button className="icon-btn" onClick={onClose} aria-label="Close style panel">✕</button>
      </header>

      <section>
        <h4>Colour</h4>
        <div className="swatches">
          {SWATCHES.map((c) => (
            <button
              key={c}
              className={`swatch ${color === c ? 'on' : ''}`}
              style={{ background: c }}
              aria-label={c}
              onClick={() => commit((g) => recolor(g, [...nodeIds, ...edgeIds], c))}
            />
          ))}
          <label className="swatch custom" title="Custom colour">
            <input type="color" value={color ?? '#c58ae0'} onChange={(e) => commit((g) => recolor(g, [...nodeIds, ...edgeIds], e.target.value))} />
          </label>
        </div>
      </section>

      {nodes.length > 0 && (
        <>
          <section>
            <h4>Shape</h4>
            <div className="shape-grid">
              {SHAPES.map((s) => (
                <button key={s} className={same(nodes, 'shape') === s ? 'on' : ''} title={SHAPE_LABELS[s]} onClick={() => setN({ shape: s })}>
                  <ShapeIcon shape={s} />
                </button>
              ))}
            </div>
          </section>
          <section>
            <h4>Fill</h4>
            <Seg<FillStyle>
              value={same(nodes, 'fill')}
              options={[['solid', 'Solid'], ['soft', 'Soft'], ['outline', 'Outline']]}
              onChange={(fill) => setN({ fill })}
            />
          </section>
          <section>
            <h4>
              Text <span className="val">{same(nodes, 'fontSize') ?? '–'}px</span>
            </h4>
            <div className="row">
              <input
                type="range"
                min={11}
                max={44}
                value={same(nodes, 'fontSize') ?? 16}
                onChange={(e) => setN({ fontSize: +e.target.value })}
              />
              <button className={`chip ${same(nodes, 'bold') ? 'on' : ''}`} onClick={() => setN({ bold: !same(nodes, 'bold') })}>
                <b>B</b>
              </button>
            </div>
          </section>
          <section>
            <h4>
              Border <span className="val">{same(nodes, 'borderWidth') ?? '–'}px</span>
            </h4>
            <input
              type="range"
              min={0}
              max={8}
              step={0.5}
              value={same(nodes, 'borderWidth') ?? 2}
              onChange={(e) => setN({ borderWidth: +e.target.value })}
            />
            <Seg<LineStyle>
              value={same(nodes, 'borderStyle')}
              options={[['solid', 'Solid'], ['dashed', 'Dashed'], ['dotted', 'Dotted']]}
              onChange={(borderStyle) => setN({ borderStyle })}
            />
          </section>
        </>
      )}

      {edges.length > 0 && (
        <section>
          <h4>
            Branch <span className="val">{same(edges, 'width') ?? '–'}px</span>
          </h4>
          <input
            type="range"
            min={1}
            max={24}
            step={0.5}
            value={same(edges, 'width') ?? 4}
            onChange={(e) => setE({ width: +e.target.value })}
          />
          <Seg<CurveStyle>
            value={same(edges, 'curve')}
            options={[['organic', 'Organic'], ['bezier', 'Curve'], ['straight', 'Straight'], ['step', 'Elbow']]}
            onChange={(curve) => setE({ curve })}
          />
          <Seg<LineStyle>
            value={same(edges, 'style')}
            options={[['solid', 'Solid'], ['dashed', 'Dashed'], ['dotted', 'Dotted']]}
            onChange={(style) => setE({ style })}
          />
          <label className="check">
            <input type="checkbox" checked={!!same(edges, 'arrow')} onChange={(e) => setE({ arrow: e.target.checked })} /> Arrow head
          </label>
        </section>
      )}
    </aside>
  );
}
