import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { TranslocoModule, TranslocoPipe } from '@jsverse/transloco';
import { ComponentDataSourceService, sourceForNode } from '@core/builders/component-data-source';
import type { PageNode, TableColumn } from '@core/builders/page-blocks';

@Component({
  selector: 'ant-component-table',
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
  imports: [TranslocoModule],
})
export class DataTableComponent {
  readonly node = input.required<PageNode>();
  readonly tenantId = input('');
  readonly designMode = input(false);
  readonly rows = signal<Record<string, unknown>[]>([]);
  readonly loading = signal(false);
  readonly failed = signal(false);
  private readonly sources = inject(ComponentDataSourceService);

  readonly columns = computed<TableColumn[]>(() => {
    const node = this.node();
    if (node.tableColumns) return node.tableColumns.filter(column => !column.hidden);
    const keys = node.columns?.length ? node.columns : [...new Set(this.rows().flatMap(row => Object.keys(row)))].slice(0, 50);
    return keys.map(field => ({ field, title: field }));
  });

  
  constructor() {
    effect(cleanup => {
      const node = this.node(), tenantId = this.tenantId(), design = this.designMode();
      this.rows.set([]); this.failed.set(false); this.loading.set(false);
      const source = sourceForNode(node);
      if (!source || source.kind === 'object' && (design || !tenantId)) return;
      this.loading.set(true);
      const subscription = this.sources.read(source, tenantId).subscribe({
        next: result => { this.rows.set(result.rows); this.loading.set(false); },
        error: () => { this.loading.set(false); this.failed.set(true); }
      }); cleanup(() => subscription.unsubscribe());
    });
  }
  display(value: unknown, column: TableColumn): string {
    if (value == null) return '';
    if (column.format === 'number' && typeof value !== 'object' && Number.isFinite(Number(value))) return new Intl.NumberFormat().format(Number(value));
    if (column.format === 'date' && typeof value === 'string') { const date = new Date(value); if (!Number.isNaN(date.getTime())) return date.toLocaleDateString(); }
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  }
}
