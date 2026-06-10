import { describe, expect, it } from "vitest";
import { icon } from "../src/core/icons.js";

describe("icon", () => {
  it("injects the accent color", () => {
    expect(icon("aws_instance", "#7c3aed", 0, 0)).toContain('stroke="#7c3aed"');
  });

  it("returns a distinct glyph per known type", () => {
    expect(icon("aws_db_instance", "#000", 0, 0)).not.toBe(icon("aws_s3_bucket", "#000", 0, 0));
  });

  it("falls back to a generic glyph for unknown types", () => {
    const unknown = icon("frobnicator", "#000", 0, 0);
    expect(unknown).not.toBe(icon("aws_vpc", "#000", 0, 0));
    expect(unknown).toContain("rect");
  });
});