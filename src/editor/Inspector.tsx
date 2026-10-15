import { memo, useId } from 'react';
import { X } from 'lucide-react';
import type { CurveStyle, FillStyle, Graph, LineStyle, MapEdge, MapNode, Shape } from '../lib/types';
import { PALETTE, displayHex, paletteKey } from '../lib/palette';
import { SHAPE_LABELS, SHAPE_OPTIONS } from './geometry';
import { ShapeIcon } from './icons';
import { IconButton, Segmented, Select, Slider, Stepper, Toggle, Tooltip } from '../components/ui';
import { incomingEdgeIds, recolor, setEdgeProps, setNodeProps } from './ops';
import { MAX_FONT, MIN_FONT, displayBorderWidth, displayEdgeWidth, displayFontSize, isLegacy, storedBorderWidth, storedEdgeWidth, storedFontSize } from './compat';
import { perfCount } from '../lib/perf';

const same = <T, K extends keyof T>(items: T[], k: K): T[K] | undefined =>
  items.length && items.every((i) => i[k] === items[0][k]) ? items[0][k] : undefined;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <section className="inspector-section" aria-labelledby={id}>
      <h2 id={id} className="inspector-title">
        {title}
      </h2>
      <div className="inspector-rows">{children}</div>
    </section>
  );
}

function Row({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`inspector-row${wide ? ' is-wide' : ''}`}>
      <span className="inspector-label">{label}</span>
      <div className="inspector-control">{children}</div>
    </div>
  );
}

function InspectorImpl({
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
  perfCount('Inspector');
  const nodes = nodeIds.map((id) => graph.nodes[id]).filter(Boolean) as MapNode[];
  // Branch settings apply to explicitly selected branches, or the branches leading into selected ideas.
  const branchIds = edgeIds.length ? edgeIds : incomingEdgeIds(graph, nodeIds);
  const edges = branchIds.map((id) => graph.edges[id]).filter(Boolean) as MapEdge[];
  if (!nodes.length && !edges.length) return null;

  const legacy = isLegacy(graph);
  const setN = (p: Partial<MapNode>) => commit((g) => setNodeProps(g, nodeIds, p));
  const setE = (p: Partial<MapEdge>) => commit((g) => setEdgeProps(g, branchIds, p));
  const color = same(nodes, 'color') ?? same(edges, 'color');
  const colorKey = color ? paletteKey(color) : null;
  const fontSize = same(nodes, 'fontSize');
  const fontDisplay = fontSize === undefined ? undefined : displayFontSize(fontSize, legacy);
  const borderW = same(nodes, 'borderWidth');
  const borderDisplay = borderW === undefined ? undefined : displayBorderWidth(borderW, legacy);
  const edgeW = same(edges, 'width');
  const edgeDisplay = edgeW === undefined ? undefined : displayEdgeWidth(edgeW, legacy);
  const curve = same(edges, 'curve');
  const shape = same(nodes, 'shape');
  const title = nodes.length ? (nodes.length === 1 ? (nodes[0].root ? 'Central idea' : 'Idea') : `${nodes.length} ideas`) : edges.length === 1 ? 'Branch' : `${edges.length} branches`;

  return (
    <aside className="inspector" aria-label="Style panel" onKeyDown={(e) => e.stopPropagation()}>
      <header className="inspector-head">
        <span className="inspector-heading">{title}</span>
        <IconButton label="Close panel" size="sm" onClick={onClose}>
          <X />
        </IconButton>
      </header>

      <Section title="Style">
        <Row label="Colour" wide>
          <div className="swatches" role="radiogroup" aria-label="Colour">
            {PALETTE.map((p) => (
              <Tooltip key={p.key} content={p.name}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={colorKey === p.key}
                  aria-label={p.name}
                  className={`swatch${colorKey === p.key ? ' is-on' : ''}`}
                  style={{ ['--sw' as string]: `var(--palette-${p.key})` }}
                  onClick={() => commit((g) => recolor(g, [...nodeIds, ...edgeIds], p.hex))}
                />
              </Tooltip>
            ))}
            <Tooltip content="Custom colour">
              <label className={`swatch swatch-custom${color && !colorKey ? ' is-on' : ''}`} style={{ ['--sw' as string]: color && !colorKey ? color : undefined }}>
                <input
                  type="color"
                  aria-label="Custom colour"
                  value={color ? displayHex(color) : '#6b7280'}
                  onChange={(e) => commit((g) => recolor(g, [...nodeIds, ...edgeIds], e.target.value))}
                />
              </label>
            </Tooltip>
          </div>
        </Row>
        {nodes.length > 0 && (
          <>
            <Row label="Fill">
              <Segmented<FillStyle>
                ariaLabel="Fill"
                value={same(nodes, 'fill')}
                options={[
                  { value: 'solid', label: 'Solid' },
                  { value: 'soft', label: 'Soft' },
                  { value: 'outline', label: 'Outline' },
                ]}
                onChange={(fill) => setN({ fill })}
              />
            </Row>
            <Row label="Shape">
              <Select<Shape>
                ariaLabel="Shape"
                value={(shape === 'underline' ? 'rounded' : shape) ?? 'rounded'}
                onValueChange={(s) => setN({ shape: s })}
                className="select-block"
                options={SHAPE_OPTIONS.map((s) => ({
                  value: s,
                  label: (
                    <span className="shape-option">
                      <ShapeIcon shape={s} size={22} />
                      {SHAPE_LABELS[s]}
                    </span>
                  ),
                }))}
              />
            </Row>
            <Row label="Border">
              <Slider ariaLabel="Border width" min={0} max={3} step={0.5} value={borderDisplay ?? 1} unit="px" onChange={(v) => setN({ borderWidth: storedBorderWidth(v, legacy) })} />
            </Row>
            <Row label="">
              <Segmented<LineStyle>
                ariaLabel="Border style"
                value={same(nodes, 'borderStyle')}
                options={[
                  { value: 'solid', label: 'Solid' },
                  { value: 'dashed', label: 'Dashed' },
                  { value: 'dotted', label: 'Dotted' },
                ]}
                onChange={(borderStyle) => setN({ borderStyle })}
              />
            </Row>
          </>
        )}
      </Section>

      {nodes.length > 0 && (
        <Section title="Text">
          <Row label="Size">
            <Stepper ariaLabel="Font size" min={MIN_FONT} max={MAX_FONT} value={fontDisplay ?? 14} onChange={(v) => setN({ fontSize: storedFontSize(v, legacy) })} />
          </Row>
          <Row label="Weight">
            <Toggle label="Bold" checked={!!same(nodes, 'bold')} onChange={(bold) => setN({ bold })} />
          </Row>
        </Section>
      )}

      {edges.length > 0 && (
        <Section title="Branch">
          <Row label="Width">
            <Slider ariaLabel="Branch width" min={1} max={4} step={0.5} value={edgeDisplay ?? 1.5} unit="px" onChange={(v) => setE({ width: storedEdgeWidth(v, legacy) })} />
          </Row>
          <Row label="Curve">
            <Segmented<Exclude<CurveStyle, 'organic'>>
              ariaLabel="Curve"
              value={curve === 'organic' ? 'bezier' : curve}
              options={[
                { value: 'bezier', label: 'Curved' },
                { value: 'straight', label: 'Straight' },
                { value: 'step', label: 'Elbow' },
              ]}
              onChange={(c) => setE({ curve: c })}
            />
          </Row>
          <Row label="Line">
            <Segmented<LineStyle>
              ariaLabel="Line style"
              value={same(edges, 'style')}
              options={[
                { value: 'solid', label: 'Solid' },
                { value: 'dashed', label: 'Dashed' },
                { value: 'dotted', label: 'Dotted' },
              ]}
              onChange={(style) => setE({ style })}
            />
          </Row>
          <Row label="Arrow">
            <Toggle label="Arrow head" checked={!!same(edges, 'arrow')} onChange={(arrow) => setE({ arrow })} />
          </Row>
        </Section>
      )}
    </aside>
  );
}

export const Inspector = memo(InspectorImpl);
