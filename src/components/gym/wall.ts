/**
 * The geometry of the year wall: one row of weeks per year, drawn on a canvas.
 *
 * These numbers are the source of truth for both the drawing and the CSS that reserves
 * the canvas height before the island hydrates. `YearWall.tsx` ships them as custom
 * properties in the server-rendered html and `gym.css` sizes the canvas from them, so
 * the reserved height and the drawn height are the same formula by construction.
 */
export const WALL_COLS = 54;
export const WALL_ROWS = 7;
export const WALL_LABEL = 34;
export const WALL_GAP_Y = 10;

/** The height the wall needs at a given width: one block of seven rows per year. */
export function wallHeight(width: number, years: number): number {
  const cell = (width - WALL_LABEL) / WALL_COLS;
  return years * (WALL_ROWS * cell + WALL_GAP_Y);
}
