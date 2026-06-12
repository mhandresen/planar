import type { Provider, ResourceNode } from "./parse.js";

/**
 * Tree fed to the ELK layout. Module containers are always the outermost level;
 * a resource is only promoted to a container when it has children — otherwise
 * it stays a plain ResourceNode leaf.
 */

export type TreeNode = Container | ResourceNode;

export interface Container {
  /** Discriminant for the TreeNode union (ResourceNode has no `kind`) */
  kind: "container";
  /** "root", a module address, or a resource address */
  id: string;
  label: string;
  containerType: "module" | "resource";
  /** Absent for "module" containers */
  resource?: ResourceNode;
  children: TreeNode[];
}

export function isContainer(node: TreeNode): node is Container {
  return (node as Partial<Container>).kind === "container";
}

/**
 * Child resource type → acceptable parent types, highest priority first.
 * First parent type with a match wins; ties broken by plan order.
 * Rules must form a DAG — no type can be its own ancestor.
 */
export const CONTAINMENT: Record<Provider, Record<string, string[]>> = {
  aws: {
    aws_subnet: ["aws_vpc"],
    aws_instance: ["aws_subnet", "aws_vpc"],
    aws_db_instance: ["aws_vpc"],
    aws_security_group: ["aws_vpc"],
    aws_nat_gateway: ["aws_subnet", "aws_vpc"],
    aws_internet_gateway: ["aws_vpc"],
    aws_route_table: ["aws_vpc"],
    aws_lb: ["aws_subnet", "aws_vpc"],
  },
  azure: {
    azurerm_subnet: ["azurerm_virtual_network"],
    azurerm_network_interface: ["azurerm_subnet"],
    azurerm_linux_virtual_machine: ["azurerm_network_interface", "azurerm_subnet"],
    azurerm_windows_virtual_machine: ["azurerm_network_interface", "azurerm_subnet"],
    azurerm_virtual_machine: ["azurerm_network_interface", "azurerm_subnet"],
  },
  gcp: {
    google_compute_subnetwork: ["google_compute_network"],
    google_compute_instance: ["google_compute_subnetwork"],
  },
  other: {},
};

/**
 * Build the module/resource hierarchy from the flat abstracted IR.
 * Module order and resource order within a module both follow plan order.
 */
export function groupNodes(nodes: ResourceNode[], refs?: Map<string, string[]>): Container[] {
  const moduleOrder: string[] = [];
  const byModule = new Map<string, ResourceNode[]>();

  for (const node of nodes) {
    let bucket = byModule.get(node.group);
    if (!bucket) {
      bucket = [];
      byModule.set(node.group, bucket);
      moduleOrder.push(node.group);
    }
    bucket.push(node);
  }

  return moduleOrder.map((module) => ({
    kind: "container" as const,
    id: module,
    label: module,
    containerType: "module" as const,
    children: buildTopology(byModule.get(module) ?? [], refs),
  }))
}


// Containment never crosses a module boundary.
function buildTopology(resources: ResourceNode[], refs?: Map<string, string[]>): TreeNode[] {
  const parentOf = new Map<string, string>();
  const childrenOf = new Map<string, ResourceNode[]>();

  for (const node of resources) {
    const parent = findParent(node, resources, refs);
    if (parent) {
      parentOf.set(node.id, parent.id);
      const kids = childrenOf.get(parent.id) ?? [];
      kids.push(node);
      childrenOf.set(parent.id, kids);
    }
  }
  // Top level of this module = resources with no resolved parent, in plan order.
  return resources.filter((n) => !parentOf.has(n.id)).map((n) => toTree(n, childrenOf));
}

function toTree(node: ResourceNode, childrenOf: Map<string, ResourceNode[]>): TreeNode {
  const kids = childrenOf.get(node.id);
  if (!kids || kids.length === 0) return node;
  return {
    kind: "container",
    id: node.id,
    label: `${node.type}.${node.name}`,
    containerType: "resource",
    resource: node,
    children: kids.map((k) => toTree(k, childrenOf)),
  }
}

/**
 * Structural container types and how specific they are (subnet sits inside vpc).
 * A referenced resource of one of these types is a real containment parent.
 */
const STRUCTURAL_SPECIFICITY: Record<string, number> = {
  aws_vpc: 1,
  aws_subnet: 2,
  azurerm_virtual_network: 1,
  azurerm_subnet: 2,
  google_compute_network: 1,
  google_compute_subnetwork: 2,
};

/**
 * Prefer a parent derived from real references; fall back to the type heuristic when
 * the plan has no config block or a node references nothing structural (e.g. RDS,
 * whose subnet link is indirect). References give precision, heuristics give coverage.
 */
function findParent(
  node: ResourceNode,
  pool: ResourceNode[],
  refs?: Map<string, string[]>,
): ResourceNode | undefined {
  if (refs) {
    const byReference = referenceParent(node, pool, refs);
    if (byReference) return byReference;
  }
  return heuristicParent(node, pool);
}

function referenceParent(
  node: ResourceNode,
  pool: ResourceNode[],
  refs: Map<string, string[]>,
): ResourceNode | undefined {
  let best: ResourceNode | undefined;
  let bestScore = 0;
  for (const target of refs.get(node.id) ?? []) {
    const candidate = pool.find((c) => c.id === target && c.id !== node.id);
    const score = candidate ? (STRUCTURAL_SPECIFICITY[candidate.type] ?? 0) : 0;
    if (candidate && score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Find the parent for a node among same-module, same-provider candidates using
 * the provider's containment rules. The highest-priority parent type that has at
 * least one candidate wins; among candidates of that type we take the first in
 * plan order (the approximate part — see CONTAINMENT).
 */
function heuristicParent(node: ResourceNode, pool: ResourceNode[]): ResourceNode | undefined {
  const rules = CONTAINMENT[node.provider][node.type];
  if (!rules) return undefined;
  for (const parentType of rules) {
    const parent = pool.find(
      (c) => c.id !== node.id && c.provider === node.provider && c.type === parentType,
    );
    if (parent) return parent;
  }
  return undefined;
}

/** Leaves + resource containers; module containers don't count. */
export function countResources(nodes: TreeNode[]): number {
  let total = 0;
  for (const n of nodes) {
    if (isContainer(n)) {
      if (n.resource) total += 1;
      total += countResources(n.children);
    } else {
      total += 1;
    }
  }
  return total;
}