import { describe, expect, it } from "vitest";
import { categoryOf } from "../src/core/category.js";

describe("categoryOf", () => {
  it("classifies common types by keyword", () => {
    expect(categoryOf("aws_vpc")).toBe("network");
    expect(categoryOf("aws_instance")).toBe("compute");
    expect(categoryOf("aws_s3_bucket")).toBe("storage");
    expect(categoryOf("aws_security_group")).toBe("security");
  });

  it("classifies types with no bespoke glyph", () => {
    expect(categoryOf("aws_lambda_function")).toBe("compute");
    expect(categoryOf("aws_dynamodb_table")).toBe("database");
    expect(categoryOf("aws_sqs_queue")).toBe("integration");
    expect(categoryOf("aws_cloudfront_distribution")).toBe("network");
  });

  it("does not let 'instance' override database for db_instance", () => {
    expect(categoryOf("aws_db_instance")).toBe("database");
  });

  it("works across providers", () => {
    expect(categoryOf("azurerm_linux_virtual_machine")).toBe("compute");
    expect(categoryOf("google_sql_database_instance")).toBe("database");
    expect(categoryOf("azurerm_storage_account")).toBe("storage");
  });

  it("falls back to other for unrecognized types", () => {
    expect(categoryOf("frobnicator_thing")).toBe("other");
  });
});