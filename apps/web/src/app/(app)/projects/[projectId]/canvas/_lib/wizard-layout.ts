import type { EntityType } from "@lore/db";

// Deterministic, non-overlapping grid. Each entity type owns one horizontal row
// band (fixed order); within a band, shapes fill left-to-right by arrival index.
// If a type exceeds COLS_PER_ROW it wraps to a fresh global row strictly below
// every band, so wrapping can never overlap another type's band.
export const WIZARD_ROW_ORDER: EntityType[] = [
  "character",
  "location",
  "faction",
  "scene",
  "timeline_event",
];

const ORIGIN_X = 120;
const ORIGIN_Y = 120;
const COL_WIDTH = 240;
const ROW_HEIGHT = 220;
const COLS_PER_ROW = 6;

export function wizardSlot(
  entityType: EntityType,
  index: number,
): { x: number; y: number } {
  const band = WIZARD_ROW_ORDER.indexOf(entityType);
  const safeBand = band < 0 ? 0 : band;
  const col = index % COLS_PER_ROW;
  const wrap = Math.floor(index / COLS_PER_ROW);
  const globalRow = safeBand + wrap * WIZARD_ROW_ORDER.length;
  return {
    x: ORIGIN_X + col * COL_WIDTH,
    y: ORIGIN_Y + globalRow * ROW_HEIGHT,
  };
}
