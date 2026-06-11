import { isContainer, type Container } from "./group.js";
import type { Badge } from "./demote.js";
import { categoryOf } from "./category.js";
import { icon } from "./icons.js";
import { themes, type Theme, type ThemeName } from "./theme.js";
import type { LayoutResult, PositionedNode } from "./layout.js";

const SANS = "ui-sans-serif, -apple-system, 'Segoe UI', Roboto, sans-serif";
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace";
const LEGEND_HEIGHT = 46;

export function renderSvg(
  result: LayoutResult,
  badges: Map<string, Badge[]> = new Map(),
  theme: ThemeName = "light",
): string {
  const t = themes[theme];
  if (result.nodes.length === 0) return emptySvg(t);
  const height = result.height + LEGEND_HEIGHT;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${result.width}" height="${height}"`,
    ` viewBox="0 0 ${result.width} ${height}" font-family="${SANS}">`,
    `<defs><filter id="card" x="-20%" y="-20%" width="140%" height="140%">`,
    `<feDropShadow dx="0" dy="1" stdDeviation="2.5" flood-color="${t.shadow}" flood-opacity="0.10"/>`,
    `</filter></defs>`,
    `<rect width="${result.width}" height="${height}" fill="${t.canvas}"/>`,
    result.nodes.map((n) => renderNode(n, badges, t)).join(""),
    legend(result.width, result.height, badges.size > 0, t),
    `</svg>`,
  ].join("");
}

function emptySvg(t: Theme): string {
  const w = 380;
  const h = 132;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="${SANS}">`,
    `<rect width="${w}" height="${h}" fill="${t.canvas}"/>`,
    `<rect x="24" y="32" width="${w - 48}" height="${h - 64}" rx="12" fill="${t.cardFill}" stroke="${t.cardStroke}"/>`,
    `<text x="${w / 2}" y="${h / 2 + 4}" text-anchor="middle" font-size="13" font-weight="600" fill="${t.muted}">No resources to display</text>`,
    `</svg>`,
  ].join("");
}

function legend(width: number, top: number, secured: boolean, t: Theme): string {
  const baseline = top + 28;
  const swatch = (x: number, color: string, label: string) =>
    `<rect x="${x}" y="${baseline - 12}" width="4" height="11" rx="2" fill="${color}"/>` +
    text(x + 12, baseline - 3, label, 11, 600, t.muted, SANS, "start");

  const parts = [
    `<line x1="24" y1="${top + 8}" x2="${width - 24}" y2="${top + 8}" stroke="${t.divider}"/>`,
    swatch(24, t.status.create, "Create"),
    swatch(112, t.status.update, "Update / Replace"),
    swatch(252, t.status.delete, "Delete"),
  ];
  if (secured) {
    parts.push(shield(344, baseline - 16, t.shield));
    parts.push(text(364, baseline - 3, "Firewalled", 11, 600, t.muted, SANS, "start"));
  }
  return parts.join("");
}

function renderNode(n: PositionedNode, badges: Map<string, Badge[]>, t: Theme): string {
  const inner = isContainer(n.node) ? n.children.map((c) => renderNode(c, badges, t)).join("") : "";
  return `<g transform="translate(${n.x},${n.y})">${chrome(n, badges, t)}${inner}</g>`;
}

function chrome(n: PositionedNode, badges: Map<string, Badge[]>, t: Theme): string {
  if (!isContainer(n.node)) return leaf(n, badges, t);
  return n.node.containerType === "module" ? modulePanel(n, n.node, t) : containerCard(n, n.node, badges, t);
}

function modulePanel(n: PositionedNode, node: Container, t: Theme): string {
  return (
    `<rect width="${n.width}" height="${n.height}" rx="14" fill="${t.moduleFill}" stroke="${t.moduleStroke}"/>` +
    text(20, 27, fit(node.label.toUpperCase(), n.width - 40, 11, true), 11, 700, t.muted, SANS, "start", 1.2)
  );
}

function containerCard(n: PositionedNode, node: Container, badges: Map<string, Badge[]>, t: Theme): string {
  const r = node.resource!;
  const accent = t.category[categoryOf(r.type)];
  const secured = isSecured(r.id, badges);
  const typeAnchor = secured ? n.width - 34 : n.width - 16;
  const nameMax = typeAnchor - estWidth(r.type, 11, true) - 8 - 42;
  return (
    `<rect width="${n.width}" height="${n.height}" rx="12" fill="${t.cardFill}" stroke="${t.cardStroke}" filter="url(#card)"/>` +
    `<path d="M0 12 Q0 0 12 0 H${n.width - 12} Q${n.width} 0 ${n.width} 12 V42 H0 Z" fill="${accent}" fill-opacity="${t.tintOpacity}"/>` +
    rail(11, 20, t.status[r.status]) +
    icon(r.type, accent, 16, 21, 22) +
    text(42, 25, fit(r.name, nameMax, 13, false), 13, 650, t.ink, SANS, "start") +
    text(typeAnchor, 25, r.type, 11, 500, t.muted, MONO, "end") +
    (secured ? shield(n.width - 27, 11, t.shield) : "")
  );
}

function leaf(n: PositionedNode, badges: Map<string, Badge[]>, t: Theme): string {
  if (isContainer(n.node)) return "";
  const { type, name, status, id } = n.node;
  const accent = t.category[categoryOf(type)];
  const secured = isSecured(id, badges);
  const statusLabel = status.toUpperCase();
  const statusAnchor = secured ? n.width - 34 : n.width - 16;
  const nameMax = statusAnchor - estWidth(statusLabel, 10, false) - 8 - 46;
  return (
    `<rect width="${n.width}" height="${n.height}" rx="12" fill="${t.cardFill}" stroke="${t.cardStroke}" filter="url(#card)"/>` +
    rail(14, n.height - 28, t.status[status]) +
    icon(type, accent, 14, n.height / 2, 24) +
    text(46, 29, fit(name, nameMax, 14, false), 14, 650, t.ink, SANS, "start") +
    text(46, 48, fit(type, n.width - 16 - 46, 11, true), 11, 500, t.muted, MONO, "start") +
    text(statusAnchor, 29, statusLabel, 10, 700, t.status[status], SANS, "end", 0.6) +
    (secured ? shield(n.width - 27, 17, t.shield) : "")
  );
}

function isSecured(id: string, badges: Map<string, Badge[]>): boolean {
  return (badges.get(id) ?? []).includes("security");
}

function shield(x: number, y: number, color: string): string {
  return (
    `<g transform="translate(${x},${y})">` +
    `<path d="M7 0 L13 2.5 V7 Q13 11.5 7 14 Q1 11.5 1 7 V2.5 Z" fill="${color}" fill-opacity="0.14" stroke="${color}" stroke-width="1"/>` +
    `</g>`
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

function estWidth(s: string, size: number, mono: boolean): number {
  return s.length * size * (mono ? 0.62 : 0.6);
}

function fit(s: string, maxWidth: number, size: number, mono: boolean): string {
  if (estWidth(s, size, mono) <= maxWidth) return s;
  const budget = Math.max(1, Math.floor(maxWidth / (size * (mono ? 0.62 : 0.6))) - 1);
  return s.slice(0, budget) + "\u2026";
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}