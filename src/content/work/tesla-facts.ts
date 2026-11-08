// Every number the Tesla page prose may state. Source: Andrian's confirmed
// notes (2026-11-07) plus the public resume. The page test fails on any other
// number, so adding a figure to the page means adding it here on purpose.
// Basis labels: (local) laptop, (stage) stage build, (PR) quoted, (estimate).
export const SECTION_TITLES = [
  'Dashboard', 'Part Summary', 'Ask SDP', 'Forecast Lab',
  'Campaigns', 'Slideshow generation', 'Modular architecture', 'Admin',
] as const;

export const SECTION_IDS = [
  'dashboard', 'part-summary', 'ask-sdp', 'forecast-lab',
  'campaigns', 'slideshow-generation', 'modular-architecture', 'admin',
] as const;

export const ALLOWED_NUMBERS: readonly string[] = [
  // resume
  '32%', '0.854', '0.80', '35', '0%', '17', '165', '77', '20+', '200+', '10+', '30+', '$17.0M', '$11.6M', '10', '2', '1',
  // dashboard: cold-load and delivery (local/stage)
  '71', '100', '6', '112', '4.4', '110', '189', '250', '12', '6.9', '2.4', '0.05', '50', '22', '8.5', '9', '0.2',
  '5.8', '1.1', '335', '2.3', '0.37', '25', '4.6', '1.9', '39', '11', '196', '16',
  // dashboard: memory
  '1.75', '3.6', '4.0', '3500', '15',
  // ask sdp
  '109', '8.3%', '4', '1375', '1639',
  // forecast lab
  '87', '4.9', '300', '6.8', '20', '24.9', '54M', '9.7',
  // campaigns
  '223', '131', '54', '$13.3M', '44', '$4.9M', '$11k', '1.5M', '$8.4M', '$1.2M', '$2.5M', '25%', '50%', '26',
  '141', '$56M', '$6.5M', '$9.3M', '36', '23', '94', '13', '3', '$3.7M', '75%', '60%',
  // time saved (placeholder rate)
  '8', '1.58', '200', '660', '$20k', '$66k', '80', '$8k', '45', '39', '$0.6k', '$3.9k', '117', '29', '$2.9k', '30', '12', '$3.6k',
  '350', '$30k', '$35k', '$100',
  // modular architecture
  '445', '44', '11', '28', '242,563', '217,514', '10.3%', '405', '46', '3,141', '597', '5,048', '93', '2,008', '852', '24.1k',
  // data freshness
  '66M',
];

export const BANNED_TERMS: readonly string[] = [
  'Krutarth', 'Krutharth', 'Ananthan', 'Anthan', 'Ragini', 'Sahel', 'Saheel', 'Ramji', 'Pritish', 'Adiga', 'Miguel',
  'Grace Chen', 'sranji', 'krumehta', 'Cybercab', 'North Star', 'RhinoInsight', 'Hyperresearch', 'ZipLabs',
  'Demand Engine', 'WARP', 'DEPROD', 'SDPDB', 'SDP_DEFAULT_DENY', 'sdp-dashboard-unification', 'sdp_kpi', 'local-dev',
  '3006', 'Teams chat',
];
