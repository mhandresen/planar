import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildReferenceMap, parsePlan } from "../src/core/parse.js";
import { abstractNodes } from "../src/core/abstract.js";
import { groupNodes, isContainer, type TreeNode } from "../src/core/group.js";
import type { TerraformPlan } from "../src/core/plan.js";

const load = (name: string) =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), "utf8"),
  ) as TerraformPlan;

const tiered = load("aws-3tier.plan.json");
const basic = load("aws-basic.plan.json");

function parentIdOf(nodes: TreeNode[], id: string, parent: string): string | undefined {
  for (const n of nodes) {
    if (n.id === id) return parent;
    if (isContainer(n)) {
      const found = parentIdOf(n.children, id, n.id);
      if (found) return found;
    }
  }
  return undefined;
}

describe("buildReferenceMap", () => {
  const refs = buildReferenceMap(tiered);

  it("resolves attribute access down to the bare resource address", () => {
    expect(refs.get("aws_subnet.public")).toEqual(["aws_vpc.main"]);
  });

  it("collects every distinct reference target for a resource", () => {
    expect(refs.get("aws_instance.web")).toEqual(
      expect.arrayContaining(["aws_subnet.public", "aws_security_group.web"]),
    );
  });

  it("is empty for a plan with no configuration block", () => {
    expect(buildReferenceMap(basic).size).toBe(0);
  });
});

describe("groupNodes with references", () => {
  const tree = groupNodes(abstractNodes(parsePlan(tiered)), buildReferenceMap(tiered));

  it("nests each instance in the subnet it actually references", () => {
    expect(parentIdOf(tree, "aws_instance.web", "root")).toBe("aws_subnet.public");
    expect(parentIdOf(tree, "aws_instance.api", "root")).toBe("aws_subnet.private");
  });

  it("falls back to the heuristic when a node references nothing structural", () => {
    expect(parentIdOf(tree, "aws_db_instance.main", "root")).toBe("aws_vpc.main");
  });

  it("leaves unreferenced resources at the module top level", () => {
    expect(parentIdOf(tree, "aws_s3_bucket.assets", "root")).toBe("root");
  });
});

describe("groupNodes without references (heuristic only)", () => {
  const tree = groupNodes(abstractNodes(parsePlan(tiered)));

  it("cannot disambiguate subnets and packs both instances into the first one", () => {
    expect(parentIdOf(tree, "aws_instance.web", "root")).toBe("aws_subnet.public");
    expect(parentIdOf(tree, "aws_instance.api", "root")).toBe("aws_subnet.public");
  });
});
