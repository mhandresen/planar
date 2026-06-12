import { parsePlan, buildReferenceMap } from "./parse.js";
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
}

export async function planToSvg(plan: TerraformPlan, theme: ThemeName = "light"): Promise<RenderResult> {
  const refs = buildReferenceMap(plan);
  const { nodes, badges } = demote(abstractNodes(parsePlan(plan)), refs);
  const tree = groupNodes(nodes, refs);
  return { svg: renderSvg(await layout(tree), badges, theme), count: countResources(tree) };
}