import { ArrowRight, ClipboardPaste, Copy, CornerDownRight, Link2, ListTree, Maximize, MessageSquare, Palette, Plus, Redo2, RotateCcw, Shapes, Spline, Trash2, Undo2, Check, Eye } from 'lucide-react';
import type { CurveStyle, Graph, LineStyle, MapEdge, Shape } from '../lib/types';
import { PALETTE } from '../lib/palette';
import { SHAPE_LABELS, SHAPE_OPTIONS } from './geometry';
import { ShapeIcon } from './icons';
import { isLegacy, storedEdgeWidth } from './compat';
import { incomingEdgeIds, isMine, recolor, setEdgeProps, setNodeProps, updateComment } from './ops';
import type { MenuItem } from '../components/ui';
import type { AppUser } from '../lib/types';

export interface MenuApi {
  graph: Graph;
  user: AppUser | null;
  canEdit: boolean;
  canComment: boolean;
  commit(fn: (g: Graph) => Graph): void;
  addChild(id: string): void;
  addSibling(id: string): void;
  addFree(at: { x: number; y: number }): void;
  comment(nodeId: string | null, at?: { x: number; y: number }): void;
  link(id: string): void;
  duplicate(ids: string[]): void;
  remove(ids: string[]): void;
  paste(at: { x: number; y: number }): void;
  canPaste: boolean;
  tidy(): void;
  fit(): void;
  undo(): void;
  redo(): void;
  canUndo: boolean;
  canRedo: boolean;
  openComment(id: string): void;
}

const dot = (key: string) => <span className="color-dot" style={{ background: `var(--palette-${key})` }} aria-hidden />;

function colourItems(api: MenuApi, ids: string[]): MenuItem[] {
  return PALETTE.map((p) => ({ label: p.name, icon: dot(p.key), onSelect: () => api.commit((g) => recolor(g, ids, p.hex)) }));
}

function branchStyleItems(api: MenuApi, edgeIds: string[]): MenuItem[] {
  const legacy = isLegacy(api.graph);
  const first = api.graph.edges[edgeIds[0]];
  const setE = (p: Partial<MapEdge>) => api.commit((g) => setEdgeProps(g, edgeIds, p));
  const curve: [Exclude<CurveStyle, 'organic'>, string][] = [
    ['bezier', 'Curved'],
    ['straight', 'Straight'],
    ['step', 'Elbow'],
  ];
  const line: [LineStyle, string][] = [
    ['solid', 'Solid'],
    ['dashed', 'Dashed'],
    ['dotted', 'Dotted'],
  ];
  const width: [number, string][] = [
    [1.5, 'Thin'],
    [2.5, 'Medium'],
    [4, 'Thick'],
  ];
  return [
    { label: 'Curve', kind: 'label' },
    ...curve.map(([c, label]) => ({ label, checked: (first?.curve === 'organic' ? 'bezier' : first?.curve) === c, onSelect: () => setE({ curve: c }) })),
    'separator',
    { label: 'Line', kind: 'label' },
    ...line.map(([s, label]) => ({ label, checked: first?.style === s, onSelect: () => setE({ style: s }) })),
    'separator',
    { label: 'Width', kind: 'label' },
    ...width.map(([w, label]) => ({ label, checked: false, onSelect: () => setE({ width: storedEdgeWidth(w, legacy) }) })),
    'separator',
    { label: first?.arrow ? 'Remove arrow head' : 'Arrow head', icon: <ArrowRight />, onSelect: () => setE({ arrow: !first?.arrow }) },
  ];
}

export function nodeMenu(api: MenuApi, ids: string[]): MenuItem[] {
  const id = ids[0];
  const items: MenuItem[] = [];
  if (api.canEdit) {
    items.push(
      { label: 'Add idea', icon: <Plus />, shortcut: 'Tab', onSelect: () => api.addChild(id) },
      { label: 'Add sibling', icon: <CornerDownRight />, shortcut: 'Enter', onSelect: () => api.addSibling(id) },
    );
  }
  if (api.canComment) items.push({ label: 'Comment', icon: <MessageSquare />, shortcut: 'C', onSelect: () => api.comment(id) });
  if (api.canEdit) {
    const edgeIds = incomingEdgeIds(api.graph, ids);
    const cur = api.graph.nodes[id]?.shape;
    items.push(
      'separator',
      { label: 'Colour', icon: <Palette />, items: colourItems(api, ids) },
      {
        label: 'Shape',
        icon: <Shapes />,
        items: SHAPE_OPTIONS.map((s: Shape) => ({
          label: SHAPE_LABELS[s],
          icon: <ShapeIcon shape={s} size={18} />,
          checked: (cur === 'underline' ? 'rounded' : cur) === s,
          onSelect: () => api.commit((g) => setNodeProps(g, ids, { shape: s })),
        })),
      },
      ...(edgeIds.length ? [{ label: 'Branch style', icon: <Spline />, items: branchStyleItems(api, edgeIds) }] : []),
      'separator',
      { label: 'Link to…', icon: <Link2 />, onSelect: () => api.link(id) },
      { label: 'Duplicate', icon: <Copy />, shortcut: 'Mod+D', onSelect: () => api.duplicate(ids) },
      'separator',
      { label: ids.length > 1 ? `Delete ${ids.length} ideas` : 'Delete', icon: <Trash2 />, shortcut: 'Delete', danger: true, onSelect: () => api.remove(ids) },
    );
  }
  return items;
}

export function edgeMenu(api: MenuApi, id: string): MenuItem[] {
  return [
    { label: 'Colour', icon: <Palette />, items: colourItems(api, [id]) },
    { label: 'Line style', icon: <Spline />, items: branchStyleItems(api, [id]) },
    'separator',
    { label: 'Delete branch', icon: <Trash2 />, danger: true, onSelect: () => api.remove([id]) },
  ];
}

export function commentMenu(api: MenuApi, id: string): MenuItem[] {
  const c = api.graph.comments[id];
  const items: MenuItem[] = [{ label: 'Open thread', icon: <Eye />, onSelect: () => api.openComment(id) }];
  if (api.canComment) items.push({ label: c?.resolved ? 'Reopen' : 'Resolve', icon: c?.resolved ? <RotateCcw /> : <Check />, onSelect: () => api.commit((g) => updateComment(g, id, { resolved: !c?.resolved })) });
  if (api.canEdit || (c && isMine(c, api.user))) items.push('separator', { label: 'Delete comment', icon: <Trash2 />, danger: true, onSelect: () => api.remove([id]) });
  return items;
}

export function paneMenu(api: MenuApi, at: { x: number; y: number }): MenuItem[] {
  const items: MenuItem[] = [];
  if (api.canEdit) {
    items.push({ label: 'New idea here', icon: <Plus />, shortcut: 'N', onSelect: () => api.addFree(at) });
    items.push({ label: 'Paste', icon: <ClipboardPaste />, shortcut: 'Mod+V', disabled: !api.canPaste, onSelect: () => api.paste(at) });
  }
  if (api.canComment) items.push({ label: 'Comment here', icon: <MessageSquare />, onSelect: () => api.comment(null, { x: at.x - 90, y: at.y - 40 }) });
  if (items.length) items.push('separator');
  if (api.canEdit) items.push({ label: 'Tidy layout', icon: <ListTree />, shortcut: 'T', onSelect: api.tidy });
  items.push({ label: 'Fit to screen', icon: <Maximize />, shortcut: 'Shift+1', onSelect: api.fit });
  if (api.canEdit || api.canComment) {
    items.push('separator', { label: 'Undo', icon: <Undo2 />, shortcut: 'Mod+Z', disabled: !api.canUndo, onSelect: api.undo }, { label: 'Redo', icon: <Redo2 />, shortcut: 'Mod+Shift+Z', disabled: !api.canRedo, onSelect: api.redo });
  }
  return items;
}
