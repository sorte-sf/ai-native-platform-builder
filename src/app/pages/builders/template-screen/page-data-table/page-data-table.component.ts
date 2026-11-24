import { Component, effect, inject, input, signal, computed } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BuildersApiService } from '@core/builders/builders-api.service';
@Component({
  selector: 'ant-page-data-table',
  templateUrl: 'page-data-table.component.html',
  styleUrl: 'page-data-table.component.scss',
  imports: [TranslocoPipe],

})
export class PageDataTableComponent {

  private readonly api = inject(BuildersApiService);
  readonly tenantId = input.required<string>();
  readonly objectId = input.required<string>();
  readonly columns = input<string[]>([]);
  readonly rows = signal<Record<string, unknown>[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly keys = computed(() => this.columns().length ? this.columns() : [...new Set(this.rows().flatMap(row => Object.keys(row)))].slice(0, 50));

  constructor() {
    effect(cleanup => {
      this.rows.set([]); this.error.set(''); this.loading.set(true);
      const subscription = this.api.records(this.tenantId(), this.objectId()).subscribe({
        next: records => {
          this.rows.set(records.map(record => {
            try {
              const data: unknown = JSON.parse(record.dataJson); 
              return data && typeof data === 'object' && !Array.isArray(data) ? data as Record<string, unknown> : {};
            } catch {
              return {};
            }
          }));
          this.loading.set(false);
        }, error: () => { this.loading.set(false); this.error.set('Records could not be loaded. Check your access to this data source.'); }
      });
      cleanup(() => subscription.unsubscribe());
    });
  }

  display(value: unknown): string {
    return value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  }

}
