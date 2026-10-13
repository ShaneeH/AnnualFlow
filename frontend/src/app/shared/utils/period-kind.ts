/** Charts show one kind of period at a time so full years and quarters are never mixed. */
export type PeriodKind = 'annual' | 'quarterly' | 'other';

export const PERIOD_KIND_LABELS: Record<PeriodKind, string> = {
  annual: 'Annual',
  quarterly: 'Quarterly',
  other: 'Other periods'
};

const ORDER: PeriodKind[] = ['annual', 'quarterly', 'other'];

/** FY2025 / M12_2025 -> annual, Q1_2025 / M3_2025 -> quarterly, H1, YTD, M6, M9 -> other. */
export function periodKind(period: string): PeriodKind {
  if (/^(FY\d{4}|M12_\d{4})$/.test(period)) return 'annual';
  if (/^(Q[1-4]|M3)_\d{4}$/.test(period)) return 'quarterly';
  return 'other';
}

/** Kinds present in the rows, in display order. */
export function availablePeriodKinds(rows: readonly { period: string }[]): PeriodKind[] {
  const present = new Set(rows.map(row => periodKind(row.period)));
  return ORDER.filter(kind => present.has(kind));
}

/** Keeps the preferred kind if available, else Annual, else the first available. */
export function choosePeriodKind(available: readonly PeriodKind[], preferred: PeriodKind | null): PeriodKind | null {
  if (preferred && available.includes(preferred)) return preferred;
  return available[0] ?? null;
}

export function isPeriodKind(value: unknown): value is PeriodKind {
  return value === 'annual' || value === 'quarterly' || value === 'other';
}
