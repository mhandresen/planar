import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildReferenceMap, parsePlan } from "../src/core/parse.js";
import { abstractNodes } from "../src/core/abstract.js";
import { demote } from "../src/core/demote.js";
import type { TerraformPlan } from "../src/core/plan.js";

const load = (name: string) =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), "utf8"),
  ) as TerraformPlan;

const tiered = load("aws-3tier.plan.json");
const basic = load("aws-basic.plan.json");

function run(plan: TerraformPlan) {
  return demote(abstractNodes(parsePlan(plan)), buildReferenceMap(plan));
}

describe("demote", () => {
  it("removes referenced security groups from the node set", () => {
    const { nodes } = run(tiered);
    expect(nodes.some((n) => n.type === "aws_security_group")).toBe(false);
  });

  it("badges the resources that reference a security group", () => {
    const { badges } = run(tiered);
    expect(badges.get("aws_instance.web")).toEqual(["security"]);
    expect(badges.get("aws_instance.api")).toEqual(["security"]);
    expect(badges.get("aws_lb.app")).toEqual(["security"]);
    expect(badges.get("aws_db_instance.main")).toEqual(["security"]);
  });

  it("does not badge resources that touch no security group", () => {
    const { badges } = run(tiered);
    expect(badges.has("aws_vpc.main")).toBe(false);
    expect(badges.has("aws_subnet.public")).toBe(false);
  });

  it("keeps a security group that nothing references (no config block)", () => {
    const { nodes, badges } = run(basic);
    expect(nodes.some((n) => n.type === "aws_security_group")).toBe(true);
    expect(badges.size).toBe(0);
  });
});
