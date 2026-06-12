import ElkConstructor, { type ELK, type ElkNode } from "elkjs/lib/elk.bundled.js";
import { isContainer, type Container, type TreeNode } from "./group.js";

// elkjs ship ESM-style typings for a CommonJS budnle, so NodeNext doesn't see the
// default export as constructable. Pin the constructor type at the boundary.
const elk: ELK = new (ElkConstructor as unknown as { new (): ELK })();

const LEAF_WIDTH = 212;
const LEAF_HEIGHT = 66;

const containerOptions = {
  "elk.algorithm": "rectpacking",
  "elk.aspectRatio": "1.9",
  "elk.spacing.nodeNode": "22",
  "elk.padding": "[top=52,left=18,bottom=18,right=18]",
};

export interface PositionedNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  node: TreeNode;
  children: PositionedNode[];
}

export interface LayoutResult {
  width: number;
  height: number;
  nodes: PositionedNode[];
}

export async function layout(modules: Container[]): Promise<LayoutResult> {
  const index = indexTree(modules);
  const graph: ElkNode = {
    id: "$root",
    layoutOptions: {
      "elk.algorithm": "rectpacking",
      "elk.aspectRatio": "2.8",
      "elk.spacing.nodeNode": "28",
      "elk.padding": "[top=20,left=20,bottom=20,right=20]",
    },
    children: modules.map(toElk),
  };

  const out = await elk.layout(graph);
  return {
    width: out.width ?? 0,
    height: out.height ?? 0,
    nodes: (out.children ?? []).map((c) => place(c, index)),
  };
}

function toElk(node: TreeNode): ElkNode {
  if (isContainer(node)) {
    return { id: node.id, layoutOptions: containerOptions, children: node.children.map(toElk) };
  }
  return { id: node.id, width: LEAF_WIDTH, height: LEAF_HEIGHT };
}

function place(e: ElkNode, index: Map<string, TreeNode>): PositionedNode {
  const node = index.get(e.id);
  if (!node) throw new Error(`layout produced an unknown node: ${e.id}`);
  return {
    id: e.id,
    x: e.x ?? 0,
    y: e.y ?? 0,
    width: e.width ?? 0,
    height: e.height ?? 0,
    node,
    children: (e.children ?? []).map((c) => place(c, index)),
  };
}

function indexTree(nodes: TreeNode[]): Map<string, TreeNode> {
  const index = new Map<string, TreeNode>();
  const walk = (n: TreeNode) => {
    index.set(n.id, n);
    if (isContainer(n)) n.children.forEach(walk);
  };
  nodes.forEach(walk);
  return index;
}
