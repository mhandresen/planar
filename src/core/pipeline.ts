import { parsePlan, buildReferenceMap, Status, ResourceNode } from "./parse.js";
import { abstractNodes } from "./abstract.js";
import { demote } from "./demote.js";
import { groupNodes, countResources } from "./group.js";
import { layout } from "./layout.js";
import { renderSvg } from "./render.js";
import type { TerraformPlan } from "./plan.js"
import type { ThemeName } from "./theme.js";

export interface RenderResult {
  svg: string;
  count: number;
  counts: Record<Status, number>;
}

export async function planToSvg(plan: TerraformPlan, theme: ThemeName = "light"): Promise<RenderResult> {
  const all = parsePlan(plan);
  const refs = buildReferenceMap(plan);
  const { nodes, badges } = demote(abstractNodes(all), refs);
  const tree = groupNodes(nodes, refs);

  return {
    svg: renderSvg(await layout(tree), badges, theme),
    count: countResources(tree),
    counts: tally(all),
  }
}

function tally(nodes: ResourceNode[]): Record<Status, number> {
  const counts: Record<Status, number> = { create: 0, update: 0, replace: 0, delete: 0, noop: 0 };
  for (const node of nodes) counts[node.status] += 1;
  return counts;
}