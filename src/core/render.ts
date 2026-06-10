import { isContainer, type Container } from "./group.js";
import type { Status } from "./parse.js";
import type { LayoutResult, PositionedNode } from "./layout.js";

const SANS = "ui-sans-serif, -apple-system, 'Segoe UI', Roboto, sans-serif";
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace";

const CANVAS = "#f6f7f9";
const INK = "#0f172a";
const MUTED = "#64748b";

type Category = "network" | "compute" | "storage" | "database" | "security" | "other";

const CATEGORY_COLOR: Record<Category, string> = {
  network: "#0891b2",
  compute: "#7c3aed",
  storage: "#0d9488",
  database: "#4f46e5",
  security: "#475569",
  other: "#94a3b8",
};

const STATUS_COLOR: Record<Status, string> = {
  create: "#16a34a",
  update: "#d97706",
  replace: "#d97706",
  delete: "#dc2626",
  noop: "#94a3b8",
};

const CATEGORY_BY_TYPE: Record<string, Category> = {
  aws_vpc: "network",
  aws_subnet: "network",
  aws_nat_gateway: "network",
  aws_internet_gateway: "network",
  aws_route_table: "network",
  aws_eip: "network",
  aws_lb: "network",
  aws_instance: "compute",
  aws_s3_bucket: "storage",
  aws_db_instance: "database",
  aws_security_group: "security",
};

const categoryOf = (type: string): Category => CATEGORY_BY_TYPE[type] ?? "other";

export function renderSvg(result: LayoutResult): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${result.width}" height="${result.height}"`,
    ` viewBox="0 0 ${result.width} ${result.height}" font-family="${SANS}">`,
    `<defs><filter id="card" x="-20%" y="-20%" width="140%" height="140%">`,
    `<feDropShadow dx="0" dy="1" stdDeviation="2.5" flood-color="#0f172a" flood-opacity="0.10"/>`,
    `</filter></defs>`,
    `<rect width="${result.width}" height="${result.height}" fill="${CANVAS}"/>`,
    result.nodes.map(renderNode).join(""),
    `</svg>`,
  ].join("");
}

function renderNode(n: PositionedNode): string {
  const inner = isContainer(n.node) ? n.children.map(renderNode).join("") : "";
  return `<g transform="translate(${n.x},${n.y})">${chrome(n)}${inner}</g>`;
}

function chrome(n: PositionedNode): string {
  if (!isContainer(n.node)) return leaf(n);
  return n.node.containerType === "module" ? modulePanel(n, n.node) : containerCard(n, n.node);
}

function modulePanel(n: PositionedNode, node: Container): string {
  return (
    `<rect width="${n.width}" height="${n.height}" rx="14" fill="#eef1f5" stroke="#dbe1ea"/>` +
    text(20, 27, node.label.toUpperCase(), 11, 700, MUTED, SANS, "start", 1.2)
  );
}

function containerCard(n: PositionedNode, node: Container): string {
  const r = node.resource!;
  const accent = CATEGORY_COLOR[categoryOf(r.type)];
  return (
    `<rect width="${n.width}" height="${n.height}" rx="12" fill="#ffffff" stroke="#e2e8f0" filter="url(#card)"/>` +
    `<path d="M0 12 Q0 0 12 0 H${n.width - 12} Q${n.width} 0 ${n.width} 12 V42 H0 Z" fill="${accent}" fill-opacity="0.07"/>` +
    rail(14, 26, STATUS_COLOR[r.status]) +
    `<circle cx="26" cy="21" r="4" fill="${accent}"/>` +
    text(38, 25, r.name, 13, 650, INK, SANS, "start") +
    text(n.width - 16, 25, r.type, 11, 500, MUTED, MONO, "end")
  );
}

function leaf(n: PositionedNode): string {
  if (isContainer(n.node)) return "";
  const { type, name, status } = n.node;
  const accent = CATEGORY_COLOR[categoryOf(type)];
  return (
    `<rect width="${n.width}" height="${n.height}" rx="12" fill="#ffffff" stroke="#e2e8f0" filter="url(#card)"/>` +
    rail(14, n.height - 28, STATUS_COLOR[status]) +
    `<circle cx="26" cy="25" r="4" fill="${accent}"/>` +
    text(38, 29, name, 14, 650, INK, SANS, "start") +
    text(26, 49, type, 11, 500, MUTED, MONO, "start") +
    text(n.width - 16, 29, status.toUpperCase(), 10, 700, STATUS_COLOR[status], SANS, "end", 0.6)
  );
}

function rail(y: number, height: number, color: string): string {
  return `<rect x="10" y="${y}" width="4" height="${height}" rx="2" fill="${color}"/>`;
}

function text(
  x: number,
  y: number,
  value: string,
  size: number,
  weight: number,
  fill: string,
  family: string,
  anchor: "start" | "end",
  tracking = 0,
): string {
  return (
    `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}"` +
    ` font-family="${family}" text-anchor="${anchor}" letter-spacing="${tracking}">${esc(value)}</text>`
  );
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}