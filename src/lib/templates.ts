import type { Graph, MapEdge, MapNode } from './types';
import { BRANCH_COLORS, ROOT_COLOR } from './palette';
import { SCHEMA_VERSION, rootNode, uid } from './store';

export interface Template {
  id: 'blank' | 'brainstorm' | 'project';
  name: string;
  description: string;
  /** Rough preview: branch labels on each side. */
  preview: { left: string[]; right: string[] };
  build(): Graph;
}

function branch(nodes: Record<string, MapNode>, edges: Record<string, MapEdge>, parent: MapNode, text: string, color: string, x: number, y: number, fromRoot: boolean): MapNode {
  const n: MapNode = { id: uid('n_'), x, y, text, shape: 'rounded', color, fill: 'soft', fontSize: 14, bold: fromRoot, borderWidth: 1, borderStyle: 'solid' };
  nodes[n.id] = n;
  const e: MapEdge = { id: uid('e_'), source: parent.id, target: n.id, kind: 'branch', color, width: fromRoot ? 2.5 : 1.5, style: 'solid', curve: 'bezier', arrow: false };
  edges[e.id] = e;
  return n;
}

/** Symmetric starter: `sides` lists of branch titles with optional children. */
function build(rootText: string, left: [string, string[]][], right: [string, string[]][]): Graph {
  const root = rootNode(rootText);
  const nodes: Record<string, MapNode> = { [root.id]: root };
  const edges: Record<string, MapEdge> = {};
  let ci = 0;
  const lay = (items: [string, string[]][], side: 1 | -1) => {
    const total = items.reduce((a, [, kids]) => a + Math.max(1, kids.length), 0);
    let row = -(total - 1) / 2;
    for (const [title, kids] of items) {
      const span = Math.max(1, kids.length);
      const cy = (row + (span - 1) / 2) * 48;
      const color = BRANCH_COLORS[ci++ % BRANCH_COLORS.length];
      const b = branch(nodes, edges, root, title, color, side === 1 ? 240 : -240 - 140, cy, true);
      kids.forEach((k, i) => branch(nodes, edges, b, k, color, side === 1 ? 460 : -460 - 120, (row + i) * 48, false));
      row += span;
    }
  };
  lay(right, 1);
  lay(left, -1);
  root.color = ROOT_COLOR;
  return { v: SCHEMA_VERSION, nodes, edges, comments: {} };
}

export const TEMPLATES: Template[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'A single central idea.',
    preview: { left: [], right: [] },
    build: () => build('Central idea', [], []),
  },
  {
    id: 'brainstorm',
    name: 'Brainstorm',
    description: 'Questions, ideas, risks and next steps.',
    preview: { left: ['Questions', 'Risks'], right: ['Ideas', 'Next steps'] },
    build: () =>
      build(
        'Topic',
        [
          ['Questions', ['What do we know?', 'What is unclear?']],
          ['Risks', ['What could go wrong?']],
        ],
        [
          ['Ideas', ['First idea', 'Second idea', 'Wild idea']],
          ['Next steps', ['Decide', 'Assign']],
        ],
      ),
  },
  {
    id: 'project',
    name: 'Project plan',
    description: 'Goals, scope, timeline, people and risks.',
    preview: { left: ['People', 'Risks'], right: ['Goals', 'Scope', 'Timeline'] },
    build: () =>
      build(
        'Project',
        [
          ['People', ['Owner', 'Team', 'Stakeholders']],
          ['Risks', ['Dependencies', 'Unknowns']],
        ],
        [
          ['Goals', ['Outcome', 'Success metric']],
          ['Scope', ['In', 'Out']],
          ['Timeline', ['Kick-off', 'Milestone', 'Launch']],
        ],
      ),
  },
];
