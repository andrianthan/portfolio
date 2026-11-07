// A fictional recreation of an internship work log. Every person, identifier
// and system name in it is invented; every figure comes from the public resume.
// The allowlist test (content.test.ts) enforces both halves of that promise.

export interface WorklogEntry { label: string; detail: string }
export interface WorklogSection { id: string; title: string; entries: WorklogEntry[] }
export interface WorklogDoc {
  title: string
  subtitle: string
  note: string
  headline: { label: string; value: string; detail: string }
  sections: WorklogSection[]
}

export const PUBLIC_NUMBERS: readonly string[] = [
  '32%', '0.854', '0.80', '35', '0%', '17', '165', '77', '20+', '200+', '10+', '30+',
  '$17.0M', '$11.6M', '10',
];

export const WORKLOG: WorklogDoc = {
  title: 'Field notes',
  subtitle: 'A work log from the service demand planning team',
  note: 'This window is a mock. It recreates the shape of the work log kept during the internship, with invented names and identifiers, because the organisation of the work is worth showing. Every figure in it is real and public; everything else is stand-in.',
  headline: { label: 'Backtest error, better than baseline', value: '32%', detail: 'Forecasts from the shipped model beat the previous baseline by a third on backtest, at lag-zero error of $11.6M, down from $17.0M.' },
  sections: [
    {
      id: 'ask-sdp',
      title: 'Ask SDP',
      entries: [
        { label: 'The grounding rule', detail: 'An answer may only contain a number that a tool returned. An output rail reads every draft answer, extracts each figure, and checks it against the tool results before the answer ships. A number with no source is stripped, and the answer ships without it.' },
        { label: 'Routing floor', detail: 'Free-route answers scored 0% on the routing evals: if the question needs data, the model must call a tool. A code-gated floor forces the call, so tool-routing coverage is 35/35 with 0% free-route answers, and metric intents grade 17/17.' },
        { label: 'Typed verdict', detail: 'The model may not flip a conclusion silently. Each answer ends in a typed verdict that states what the data supports, so a disagreement between runs is visible instead of buried in prose. The grounding grade scored 0.854 against a 0.80 bar.' },
        { label: 'The tool it calls', detail: 'A sandboxed Python tool answers numeric questions. It accepts an allow-listed subset of the language, reads no network, and returns its result into the conversation as a checked fact the rail can verify.' },
      ],
    },
    {
      id: 'forecast-lab',
      title: 'Forecast Lab',
      entries: [
        { label: 'The comparison', detail: 'Three forecasters went head to head on the same backtest: a gradient-boosted tree baseline, the Chronos foundation model, and TimesFM. The foundation model won: same-week error fell from $17.0M to $11.6M, which is 32% better than the baseline.' },
        { label: 'What shipped', detail: 'Forecast Lab puts the winning model in front of planners: generated forecasts on a watchlist of the series they care about, with shaping controls so a forecast can be adjusted where the business knows something the data does not.' },
        { label: 'Write-back', detail: 'A shaped forecast is not silently trusted. Write-back to the planning service is guarded: the change is shown as a diff, and it lands only through the checked path the service already exposes.' },
      ],
    },
    {
      id: 'planning-app',
      title: 'Planning app',
      entries: [
        { label: 'Shared layers', detail: 'The app grew a shared component library and route modules behind a thin entry point, with a data-client facade over the domain modules so screens stop talking to storage directly. Lint guards enforce the layers: a screen that reaches past the facade fails review, not production.' },
        { label: 'Visual regression', detail: 'A screenshot harness walks 165 routes on every change and diffs them against the last accepted state, so a layout break is caught in the change that caused it rather than by a planner on Monday morning.' },
      ],
    },
    {
      id: 'evals-ci',
      title: 'Evals and CI',
      entries: [
        { label: 'Golden set', detail: 'A golden set of graded questions gates routing, metric and grounding changes in CI. Its negative control is a fabricated number: a change that lets an invented figure through must fail the run — that is the point of the control.' },
        { label: 'The bar', detail: 'The grounding grade holds at 0.854 against a 0.80 threshold; tool routing grades at 35/35 and metric intents at 17/17. A change that drops a grade is a revert, not a debate.' },
        { label: 'Shipping pipeline', detail: 'The team was pushing untested code to main, so the fix was plumbing: per-branch staging deploys, auto-opened draft PRs, prod deploys on merge. It now supports 200+ staging deploys a week across 10+ data analysts and demand planners.' },
      ],
    },
    {
      id: 'data-pipelines',
      title: 'Data pipelines',
      entries: [
        { label: 'Executive reporting', detail: 'Weekly demand data flows into the 77-slide executive deck on its own, a run that used to be assembled by hand. The reporting burden it removes is worth 20+ hours per run.' },
        { label: 'Freshness', detail: 'A freshness job rebuilds the analytics tables on a schedule, verifies each build before it is used, swaps it in atomically, and polls every 10 minutes so a stale table is a non-event.' },
      ],
    },
    {
      id: 'handbook',
      title: 'Handbook',
      entries: [
        { label: 'What got written down', detail: 'The log ends in a handbook for the next person: how to add a tab to the planning app, how a forecast gets shaped and written back, how a change gets graded by the golden set before it can merge.' },
        { label: 'Mentoring', detail: '30+ people in the service supply chain org were walked through working with AI coding tools: how to prompt with real context, how to review and verify generated changes, and what never to paste into a model.' },
      ],
    },
  ],
};
