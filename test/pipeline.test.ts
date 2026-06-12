import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { planToSvg } from "../src/core/pipeline.js";
import type { TerraformPlan } from "../src/core/plan.js";

const load = (name: string) =>
  JSON.parse(
    readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), "utf8"),
  ) as TerraformPlan;

describe("planToSvg (end to end)", () => {
  it("renders the three-tier plan into a valid SVG", async () => {
    const { svg, count, counts } = await planToSvg(load("aws-3tier.plan.json"), "light");

    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
    expect(count).toBe(11);
    expect(counts.create).toBe(14);
    expect(svg).toContain("aws_db_instance");
  });

  it("reflects every diff status in the counts", async () => {
    const { counts } = await planToSvg(load("aws-basic.plan.json"), "light");

    expect(counts).toEqual({ create: 6, update: 1, replace: 1, delete: 1, noop: 1 });
  });

  it("renders a dark theme variant", async () => {
    const light = await planToSvg(load("aws-3tier.plan.json"), "light");
    const dark = await planToSvg(load("aws-3tier.plan.json"), "dark");

    expect(dark.svg.startsWith("<svg")).toBe(true);
    expect(dark.count).toBe(light.count);
    expect(dark.svg).not.toEqual(light.svg);
  });
});
