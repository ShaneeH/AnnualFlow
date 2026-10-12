/** UI selections persisted between visits to the dashboard. */
export interface DashboardState {
  companyId: number | null;
  period: string | null;
  comparePeriod: string | null;
  insightOpen: boolean;
}

export const DASHBOARD_STATE_KEY = 'reportHub.dashboard.v1';

export const EMPTY_DASHBOARD_STATE: DashboardState = {
  companyId: null,
  period: null,
  comparePeriod: null,
  insightOpen: false
};

/** localStorage when available (browser), otherwise null (SSR, tests, privacy modes). */
function storage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null; // Accessing localStorage can throw when storage is blocked.
  }
}

/** Reads and sanitises the saved state; anything malformed falls back to empty. */
export function loadDashboardState(): DashboardState {
  const store = storage();
  if (!store) return { ...EMPTY_DASHBOARD_STATE };

  try {
    const raw = store.getItem(DASHBOARD_STATE_KEY);
    if (!raw) return { ...EMPTY_DASHBOARD_STATE };

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const companyId = parsed['companyId'];
    const text = (value: unknown) =>
      typeof value === 'string' && value.length > 0 && value.length <= 32 ? value : null;

    return {
      companyId: Number.isSafeInteger(companyId) && (companyId as number) > 0 ? (companyId as number) : null,
      period: text(parsed['period']),
      comparePeriod: text(parsed['comparePeriod']),
      insightOpen: parsed['insightOpen'] === true
    };
  } catch {
    return { ...EMPTY_DASHBOARD_STATE };
  }
}

export function saveDashboardState(state: DashboardState): void {
  try {
    storage()?.setItem(DASHBOARD_STATE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or storage blocked: persistence is best-effort.
  }
}
