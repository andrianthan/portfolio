// Every number the Tesla page prose states, and nothing else. Source: Andrian's
// confirmed notes (2026-11-07) plus the public resume. The page test compares
// this list with the page, so a figure reaching the page means adding it here
// on purpose, and an entry left behind here means the page has to lose it.
export const SECTION_TITLES = [
  'Dashboard', 'Part Summary', 'Ask SDP', 'Forecast Lab',
  'Campaigns', 'Slideshow generation', 'Admin',
] as const;

export const SECTION_IDS = [
  'dashboard', 'part-summary', 'ask-sdp', 'forecast-lab',
  'campaigns', 'slideshow-generation', 'admin',
] as const;

export const ALLOWED_NUMBERS: readonly string[] = [
  // The numbers the page states, and nothing else. The page test compares
  // this list with the page, so an entry left behind here cannot let a figure
  // back onto the page without being added on purpose.
  '10', '12', '2', '25%', '26', '3', '32%', '5', '50', '50%', '90',
];

export const BANNED_TERMS: readonly string[] = [
  'Krutarth', 'Krutharth', 'Ananthan', 'Anthan', 'Ragini', 'Sahel', 'Saheel', 'Ramji', 'Pritish', 'Adiga', 'Miguel',
  'Grace Chen', 'sranji', 'krumehta', 'Cybercab', 'North Star', 'RhinoInsight', 'Hyperresearch', 'ZipLabs',
  'Demand Engine', 'WARP', 'DEPROD', 'SDPDB', 'SDP_DEFAULT_DENY', 'sdp-dashboard-unification', 'sdp_kpi', 'local-dev',
  '3006', 'Teams chat',
];
