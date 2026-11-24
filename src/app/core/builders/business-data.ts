import type { PageNode } from './page-blocks';

export function groupedValues(rows: Record<string, unknown>[], node: PageNode) {
  const field = node.columns?.[0];
  const groups = new Map<string, number>();
  if (!field) return [];
  for (const row of rows) {
    const value = row[field];
    if (value == null || !['string', 'number', 'boolean'].includes(typeof value)) continue;
    const amount = node.valueField ? row[node.valueField] : 1;
    if (typeof amount !== 'number' || !Number.isFinite(amount)) continue;
    const label = String(value); groups.set(label, (groups.get(label) ?? 0) + amount);
  }
  // Preserve source order for timelines and sales stages, rather than sorting by size.
  return [...groups].slice(0, 50).map(([name, value]) => ({ name, value }));
}

export function timeSeriesValues(rows: Record<string, unknown>[], node: PageNode): [number, number][] {
  const field = node.columns?.[0]; if (!field) return [];
  const dailyTotals = new Map<number, number>();
  for (const row of rows) {
    const rawTime = row[field];
    const time = typeof rawTime === 'string' || typeof rawTime === 'number' ? new Date(rawTime).getTime() : NaN;
    const rawValue = node.valueField ? row[node.valueField] : 1;
    if (!Number.isFinite(time) || typeof rawValue !== 'number' || !Number.isFinite(rawValue)) continue;
    const date = new Date(time);
    const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    dailyTotals.set(day, (dailyTotals.get(day) ?? 0) + rawValue);
  }
  return [...dailyTotals].sort((a, b) => a[0] - b[0]).slice(0, 366);
}
