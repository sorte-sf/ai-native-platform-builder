import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DataGridComponent, DataGridColumn } from '@app/shared/sorte-components/data-grid/data-grid.component';
import { ComponentDataSourceService, sourceForNode } from '@core/builders/component-data-source';
import type { PageNode, TableColumn } from '@core/builders/page-blocks';
@Component({
  selector: 'ant-designer-data-grid',
  templateUrl: './designer-data-grid.component.html',
  imports: [DataGridComponent, TranslocoPipe],
})
export class DesignerDataGridComponent {
  readonly node = input.required<PageNode>(); readonly tenantId = input(''); readonly designMode = input(false);
  readonly rows = signal<Record<string, unknown>[]>([]); readonly loading = signal(false); readonly failed = signal(false);
  private readonly sources = inject(ComponentDataSourceService);
  readonly refresh = signal(0);
  readonly refreshValue = (value: number) => value + 1;

  readonly columns = computed<DataGridColumn<Record<string, unknown>>[]>(() => {
    const columns: TableColumn[] = this.node().tableColumns ?? (this.node().columns ?? []).map(field => ({ field, title: field }));
    return columns.map(column => ({
      field: column.field,
      caption: column.title,
      width: column.width ? `${column.width}px` : undefined,
      align: column.align,
      visible: !column.hidden,
      sortable: true,
      format: (value: unknown) => column.format === 'number' && typeof value === 'number' ? new Intl.NumberFormat().format(value) : column.format === 'date' && typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleDateString() : value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
    }));
  });

  constructor() {
    effect(cleanup => {
      const source = sourceForNode(this.node()), tenant = this.tenantId(); this.refresh(); this.rows.set([]); this.loading.set(false); this.failed.set(false);
      if (!source || source.kind === 'object' && (this.designMode() || !tenant)) return;
      this.loading.set(true);
      const subscription = this.sources.read(source, tenant).subscribe({ next: result => { this.rows.set(result.rows); this.loading.set(false); }, error: () => { this.failed.set(true); this.loading.set(false); } });
      cleanup(() => subscription.unsubscribe());
    });
  }
}
