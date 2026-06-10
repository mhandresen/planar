/*
 * Minimal types for the Terraform plan representation, i.e. the output of:
 *   terraform plan -out tfplan.bin
 *   terraform show -json tfplan > plan.json
 * We deliberately type only what Planar consumes. The full schema is large and
 * versioned; see https://developer.hashicorp.com/terraform/internals/json-format
 */

export type Action = "no-op" | "create" | "read" | "update" | "delete";

export interface Change {
  /*
   * Ordered list of actions. Notably:
   * ["create"]            -> create
   * ["update"]            -> in-place update
   * ["delete"]            -> destroy
   * ["delete", "create"]  -> replace (destroy then create)
   * ["create", "delete"]  -> replace (create then destroy)
   * ["no-op"]             -> no change
   */
  actions: Action[];
  before: unknown;
  after: unknown;
}

export interface ResourceChange {
  /** Fully qualified address of the resource, e.g. "module.networking.aws_nat_gateway.main" */
  address: string;
  /** Present only for resources inside a module. */
  module_address?: string;
  mode: "managed" | "data";
  type: string; // e.g. "aws_instance"
  name: string; // e.g. "web"
  provider_name: string; // e.g. "registry.terraform.io/hashicorp/aws"
  change: Change;
}

export interface TerraformPlan {
  format_version: string;
  terraform_version: string;
  /** Absent when the plan has no resource changes. */
  resource_changes: ResourceChange[];
}