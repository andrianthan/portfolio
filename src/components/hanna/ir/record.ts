import type { Payload } from './form';

export interface RecordState { id: string; payload: Payload; status: 'Draft' | 'Approved' }

export const createRecord = (payload: Payload, n: number): RecordState => ({
  id: `INC-${String(n).padStart(4, '0')}`, payload, status: 'Draft',
});

// Reports are created as Draft; only a supervisor action moves one to Approved.
export const approve = (r: RecordState): RecordState => (r.status === 'Draft' ? { ...r, status: 'Approved' } : r);
