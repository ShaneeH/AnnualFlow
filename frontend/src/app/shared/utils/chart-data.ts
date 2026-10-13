/** True when the value is a real number (not null/undefined/NaN). */
export function isPresent(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** True when at least one row has a value for the given key. */
export function hasSeries<T>(
  rows: readonly T[],
  key: keyof T
): boolean {
  return rows.some(row => isPresent(row[key] as number | null | undefined));
}

/** Keeps only the series keys that have at least one value. */
export function seriesWithData<T, K extends keyof T>(
  rows: readonly T[],
  keys: readonly K[]
): K[] {
  return keys.filter(key => hasSeries(rows, key));
}
