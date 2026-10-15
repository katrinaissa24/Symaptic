export type Role = 'view' | 'comment' | 'edit';
export type LinkRole = 'none' | Role;
export type AccessRole = 'owner' | Role | 'none';

export type Shape =
  | 'pill'
  | 'rounded'
  | 'rect'
  | 'ellipse'
  | 'circle'
  | 'diamond'
  | 'hexagon'
  | 'cloud'
  | 'underline'
  | 'text';

export type FillStyle = 'solid' | 'soft' | 'outline';
export type LineStyle = 'solid' | 'dashed' | 'dotted';
export type CurveStyle = 'organic' | 'bezier' | 'straight' | 'step';

export interface MapNode {
  id: string;
  x: number;
  y: number;
  text: string;
  shape: Shape;
  color: string;
  fill: FillStyle;
  fontSize: number;
  bold: boolean;
  borderWidth: number;
  borderStyle: LineStyle;
  root?: boolean;
}

export interface MapEdge {
  id: string;
  source: string;
  target: string;
  /** branch = parent→child in the tree; link = a free cross-connection. */
  kind: 'branch' | 'link';
  color: string;
  width: number;
  style: LineStyle;
  curve: CurveStyle;
  arrow: boolean;
}

export interface CommentReply {
  id: string;
  text: string;
  authorName: string;
  authorEmail: string;
  createdAt: number;
}

export interface MapComment {
  id: string;
  nodeId: string | null;
  x: number;
  y: number;
  text: string;
  authorName: string;
  authorEmail: string;
  createdAt: number;
  replies: CommentReply[];
  resolved: boolean;
}

export interface Graph {
  nodes: Record<string, MapNode>;
  edges: Record<string, MapEdge>;
  comments: Record<string, MapComment>;
}

export interface MapDoc extends Graph {
  id: string;
  title: string;
  ownerId: string;
  ownerEmail: string;
  ownerName: string;
  members: Record<string, Role>;
  memberEmails: string[];
  linkRole: LinkRole;
  createdAt: number;
  updatedAt: number;
}

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  photoURL?: string | null;
}

/** Field-level patch: keys are dotted paths like "nodes.abc"; null deletes the field. */
export type Patch = Record<string, unknown>;
