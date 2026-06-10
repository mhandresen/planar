#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { parsePlan, buildReferenceMap } from "./core/parse.js";
import { abstractNodes } from "./core/abstract.js";
import { countResources, groupNodes, isContainer, type TreeNode } from "./core/group.js";
import { layout } from "./core/layout.js";
import { renderSvg } from "./core/render.js";
import type { TerraformPlan } from "./core/plan.js";

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
  const file = process.argv[2];
  if (!file) {
    console.error("usage: planar <plan.json> [out.svg]");
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

  const tree = groupNodes(abstractNodes(parsePlan(plan)), buildReferenceMap(plan));

  const out = process.argv[3];
  if (out) {
    writeFileSync(out, renderSvg(await layout(tree)));
    console.log(`planar: wrote ${countResources(tree)} resource(s) to ${out}`);
    return;
  }

  console.log(`planar: ${countResources(tree)} resource(s) across ${tree.length} group(s)\n`);
  for (const moduleContainer of tree) {
    printNode(moduleContainer, 0);
    console.log();
  }
}

main();