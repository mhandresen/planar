import type { Action, ResourceChange, TerraformPlan } from "./plan.js";

// Collapsed change status used by the layout/render layers.
export type Status = "create" | "update" | "delete" | "replace" | "noop";

// Normalized cloud provider, drives icon lookup downstream.
export type Provider = "aws" | "azure" | "gcp" | "other";

export interface ResourceNode {
  id: string;
  type: string;
  name: string;
  provider: Provider;
  group: string;
  status: Status;
}

export function toStatus(actions: Action[]): Status {
  const set = new Set(actions);
  if (set.has("create") && set.has("delete")) return "replace";
  if (set.has("create")) return "create";
  if (set.has("delete")) return "delete";
  if (set.has("update")) return "update";
  return "noop";
}

export function normalizeProvider(providerName: string): Provider {
  if (providerName.includes("azurerm") || providerName.includes("azure")) return "azure";
  if (providerName.includes("google")) return "gcp";
  if (providerName.includes("aws")) return "aws";
  return "other";
}

function toNode(rc: ResourceChange): ResourceNode {
  return {
    id: rc.address,
    type: rc.type,
    name: rc.name,
    provider: normalizeProvider(rc.provider_name),
    group: rc.module_address ?? "root",
    status: toStatus(rc.change.actions),
  };
}

/**
 * Parse a Terraform plan document into the IR.
 * Data sources (mode === "data") are excluded — they describe lookups, not infra.
 */

export function parsePlan(plan: TerraformPlan): ResourceNode[] {
  return (plan.resource_changes ?? []).filter((rc) => rc.mode === "managed").map(toNode);
}

/**
 * Build an address -> referenced-addresses map from the plan's configuration block.
 * References arrive as expression operands (e.g. "aws_vpc.main.id"); we trim trailing
 * segments until they match a real resource address. Root module only for now.
 */
export function buildReferenceMap(plan: TerraformPlan): Map<string, string[]> {
  const known = new Set(
    (plan.resource_changes ?? []).filter((rc) => rc.mode === "managed").map((rc) => rc.address),
  );

  const map = new Map<string, string[]>();
  for (const res of plan.configuration?.root_module?.resources ?? []) {
    const targets = new Set<string>();
    for (const expr of Object.values(res.expressions ?? {})) {
      for (const ref of expr.references ?? []) {
        const addr = resolveReference(ref, known);
        if (addr && addr !== res.address) targets.add(addr);
      }
    }
    map.set(res.address, [...targets]);
  }
  return map;
}

function resolveReference(ref: string, known: Set<string>): string | undefined {
  let candidate = ref;
  while (candidate.length > 0) {
    if (known.has(candidate)) return candidate;
    const dot = candidate.lastIndexOf(".");
    if (dot < 0) return undefined;
    candidate = candidate.slice(0, dot);
  }
  return undefined;
}
