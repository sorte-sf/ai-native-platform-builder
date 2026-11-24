import { describe, it, expect } from 'vitest';
import { groupedValues, timeSeriesValues } from './business-data';
describe('business chart aggregation', () => {
  it('counts records and preserves stage order', () => {
    expect(groupedValues([{ stage: 'New' }, { stage: 'Won' }, { stage: 'New' }], { id: 'c', type: 'chart', columns: ['stage'] })).toEqual([{ name: 'New', value: 2 }, { name: 'Won', value: 1 }]);
  });
  it('sums only finite numeric values', () => {
    expect(groupedValues([{ stage: 'New', amount: 20 }, { stage: 'New', amount: 30 }, { stage: 'Won', amount: 'invalid' }], { id: 'c', type: 'chart', columns: ['stage'], valueField: 'amount' })).toEqual([{ name: 'New', value: 50 }]);
  });
  it('sorts valid time-axis values and rejects invalid dates', () => {
    expect(timeSeriesValues([{ date: '2024-01-02T00:00:00Z', amount: 2 }, { date: 'invalid', amount: 4 },
      { date: '2024-01-01T12:00:00Z', amount: 1 }, { date: '2024-01-01T18:00:00Z', amount: 3 }],
    { id: 'timeline', type: 'chart', chartKind: 'time-area', columns: ['date'], valueField: 'amount' }))
      .toEqual([[Date.UTC(2024, 0, 1), 4], [Date.UTC(2024, 0, 2), 2]]);
  });
});
