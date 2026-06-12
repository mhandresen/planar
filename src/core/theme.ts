import type { Status } from "./parse.js";
import type { Category } from "./category.js";

export type ThemeName = "light" | "dark";

export interface Theme {
  canvas: string;
  cardFill: string;
  cardStroke: string;
  moduleFill: string;
  moduleStroke: string;
  divider: string;
  ink: string;
  muted: string;
  shield: string;
  shadow: string;
  tintOpacity: string;
  status: Record<Status, string>;
  category: Record<Category, string>;
}

const light: Theme = {
  canvas: "#f6f7f9",
  cardFill: "#ffffff",
  cardStroke: "#e2e8f0",
  moduleFill: "#eef1f5",
  moduleStroke: "#dbe1ea",
  divider: "#e2e8f0",
  ink: "#0f172a",
  muted: "#64748b",
  shield: "#475569",
  shadow: "#0f172a",
  tintOpacity: "0.07",
  status: { create: "#16a34a", update: "#d97706", replace: "#d97706", delete: "#dc2626", noop: "#94a3b8" },
  category: {
    network: "#0891b2",
    compute: "#7c3aed",
    storage: "#0d9488",
    database: "#4f46e5",
    security: "#475569",
    integration: "#db2777",
    other: "#94a3b8",
  },
};

const dark: Theme = {
  canvas: "#0f1623",
  cardFill: "#1b2435",
  cardStroke: "#2b3852",
  moduleFill: "#151d2c",
  moduleStroke: "#2b3852",
  divider: "#2b3852",
  ink: "#e6edf6",
  muted: "#94a3b8",
  shield: "#94a3b8",
  shadow: "#000000",
  tintOpacity: "0.16",
  status: { create: "#34d399", update: "#fbbf24", replace: "#fbbf24", delete: "#f87171", noop: "#64748b" },
  category: {
    network: "#22d3ee",
    compute: "#a78bfa",
    storage: "#2dd4bf",
    database: "#818cf8",
    security: "#94a3b8",
    integration: "#f472b6",
    other: "#64748b",
  },
};

export const themes: Record<ThemeName, Theme> = { light, dark };
