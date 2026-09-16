/** localStorage mock for expert → client reschedule requests */

export type RescheduleRequestStatus = 'pending' | 'accepted' | 'rejected';

export type RescheduleRequest = {
  id: string;
  appointmentId: string;
  proposedStart: string;
  proposedEnd: string;
  status: RescheduleRequestStatus;
  createdAt: string;
  expertName?: string;
  offerTitle?: string;
  clientId?: string;
};

const STORAGE_KEY = 'elu-reschedule-requests';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/** Shared mock inbox so expert and client see the same requests. */
export function loadRescheduleRequests(_userId?: string | null): RescheduleRequest[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RescheduleRequest[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRescheduleRequests(
  requests: RescheduleRequest[],
  _userId?: string | null
): RescheduleRequest[] {
  if (canUseStorage()) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    } catch {
      /* ignore */
    }
  }
  return requests;
}

export function addRescheduleRequest(
  request: Omit<RescheduleRequest, 'id' | 'createdAt' | 'status'> & {
    id?: string;
    createdAt?: string;
    status?: RescheduleRequestStatus;
  },
  userId?: string | null
): RescheduleRequest {
  const next: RescheduleRequest = {
    id: request.id || `rsr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    appointmentId: request.appointmentId,
    proposedStart: request.proposedStart,
    proposedEnd: request.proposedEnd,
    status: request.status || 'pending',
    createdAt: request.createdAt || new Date().toISOString(),
    expertName: request.expertName,
    offerTitle: request.offerTitle,
    clientId: request.clientId,
  };
  const all = loadRescheduleRequests(userId);
  saveRescheduleRequests([next, ...all], userId);
  return next;
}

export function updateRescheduleRequest(
  id: string,
  patch: Partial<Pick<RescheduleRequest, 'status' | 'proposedStart' | 'proposedEnd'>>,
  userId?: string | null
): RescheduleRequest | null {
  const all = loadRescheduleRequests(userId);
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) return null;
  const updated = { ...all[idx], ...patch };
  const next = [...all];
  next[idx] = updated;
  saveRescheduleRequests(next, userId);
  return updated;
}

/** Pending requests for a specific appointment. */
export function getPendingRescheduleRequests(
  appointmentId: string,
  userId?: string | null
): RescheduleRequest[] {
  return loadRescheduleRequests(userId).filter(
    (r) => r.appointmentId === appointmentId && r.status === 'pending'
  );
}

/** Pending requests visible in the shared mock inbox. */
export function getAllPendingRescheduleRequests(_userId?: string | null): RescheduleRequest[] {
  return loadRescheduleRequests().filter((r) => r.status === 'pending');
}
