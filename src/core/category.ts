export type Category = "network" | "compute" | "storage" | "database" | "security" | "integration" | "other";

/**
 * Keyword rules, checked in order; first match wins. Real plans carry hundreds of
 * resource types, so we classify by substring rather than an exhaustive table.
 * Order matters: database precedes compute so "aws_db_instance" isn't caught by
 * "instance"; security precedes network so "network_acl" isn't caught by "network".
 */
const RULES: Array<[Category, string[]]> = [
  [
    "security",
    [
      "security_group",
      "iam",
      "kms",
      "secret",
      "firewall",
      "waf",
      "network_acl",
      "nacl",
      "acm",
      "certificate",
      "guardduty",
      "shield",
    ],
  ],
  [
    "database",
    [
      "rds",
      "db_instance",
      "dynamodb",
      "elasticache",
      "redshift",
      "neptune",
      "docdb",
      "memorydb",
      "aurora",
      "sql_database",
      "cosmos",
      "bigtable",
      "spanner",
      "firestore",
      "_database",
    ],
  ],
  [
    "storage",
    ["s3", "_bucket", "ebs", "efs", "fsx", "glacier", "blob", "managed_disk", "filestore", "storage"],
  ],
  [
    "integration",
    [
      "sqs",
      "sns",
      "eventbridge",
      "event_rule",
      "cloudwatch_event",
      "sfn",
      "step_function",
      "kinesis",
      "msk",
      "kafka",
      "pubsub",
      "servicebus",
      "eventgrid",
      "appsync",
      "api_gateway",
      "apigateway",
    ],
  ],
  [
    "compute",
    [
      "instance",
      "lambda",
      "ecs",
      "eks",
      "fargate",
      "batch",
      "lightsail",
      "autoscaling",
      "launch_template",
      "function",
      "virtual_machine",
      "app_service",
      "cloud_run",
      "gke",
      "kubernetes",
      "container",
    ],
  ],
  [
    "network",
    [
      "vpc",
      "subnet",
      "nat_gateway",
      "internet_gateway",
      "route",
      "vpn",
      "lb",
      "load_balancer",
      "elb",
      "alb",
      "nlb",
      "cloudfront",
      "route53",
      "dns",
      "network",
      "eip",
      "_address",
      "endpoint",
      "peering",
      "transit_gateway",
      "vnet",
      "cdn",
    ],
  ],
];

export function categoryOf(type: string): Category {
  for (const [category, keywords] of RULES) {
    if (keywords.some((k) => type.includes(k))) return category;
  }
  return "other";
}
