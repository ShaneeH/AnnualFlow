import { periodKind, PeriodKind } from './period-kind';

const KIND_ORDER: Record<PeriodKind, number> = { annual: 0, quarterly: 1, other: 2 };

/**
 * Display order for period tags: full years first, then quarters, then halves
 * and other periods; newest first within each kind.
 */
export function sortPeriodsForDisplay<T extends { period: string; periodEnd: string | null }>(
  periods: readonly T[]
): T[] {
  return [...periods].sort((a, b) => {
    const kind = KIND_ORDER[periodKind(a.period)] - KIND_ORDER[periodKind(b.period)];
    if (kind !== 0) return kind;
    const endA = a.periodEnd ?? '';
    const endB = b.periodEnd ?? '';
    if (endA !== endB) return endA < endB ? 1 : -1;
    return a.period.localeCompare(b.period);
  });
}

/** Chronological order (oldest first), periods without an end date last. */
export function sortPeriodsChronologically<T extends { period: string; periodEnd: string | null }>(
  periods: readonly T[]
): T[] {
  return [...periods].sort((a, b) => {
    if (a.periodEnd && b.periodEnd && a.periodEnd !== b.periodEnd) return a.periodEnd < b.periodEnd ? -1 : 1;
    if (!a.periodEnd !== !b.periodEnd) return a.periodEnd ? -1 : 1;
    return a.period.localeCompare(b.period);
  });
}
