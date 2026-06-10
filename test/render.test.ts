import { describe, expect, it } from "vitest";
import { renderSvg } from "../src/core/render.js";

describe("renderSvg", () => {
  it("renders a valid placeholder when there is nothing to draw", () => {
    const svg = renderSvg({ width: 0, height: 0, nodes: [] });
    expect(svg).toContain("No resources to display");
    const width = Number(svg.match(/width="(\d+)"/)?.[1]);
    expect(width).toBeGreaterThan(0);
  });
  it("applies the dark palette when requested", () => {
    const svg = renderSvg({ width: 0, height: 0, nodes: [] }, new Map(), "dark");
    expect(svg).toContain("#0f1623");
  });
});