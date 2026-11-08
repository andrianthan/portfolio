import { series } from '../fixtures';

export interface Matrix { rows: string[]; cols: string[]; cells: number[][] }
export interface PartData {
  insights: string[];
  consumption: number[];
  failureRate: number[];
  locationMatrix: Matrix;
  codeMatrix: Matrix;
  breakdown: { symptom: string; code: string; share: number }[];
}

const pct = (a: number, b: number) => Math.round(((a - b) / b) * 100);

export function dataFor(partId: string): PartData {
  const seed = Number(partId.slice(2)) || 1;
  const consumption = series(seed, 12, 400, 120);
  const failureRate = series(seed + 1, 12, 6, 3).map((v) => Math.max(1, v));
  const avg = consumption.reduce((a, b) => a + b, 0) / consumption.length;
  const last = consumption[consumption.length - 1];
  const fAvg = failureRate.reduce((a, b) => a + b, 0) / failureRate.length;
  const fLast = failureRate[failureRate.length - 1];
  const years = ['2021', '2022', '2023', '2024', '2025'];
  const location = series(seed + 2, 20, 50, 40).map((v) => Math.max(1, v));
  const codes = series(seed + 3, 20, 30, 25).map((v) => Math.max(1, v));
  const toCells = (flat: number[]) => [0, 1, 2, 3].map((r) => flat.slice(r * 5, r * 5 + 5));
  const symptoms = ['Intermittent fault', 'Wear beyond limit', 'Noise or vibration', 'Fit or alignment'];
  return {
    insights: [
      `Consumption is running ${Math.abs(pct(last, avg))}% ${last >= avg ? 'above' : 'below'} the 12-week average.`,
      `Failure rate is ${fLast >= fAvg ? 'up' : 'down'} ${Math.abs(pct(fLast, fAvg))}% against its 12-week average.`,
      `Region A shows the highest count for build year ${years[seed % years.length]}.`,
    ],
    consumption,
    failureRate,
    locationMatrix: { rows: ['Region A', 'Region B', 'Region C', 'Region D'], cols: years, cells: toCells(location) },
    codeMatrix: {
      rows: ['CC-01', 'CC-02', 'CC-03', 'CC-04'],
      cols: ['Sub-system 1', 'Sub-system 2', 'Sub-system 3', 'Sub-system 4', 'Sub-system 5'],
      cells: toCells(codes),
    },
    breakdown: [40, 30, 20, 10].map((share, i) => ({ symptom: symptoms[i], code: `CC-0${i + 1}`, share })),
  };
}
