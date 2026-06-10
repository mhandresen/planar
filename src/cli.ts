#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parsePlan } from "./core/parse.js";
import { abstractNodes } from "./core/abstract.js";
import { countResources, groupNodes, isContainer, type TreeNode } from "./core/group.js";
import type { TerraformPlan } from "./core/plan.js";

const SYMBOL: Record<string, string> = {
  create: "+",
  update: "~",
  delete: "-",
  replace: "±",
  noop: " ",
};

/** Print one tree node and its descendants, indented by depth. */
function printNode(node: TreeNode, depth: number): void {
  // Module containers are the un-indented bracketed headers.
  if (isContainer(node) && node.containerType === "module") {
    console.log(`[${node.label}]`);
    for (const child of node.children) printNode(child, depth + 1);
    return;
  }

  // Resource containers and leaf resources both render from a backing resource.
  const resource = isContainer(node) ? node.resource! : node;
  const indent = "  ".repeat(depth);
  console.log(
    `${indent}${SYMBOL[resource.status]} ${resource.status.padEnd(7)} ${resource.type}.${resource.name}  (${resource.provider})`,
  );

  if (isContainer(node)) {
    for (const child of node.children) printNode(child, depth + 1);
  }
}

function main(): void {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: planar <plan.json>");
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

  const tree = groupNodes(abstractNodes(parsePlan(plan)));
  const total = countResources(tree);

  console.log(`planar: ${total} resource(s) across ${tree.length} group(s)\n`);
  for (const moduleContainer of tree) {
    printNode(moduleContainer, 0);
    console.log();
  }
}

main();