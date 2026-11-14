/**
 * Invented sample rows for the Micron demos. Nothing here is real: wafers are
 * W-04xx, lots are LOT-xx, tools are Tool A to Tool F.
 */
export interface Wafer {
  id: string;
  lot: string;
  path: string[];
  z: number;
  failRate: number;
  size: number;
  score: number;
  factors: { label: string; weight: number }[];
}

export const WAFERS: Wafer[] = [
  { id: 'W-0401', lot: 'LOT-11', path: ['Tool A', 'Tool B', 'Tool E'], z: -0.8, failRate: 0.04, size: 8, score: 0.18,
    factors: [{ label: 'Chamber dwell time', weight: 0.09 }, { label: 'Lot history', weight: 0.06 }, { label: 'Metrology offset', weight: 0.03 }] },
  { id: 'W-0402', lot: 'LOT-11', path: ['Tool B', 'Tool D', 'Tool F'], z: 0.2, failRate: 0.07, size: 9, score: 0.35,
    factors: [{ label: 'Lot history', weight: 0.15 }, { label: 'Chamber dwell time', weight: 0.12 }, { label: 'Metrology offset', weight: 0.08 }] },
  { id: 'W-0403', lot: 'LOT-12', path: ['Tool A', 'Tool D', 'Tool E'], z: 0.6, failRate: 0.1, size: 10, score: 0.52,
    factors: [{ label: 'Etch tool drift', weight: 0.22 }, { label: 'Chamber dwell time', weight: 0.18 }, { label: 'Metrology offset', weight: 0.12 }] },
  { id: 'W-0404', lot: 'LOT-12', path: ['Tool B', 'Tool E', 'Tool F'], z: -0.3, failRate: 0.05, size: 7, score: 0.27,
    factors: [{ label: 'Metrology offset', weight: 0.12 }, { label: 'Lot history', weight: 0.09 }, { label: 'Etch tool drift', weight: 0.06 }] },
  { id: 'W-0405', lot: 'LOT-13', path: ['Tool C', 'Tool D', 'Tool F'], z: 2.1, failRate: 0.19, size: 12, score: 0.81,
    factors: [{ label: 'Etch tool drift', weight: 0.38 }, { label: 'Chamber dwell time', weight: 0.25 }, { label: 'Lot history', weight: 0.12 }, { label: 'Metrology offset', weight: 0.06 }] },
  { id: 'W-0406', lot: 'LOT-13', path: ['Tool A', 'Tool C', 'Tool E'], z: 0.4, failRate: 0.09, size: 9, score: 0.43,
    factors: [{ label: 'Chamber dwell time', weight: 0.19 }, { label: 'Etch tool drift', weight: 0.14 }, { label: 'Lot history', weight: 0.1 }] },
  { id: 'W-0407', lot: 'LOT-14', path: ['Tool A', 'Tool B', 'Tool F'], z: -1.1, failRate: 0.03, size: 6, score: 0.15,
    factors: [{ label: 'Metrology offset', weight: 0.07 }, { label: 'Lot history', weight: 0.05 }, { label: 'Chamber dwell time', weight: 0.03 }] },
  { id: 'W-0408', lot: 'LOT-14', path: ['Tool C', 'Tool E', 'Tool F'], z: 1.2, failRate: 0.14, size: 11, score: 0.66,
    factors: [{ label: 'Etch tool drift', weight: 0.3 }, { label: 'Lot history', weight: 0.2 }, { label: 'Metrology offset', weight: 0.16 }] },
  { id: 'W-0409', lot: 'LOT-15', path: ['Tool B', 'Tool C', 'Tool D'], z: 0.9, failRate: 0.12, size: 10, score: 0.58,
    factors: [{ label: 'Chamber dwell time', weight: 0.26 }, { label: 'Etch tool drift', weight: 0.2 }, { label: 'Lot history', weight: 0.12 }] },
  { id: 'W-0410', lot: 'LOT-15', path: ['Tool A', 'Tool E', 'Tool F'], z: -0.6, failRate: 0.04, size: 8, score: 0.22,
    factors: [{ label: 'Lot history', weight: 0.1 }, { label: 'Metrology offset', weight: 0.07 }, { label: 'Chamber dwell time', weight: 0.05 }] },
  { id: 'W-0411', lot: 'LOT-16', path: ['Tool C', 'Tool D', 'Tool E'], z: 1.7, failRate: 0.16, size: 11, score: 0.74,
    factors: [{ label: 'Etch tool drift', weight: 0.34 }, { label: 'Chamber dwell time', weight: 0.22 }, { label: 'Metrology offset', weight: 0.18 }] },
  { id: 'W-0412', lot: 'LOT-16', path: ['Tool C', 'Tool B', 'Tool F'], z: 2.6, failRate: 0.22, size: 12, score: 0.95,
    factors: [{ label: 'Etch tool drift', weight: 0.41 }, { label: 'Chamber dwell time', weight: 0.28 }, { label: 'Lot history', weight: 0.16 }, { label: 'Metrology offset', weight: 0.1 }] },
];

export interface StepRow { wafer: string; step: string; tool: string; reading: number; limit: number }

/** Step history. A row with reading > limit is an excursion. */
export const STEP_ROWS: StepRow[] = [
  { wafer: 'W-0412', step: 'Clean', tool: 'Tool C', reading: 3.1, limit: 4.0 },
  { wafer: 'W-0412', step: 'Etch', tool: 'Tool B', reading: 12.6, limit: 10.0 },
  { wafer: 'W-0412', step: 'Deposition', tool: 'Tool F', reading: 7.2, limit: 8.0 },
  { wafer: 'W-0405', step: 'Clean', tool: 'Tool C', reading: 4.6, limit: 4.0 },
  { wafer: 'W-0405', step: 'Etch', tool: 'Tool D', reading: 9.4, limit: 10.0 },
  { wafer: 'W-0405', step: 'Deposition', tool: 'Tool F', reading: 8.9, limit: 8.0 },
];

/** Failure rate by tool, as a fraction. */
export const TOOL_FAIL_RATES: { tool: string; failRate: number; wafers: number }[] = ['Tool A', 'Tool B', 'Tool C', 'Tool D', 'Tool E', 'Tool F'].map((tool) => ({
  tool,
  failRate: { 'Tool A': 0.05, 'Tool B': 0.08, 'Tool C': 0.21, 'Tool D': 0.11, 'Tool E': 0.07, 'Tool F': 0.09 }[tool] as number,
  wafers: WAFERS.filter((w) => w.path.includes(tool)).length,
}));
