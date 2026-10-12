import { vi } from 'vitest';
import { DASHBOARD_STATE_KEY, loadDashboardState, saveDashboardState } from './dashboard-state';

describe('dashboard-state', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips state under a versioned key', () => {
    saveDashboardState({ companyId: 3, period: 'FY2025', comparePeriod: 'FY2024', insightOpen: true });

    expect(localStorage.getItem(DASHBOARD_STATE_KEY)).toContain('FY2025');
    expect(DASHBOARD_STATE_KEY).toBe('reportHub.dashboard.v1');
    expect(loadDashboardState()).toEqual({
      companyId: 3, period: 'FY2025', comparePeriod: 'FY2024', insightOpen: true
    });
  });

  it('falls back to empty state for missing, corrupt or malformed data', () => {
    expect(loadDashboardState().companyId).toBeNull();

    localStorage.setItem(DASHBOARD_STATE_KEY, '{not json');
    expect(loadDashboardState().companyId).toBeNull();

    localStorage.setItem(DASHBOARD_STATE_KEY, JSON.stringify({
      companyId: '1; DROP', period: 42, comparePeriod: 'x'.repeat(100), insightOpen: 'yes'
    }));
    expect(loadDashboardState()).toEqual({
      companyId: null, period: null, comparePeriod: null, insightOpen: false
    });
  });

  it('does not throw when storage is unavailable', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceeded');
    });
    expect(() => saveDashboardState({ companyId: 1, period: null, comparePeriod: null, insightOpen: false }))
      .not.toThrow();
    spy.mockRestore();
  });
});
