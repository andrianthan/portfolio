export type ChunkKind = 'role' | 'project' | 'about' | 'skill' | 'contact';

export interface Chunk {
  id: string;
  kind: ChunkKind;
  title: string;
  text: string;
  url: string;
  facts: string[];
}

export interface Snapshot {
  version: 1;
  chunks: Chunk[];
}

export type Intent =
  | 'help'
  | 'experience'
  | 'projects'
  | 'resume'
  | 'about'
  | 'skills'
  | 'contact'
  | 'search'
  | 'clear'
  | 'sound'
  | 'easter'
  | 'refuse';

export interface Route {
  intent: Intent;
  args: string[];
  query: string;
}

export type Actor =
  | 'orchestrator'
  | 'experience'
  | 'projects'
  | 'resume'
  | 'skills'
  | 'contact'
  | 'search'
  | 'verifier';

export interface TraceStep {
  actor: Actor;
  text: string;
  status: 'ok' | 'fail' | 'info';
}

export interface Source {
  title: string;
  url: string;
}

export interface AgentResult {
  route: Route;
  steps: TraceStep[];
  answer: { text: string; sources: Source[] } | null;
  refused: boolean;
  effects?: { clear?: boolean; sound?: 'on' | 'off' | 'toggle' };
}
