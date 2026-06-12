import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { normalizeProvider, parsePlan, toStatus } from "../src/core/parse.js";
import { abstractNodes } from "../src/core/abstract.js";
import type { TerraformPlan } from "../src/core/plan.js";

const fixture = JSON.parse(
  readFileSync(fileURLToPath(new URL("./fixtures/aws-basic.plan.json", import.meta.url)), "utf8"),
) as TerraformPlan;

describe("toStatus", () => {
  it("maps single actions", () => {
    expect(toStatus(["create"])).toBe("create");
    expect(toStatus(["update"])).toBe("update");
    expect(toStatus(["delete"])).toBe("delete");
    expect(toStatus(["no-op"])).toBe("noop");
  });

  it("treats delete+create (either order) as replace", () => {
    expect(toStatus(["delete", "create"])).toBe("replace");
    expect(toStatus(["create", "delete"])).toBe("replace");
  });
});

describe("normalizeProvider", () => {
  it("normalizes known provider names", () => {
    expect(normalizeProvider("registry.terraform.io/hashicorp/aws")).toBe("aws");
    expect(normalizeProvider("registry.terraform.io/hashicorp/azurerm")).toBe("azure");
    expect(normalizeProvider("registry.terraform.io/hashicorp/google")).toBe("gcp");
    expect(normalizeProvider("registry.terraform.io/hashicorp/random")).toBe("other");
  });
});

describe("parsePlan", () => {
  const nodes = parsePlan(fixture);

  it("excludes data sources", () => {
    expect(nodes.some((n) => n.id.startsWith("data."))).toBe(false);
  });

  it("keeps every managed resource (incl. noise, pre-abstraction)", () => {
    expect(nodes).toHaveLength(10);
  });

  it("detects the replace on aws_db_instance.main", () => {
    expect(nodes.find((n) => n.type === "aws_db_instance")?.status).toBe("replace");
  });

  it("groups module resources under their module address", () => {
    expect(nodes.find((n) => n.type === "aws_nat_gateway")?.group).toBe("module.networking");
  });

  it("defaults root resources to the 'root' group", () => {
    expect(nodes.find((n) => n.type === "aws_vpc")?.group).toBe("root");
  });

  it("returns [] for a plan with no resource_changes", () => {
    expect(parsePlan({ format_version: "1.2", terraform_version: "1.9.5" })).toEqual([]);
  });
});

describe("abstractNodes", () => {
  const nodes = abstractNodes(parsePlan(fixture));

  it("drops plumbing and no-op resources", () => {
    expect(nodes).toHaveLength(7);
    expect(nodes.some((n) => n.type === "aws_iam_role_policy_attachment")).toBe(false);
    expect(nodes.some((n) => n.type === "aws_route_table_association")).toBe(false);
    expect(nodes.some((n) => n.type === "aws_cloudwatch_log_group")).toBe(false);
  });

  it("preserves real infrastructure", () => {
    const types = nodes.map((n) => n.type);
    expect(types).toContain("aws_vpc");
    expect(types).toContain("aws_instance");
    expect(types).toContain("aws_nat_gateway");
  });
});
