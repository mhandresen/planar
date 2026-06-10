import { ResourceNode } from "./parse.js";

/**
 * Resource types that are Terraform plumbing — important for state, noise on a
 * diagram. Intentionally minimal; grows as needed.
 */

export const NOISE_TYPES = new Set<string>([
  // AWS
  "aws_iam_policy_attachment",
  "aws_iam_role_policy_attachment",
  "aws_iam_role_policy",
  "aws_route_table_association",
  "aws_security_group_rule",
  "aws_route",
  // Azure
  "azurerm_role_assignment",
  "azurerm_subnet_network_security_group_association",
  // GCP
  "google_project_iam_member",
  // Cross-provider
  "null_resource",
]);

/** Type prefixes that are almost always glue rather than infrastructure */
export const NOISE_PREFIXES = ["random_", "tls_", "time_", "local_"]

function isNoise(type: string): boolean {
  return NOISE_TYPES.has(type) || NOISE_PREFIXES.some((p => type.startsWith(p)));
}

/**
 * Drop no-op changes and plumbing resources, leaving only the nodes worth
 * drawing. Order-preserving so downstream layout stays deterministic.
 */

export function abstractNodes(nodes: ResourceNode[]): ResourceNode[] {
  return nodes.filter((n) => n.status !== "noop" && !isNoise(n.type));
}