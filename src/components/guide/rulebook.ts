// Fictional sample guide. Not any real company's labeling guidelines.
export interface Clause { id: string; title: string; text: string }

export const GUIDE_VERSION = 'v1.2';

export const CLAUSES: Clause[] = [
  { id: '1', title: 'Scope', text: 'Label only infrastructure items from the class list: sign, lane marking, crosswalk, cone, pothole, streetlight and rail. Other objects in the image are not labeled.' },
  { id: '2', title: 'Box tightness', text: 'Draw the box tightly around the visible item with a margin of a few pixels at most. Do not include shadows, reflections or the pole in the box unless the pole is part of the class.' },
  { id: '3', title: 'Partial occlusion', text: 'An item that is partially hidden, blocked or occluded by a car, tree or pedestrian still gets labeled when at most half is hidden. The box covers only the visible part.' },
  { id: '4', title: 'Heavy occlusion', text: 'If more than half of an item is hidden or blocked, mark the label uncertain and send it to a second reviewer instead of guessing the class.' },
  { id: '5', title: 'Damaged or faded items', text: 'A faded, worn or scratched lane marking is still a lane marking if a reviewer could trace its path. If the path cannot be traced, mark it uncertain.' },
  { id: '6', title: 'Signs by shape and face', text: 'Classify a sign by what it shows. A bent, tilted or dirty stop sign is still a stop sign when the shape and face are readable. Do not classify by color alone.' },
  { id: '7', title: 'Temporary items', text: 'Cones and construction signs are labeled like permanent items. Set the temporary attribute, for example for a cone on its side or a work-zone barrier.' },
  { id: '8', title: 'Glare and night', text: 'When glare, darkness or headlights wash out the face but the shape is clear, label the class and set the low visibility attribute. Never guess a specific sign type from a washed out face.' },
  { id: '9', title: 'Frame edges', text: 'An item cut off by the edge of the frame is labeled when at least a third of it is visible. Smaller slivers at the edge are not labeled.' },
  { id: '10', title: 'Duplicates', text: 'Two separate items of the same class near each other get two boxes. Never merge neighbors, such as two cones or two signs on one pole, into one box.' },
  { id: '11', title: 'Unknown objects', text: 'Anything not on the class list is not labeled. Flag it as an unlisted object so the guideline owners can review whether the class list needs a new entry.' },
  { id: '12', title: 'Disagreement with the AI label', text: 'If the AI label and your judgment differ on class, reject the label and relabel it. If the reason is not covered by another clause, flag the image for a guideline update.' },
];
