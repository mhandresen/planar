import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parsePlan } from "../src/core/parse.js";
import { abstractNodes } from "../src/core/abstract.js";
import {
  countResources,
  groupNodes,
  isContainer,
  type Container,
  type TreeNode,
} from "../src/core/group.js";
import type { TerraformPlan } from "../src/core/plan.js";

const fixture = JSON.parse(
  readFileSync(fileURLToPath(new URL("./fixtures/aws-basic.plan.json", import.meta.url)), "utf8"),
) as TerraformPlan;

const tree = groupNodes(abstractNodes(parsePlan(fixture)));

function childByType(node: Container, type: string): TreeNode | undefined {
  return node.children.find((c) => (isContainer(c) ? c.resource?.type === type : c.type === type));
}

function moduleById(id: string): Container {
  const m = tree.find((c) => c.id === id);
  if (!m) throw new Error(`no module container "${id}"`);
  return m;
}

describe("groupNodes", () => {
  it("produces one module container per module, in plan order", () => {
    expect(tree.map((c) => c.id)).toEqual(["root", "module.networking"]);
    expect(tree.every((c) => c.containerType === "module")).toBe(true);
  });

  it("nests instance inside subnet inside vpc (the core M1.5 proof)", () => {
    const root = moduleById("root");

    const vpc = childByType(root, "aws_vpc");
    if (!vpc || !isContainer(vpc)) throw new Error("expected aws_vpc container at root level");
    expect(vpc.resource?.id).toBe("aws_vpc.main");

    const subnet = childByType(vpc, "aws_subnet");
    if (!subnet || !isContainer(subnet)) throw new Error("expected aws_subnet container under vpc");
    expect(subnet.resource?.id).toBe("aws_subnet.public");

    const instance = childByType(subnet, "aws_instance");
    if (!instance) throw new Error("expected aws_instance under subnet");
    expect(isContainer(instance)).toBe(false);
  });

  it("attaches the security group and db instance under the vpc", () => {
    const vpc = childByType(moduleById("root"), "aws_vpc") as Container;
    const childTypes = vpc.children.map((c) => (isContainer(c) ? c.resource!.type : c.type));
    expect(childTypes).toContain("aws_security_group");
    expect(childTypes).toContain("aws_db_instance");
  });

  it("keeps a non-VPC resource (S3) at the module top level", () => {
    const root = moduleById("root");
    const s3 = root.children.find((c) => !isContainer(c) && c.type === "aws_s3_bucket");
    expect(s3).toBeDefined();
  });

  it("leaves a lone module resource at that module's top level", () => {
    const net = moduleById("module.networking");
    expect(net.children).toHaveLength(1);
    const nat = net.children[0]!;
    if (isContainer(nat)) throw new Error("expected nat gateway to be a leaf");
    expect(nat.type).toBe("aws_nat_gateway");
  });

  it("preserves child order within a container (plan order)", () => {
    const vpc = childByType(moduleById("root"), "aws_vpc") as Container;
    const ids = vpc.children.map((c) => (isContainer(c) ? c.resource!.id : c.id));
    expect(ids).toEqual(["aws_subnet.public", "aws_security_group.web", "aws_db_instance.main"]);
  });

  it("loses no resources in grouping (count matches the abstracted IR)", () => {
    expect(countResources(tree)).toBe(7);
  });

  it("returns [] for an empty plan", () => {
    expect(groupNodes([])).toEqual([]);
  });
});