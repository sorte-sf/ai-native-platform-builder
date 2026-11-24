import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { ComponentDataResult, ComponentDataSourceService, sourceForNode } from '@core/builders/component-data-source';
import type { PageNode, PagePivotValue } from '@core/builders/page-blocks';

interface PivotColumn { key: string; title: string; }
interface PivotRow { key: string; labels: string[]; values: Record<string, number | null>; total: Record<string, number | null>; }
type Group = { key: string; title: string; labels: string[]; rows: Record<string, unknown>[] };

@Component({
  selector: 'ant-pivot-table',
  templateUrl: './pivot-table.component.html',
  styleUrl: './pivot-table.component.scss',
  imports: [TranslocoPipe],
})
export class PivotTableComponent {
  readonly node = input.required<PageNode>();
  readonly tenantId = input('');
  readonly designMode = input(false);
  readonly rows = signal<Record<string, unknown>[]>([]);
  readonly totalRecords = signal(0);
  readonly sampled = signal(false);
  readonly loading = signal(false);
  readonly failed = signal(false);
  private readonly sources = inject(ComponentDataSourceService);
  private readonly translations = inject(TranslocoService);

  private readonly values = computed(() => this.node().pivotValues ?? []);
  private readonly dimensions = computed(() => [...(this.node().pivotRows ?? []), ...(this.node().pivotColumns ?? [])]);
  private readonly effectiveRows = computed(() => {
    if (!this.designMode() || this.rows().length) return this.rows();
    const rowFields = this.node().pivotRows ?? [], columnFields = this.node().pivotColumns ?? [], valueFields = this.values();
    if (!rowFields.length || !valueFields.length) return [];
    const rowSamples = ['North', 'South', 'West'];
    const columnSamples = ['Q1', 'Q2', 'Q3'];
    return Array.from({ length: 9 }, (_, index) => {
      const sample: Record<string, unknown> = {};
      rowFields.forEach((field, fieldIndex) => sample[field] = fieldIndex === 0 ? rowSamples[Math.floor(index / 3)] : `Group ${index % 3 + 1}`);
      columnFields.forEach((field, fieldIndex) => sample[field] = fieldIndex === 0 ? columnSamples[index % 3] : `Period ${index % 2 + 1}`);
      valueFields.forEach((measure, measureIndex) => sample[measure.field] = (index + 1) * (measureIndex + 2) * 125);
      return sample;
    });
  });

  readonly columnGroups = computed(() => {
    const fields = this.node().pivotColumns ?? [];
    const groups = this.groups(this.effectiveRows(), fields);
    if (fields.length) return groups.map(group => ({ key: group.key, title: group.title }));
    return [{ key: '__all__', title: this.values().length > 1 ? this.label('businessBlocks.values') : '' }];
  });

  readonly measureColumns = computed<PivotColumn[]>(() => {
    const measures = this.values();
    return this.columnGroups().flatMap(group => measures.map((measure, index) => ({
      key: this.cellKey(group.key, measure.field),
      title: measure.label?.trim() || this.fieldTitle(measure.field) || this.label('businessBlocks.measure', { index: index + 1 })
    })));
  });

  readonly pivotRows = computed<PivotRow[]>(() => {
    const node = this.node(), rows = this.effectiveRows(), rowFields = node.pivotRows ?? [];
    if (!rowFields.length || !this.values().length) return [];
    const rowGroups = this.groups(rows, rowFields), columnGroups = this.groups(rows, node.pivotColumns ?? []);
    return rowGroups.map(rowGroup => {
      const cells: Record<string, number | null> = {};
      for (const columnGroup of columnGroups) {
        const matching = rows.filter(row => this.groupKey(row, rowFields) === rowGroup.key &&
          (!node.pivotColumns?.length || this.groupKey(row, node.pivotColumns) === columnGroup.key));
        for (const measure of this.values()) cells[this.cellKey(columnGroup.key, measure.field)] = this.aggregate(matching, measure);
      }
      const total: Record<string, number | null> = {};
      for (const measure of this.values()) total[measure.field] = this.aggregate(rowGroup.rows, measure);
      return { key: rowGroup.key, labels: rowGroup.labels, values: cells, total };
    });
  });

  readonly columnTotals = computed(() => {
    const rows = this.effectiveRows(), fields = this.node().pivotColumns ?? [];
    return this.columnGroups().map(group => {
      const matching = fields.length ? rows.filter(row => this.groupKey(row, fields) === group.key) : rows;
      return Object.fromEntries(this.values().map(measure => [measure.field, this.aggregate(matching, measure)]));
    });
  });

  readonly grandTotals = computed(() => Object.fromEntries(this.values().map(measure => [measure.field, this.aggregate(this.effectiveRows(), measure)])));

  constructor() {
    effect(cleanup => {
      const source = sourceForNode(this.node()), tenant = this.tenantId(), design = this.designMode();
      this.rows.set([]); this.totalRecords.set(0); this.sampled.set(false); this.failed.set(false); this.loading.set(false);
      if (!source || source.kind === 'object' && (design || !tenant)) return;
      this.loading.set(true);
      const subscription = this.sources.read(source, tenant).subscribe({
        next: (result: ComponentDataResult) => { this.rows.set(result.rows); this.totalRecords.set(result.total); this.sampled.set(result.sampled); this.loading.set(false); },
        error: () => { this.loading.set(false); this.failed.set(true); }
      });
      cleanup(() => subscription.unsubscribe());
    });
  }

  private groups(rows: Record<string, unknown>[], fields: string[]): Group[] {
    if (!fields.length) return [{ key: '__all__', title: this.label('businessBlocks.values'), labels: [], rows }];
    const grouped = new Map<string, Group>();
    for (const row of rows) {
      const labels = fields.map(field => this.dimensionValue(row[field]));
      const key = JSON.stringify(labels);
      const group = grouped.get(key);
      if (group) group.rows.push(row);
      else grouped.set(key, { key, title: labels.join(' · '), labels, rows: [row] });
    }
    return [...grouped.values()].sort((a, b) => a.title.localeCompare(b.title));
  }

  private groupKey(row: Record<string, unknown>, fields: string[]): string { return JSON.stringify(fields.map(field => this.dimensionValue(row[field]))); }
  private dimensionValue(value: unknown): string { return value == null ? this.label('businessBlocks.blankValue') : typeof value === 'object' ? JSON.stringify(value) : String(value); }
  private cellKey(group: string, field: string): string { return `${group}\u001e${field}`; }
  private aggregate(rows: Record<string, unknown>[], measure: PagePivotValue): number | null {
    const values = rows.map(row => row[measure.field]).filter(value => value !== null && value !== undefined);
    if (measure.aggregation === 'count') return values.length;
    const numbers = values.map(value => typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN).filter(Number.isFinite);
    if (!numbers.length) return null;
    switch (measure.aggregation) {
      case 'sum': return numbers.reduce((sum, value) => sum + value, 0);
      case 'average': return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
      case 'min': return Math.min(...numbers);
      case 'max': return Math.max(...numbers);
      default: return null;
    }
  }
  private fieldTitle(field: string): string { return field; }
  private label(key: string, params?: Record<string, string | number>): string { return this.translations.translate(key, params); }
  display(value: number | null | undefined): string { return value == null ? '—' : new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value); }
  measureLabel(measure: PagePivotValue): string { return measure.label?.trim() || measure.field; }
}
