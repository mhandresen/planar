#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parsePlan } from "./core/parse.js";
import { abstractNodes } from "./core/abstract.js";
import type { TerraformPlan } from "./core/plan.js";

function main(): void {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: planar <plan.json>");
    console.error("  produce with: terraform show-json tfplan.bin > plan.json");
    process.exit(1);
  }

  let plan: TerraformPlan;
  try {
    plan = JSON.parse(readFileSync(file, "utf-8")) as TerraformPlan;
  } catch (err) {
    console.error(`failed to read/parse ${file}:`, (err as Error).message);
    process.exit(1);
  }

  const nodes = abstractNodes(parsePlan(plan));

  const byGroup = new Map<string, typeof nodes>();
  for (const node of nodes) {
    const bucket = byGroup.get(node.group) ?? [];
    bucket.push(node);
    byGroup.set(node.group, bucket);
  }

  const symbol: Record<string, string> = {
    create: "+",
    update: "~",
    delete: "-",
    replace: "±",
    noop: " ",
  };

  console.log(`planar: ${nodes.length} resource(s) across ${byGroup.size} group(s)\n`);
  for (const [group, groupNodes] of byGroup) {
    console.log(`[${group}]`);
    for (const node of groupNodes) {
      console.log(`  ${symbol[node.status]} ${node.status.padEnd(7)} ${node.type}.${node.name}  (${node.provider})`);
    }
    console.log();
  }
}

main();