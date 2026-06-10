import type { ResourceNode } from "./parse.js";

export type Badge = "security";

/** Cross-cutting resource types that clutter a diagram as nodes; shown as a badge instead. */
const DEMOTED: Record<string, Badge> = {
  aws_security_group: "security",
  azurerm_network_security_group: "security",
  google_compute_firewall: "security",
};

export interface Demoted {
  nodes: ResourceNode[];
  badges: Map<string, Badge[]>;
}

/**
 * Fold demoted resources into badges on whatever references them. A demoted
 * resource is only removed once it has somewhere to live (a referencing node);
 * an unattributable one (no config, orphan) stays a node so the diff never
 * silently loses a changed resource.
 */
export function demote(nodes: ResourceNode[], refs: Map<string, string[]>): Demoted {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const attributed = new Set<string>();
  const badges = new Map<string, Badge[]>();

  for (const node of nodes) {
    if (DEMOTED[node.type]) continue;
    const kinds = new Set<Badge>();
    for (const target of refs.get(node.id) ?? []) {
      const badge = DEMOTED[byId.get(target)?.type ?? ""];
      if (badge) {
        kinds.add(badge);
        attributed.add(target);
      }
    }
    if (kinds.size) badges.set(node.id, [...kinds]);
  }

  return {
    nodes: nodes.filter((n) => !(DEMOTED[n.type] && attributed.has(n.id))),
    badges,
  };
}