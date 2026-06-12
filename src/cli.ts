#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { parsePlan, buildReferenceMap } from "./core/parse.js";
import { abstractNodes } from "./core/abstract.js";
import { demote } from "./core/demote.js";
import { countResources, groupNodes, isContainer, type TreeNode } from "./core/group.js";
import type { TerraformPlan } from "./core/plan.js";
import { planToSvg } from "./core/pipeline.js";

const SYMBOL: Record<string, string> = {
  create: "+",
  update: "~",
  delete: "-",
  replace: "±",
  noop: " ",
};

function printNode(node: TreeNode, depth: number): void {
  if (isContainer(node) && node.containerType === "module") {
    console.log(`[${node.label}]`);
    for (const child of node.children) printNode(child, depth + 1);
    return;
  }

  const resource = isContainer(node) ? node.resource! : node;
  const indent = "  ".repeat(depth);
  console.log(
    `${indent}${SYMBOL[resource.status]} ${resource.status.padEnd(7)} ${resource.type}.${resource.name}  (${resource.provider})`,
  );

  if (isContainer(node)) {
    for (const child of node.children) printNode(child, depth + 1);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const theme = args.includes("--dark") ? "dark" : "light";
  const [file, out] = args.filter((a) => !a.startsWith("--"));
  if (!file) {
    console.error("usage: planar <plan.json> [out.svg] [--dark]");
    console.error("  produce with: terraform show -json tfplan.bin > plan.json");
    process.exit(1);
  }

  let plan: TerraformPlan;
  try {
    plan = JSON.parse(readFileSync(file, "utf8")) as TerraformPlan;
  } catch (err) {
    console.error(`failed to read/parse ${file}:`, (err as Error).message);
    process.exit(1);
  }

  if (out) {
    const { svg, count } = await planToSvg(plan, theme);
    writeFileSync(out, svg);
    console.log(`planar: wrote ${count} resource(s) to ${out}`);
    return;
  }
  const refs = buildReferenceMap(plan);
  const { nodes } = demote(abstractNodes(parsePlan(plan)), refs);
  const tree = groupNodes(nodes, refs);

  console.log(`planar: ${countResources(tree)} resource(s) across ${tree.length} group(s)\n`);
  for (const moduleContainer of tree) {
    printNode(moduleContainer, 0);
    console.log();
  }
}

main();
