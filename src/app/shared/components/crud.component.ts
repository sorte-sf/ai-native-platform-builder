import { Component, effect, inject, input, signal, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoPipe } from '@jsverse/transloco';
import { RuntimeFormComponent } from '@pages/builders/runtime-form/runtime-form.component';
import { BuildersApiService } from '@core/builders/builders-api.service';
import type { PageNode, TableColumn } from '@core/builders/page-blocks';
import type { RuntimeFormDefinition } from '@core/builders/interfaces/runtime-form-definition';
import type { BuilderRecord } from '@core/builders/interfaces/builder-record';
import { Subscription } from 'rxjs';

@Component({
  selector: 'ant-crud',
  templateUrl: './crud.component.html',
  styleUrl: './crud.component.scss',
  imports: [TranslocoPipe, RuntimeFormComponent],
})
export class CrudComponent {
  readonly preview = input(false);
  readonly localOnly = input(false);

  changePage(offset: number): void {
    this.page.update(page => Math.max(1, page + offset));
  }

  readonly node = input.required<PageNode>();
  readonly definition = input.required<RuntimeFormDefinition>();
  readonly tenantId = input.required<string>();
  readonly mode = signal<'list' | 'create' | 'edit' | 'view'>('list');
  readonly dialogOpen = signal(false);
  readonly selected = signal<BuilderRecord | null>(null);
  readonly rows = signal<BuilderRecord[]>([]);
  readonly error = signal(false);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly pendingDelete = signal<BuilderRecord | null>(null);
  readonly search = signal('');
  readonly page = signal(1);
  readonly total = signal(0);
  private readonly api = inject(BuildersApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refresh = signal(0);
  private context = '';
  private request?: Subscription;

  readonly capabilities = signal({ read: false, create: false, update: false, delete: false });

  private readonly capabilityEffect = effect(cleanup => {
    const tenant = this.tenantId(), objectId = this.node().objectId;
    this.capabilities.set({ read: false, create: false, update: false, delete: false });
    if (this.preview() || !tenant || !objectId) return;
    const subscription = this.api.recordCapabilities(tenant, objectId).subscribe({ next: value => this.capabilities.set(value), error: () => this.error.set(true) });
    cleanup(() => subscription.unsubscribe());
  });

  constructor() {
    effect(cleanup => {
      const tenant = this.tenantId(), objectId = this.node().objectId, preview = this.preview();
      const context = JSON.stringify([tenant, objectId, preview]);
      if (this.context !== context) {
        this.context = context;
        this.rows.set([]); this.total.set(0); this.page.set(1); this.search.set('');
        this.selected.set(null); this.pendingDelete.set(null); this.mode.set('list'); this.error.set(false);
      }
      const page = this.page(); this.refresh();
      if (!objectId || !tenant || preview) { this.loading.set(false); return; }
      this.loading.set(true); this.error.set(false);
      const subscription = this.api.queryCrudRecords(tenant, objectId, page).subscribe({
        next: result => {
          if (page > 1 && !result.items.length && result.total <= (page - 1) * 25) { this.page.set(Math.max(1, Math.ceil(result.total / 25))); return; }
          this.rows.set(result.items); this.total.set(result.total); this.loading.set(false);
        }, error: () => { this.error.set(true); this.loading.set(false); }
      });
      this.request = subscription;
      cleanup(() => subscription.unsubscribe());
    });
  }

  columnSettings(): TableColumn[] {
    const valid = new Set(this.definition().fields.map(field => field.key));
    const configured = this.node().tableColumns;
    if (configured) return configured.filter(column => !column.hidden && valid.has(column.field));
    return (this.node().columns?.length ? this.node().columns! : [...valid]).filter(key => valid.has(key)).map(field => ({ field, title: this.label(field) }));
  }

  columns() { return this.columnSettings().map(column => column.field); }
  label(key: string) { return this.node().tableColumns?.find(column => column.field === key)?.title ?? this.definition().fields.find(field => field.key === key)?.label ?? key; }
  display(record: BuilderRecord, column: TableColumn): string {
    const value = this.value(record, column.field);
    if (!value) return '';
    if (column.format === 'number' && Number.isFinite(Number(value))) return new Intl.NumberFormat().format(Number(value));
    if (column.format === 'date') { const date = new Date(value); if (!Number.isNaN(date.getTime())) return date.toLocaleDateString(); }
    return value;
  }

  value(record: BuilderRecord, key: string): string {
    try {
      const data = JSON.parse(record.dataJson) as Record<string, unknown>;
      return data[key] == null ? '' : typeof data[key] === 'object' ? JSON.stringify(data[key]) : String(data[key]);
    }
    catch { return ''; }
  }

  visibleRows() {
    const search = this.search().trim().toLocaleLowerCase();
    return this.rows().filter(record => !search || this.columns().some(key => this.value(record, key).toLocaleLowerCase().includes(search)));
  }

  actionEnabled(action: 'create' | 'view' | 'edit' | 'delete'): boolean {
    const permission = action === 'view' ? 'read' : action === 'edit' ? 'update' : action;
    return this.node().crudActions?.[action] !== false && (this.preview() || this.capabilities()[permission]);
  }

  create(): void { if (!this.actionEnabled('create')) return; this.selected.set(null); this.dialogOpen.set(true); this.mode.set('create'); }

  closeDialog(): void {
    if (this.busy()) return;
    this.dialogOpen.set(false);
    this.mode.set('list');
    this.selected.set(null);
  }

  confirmDelete(record: BuilderRecord): void { if (this.actionEnabled('delete')) this.pendingDelete.set(record); }

  open(mode: 'edit' | 'view', record: BuilderRecord): void {
    if (!this.actionEnabled(mode)) return;
    this.selected.set(record);
    this.dialogOpen.set(mode === 'edit');
    this.mode.set(mode);
  }

  saved(record: BuilderRecord): void {
    if (this.preview()) {
      this.rows.update(rows => [...rows.filter(row => row.id !== record.id), record]);
      this.total.set(this.rows().length);
    }
    this.dialogOpen.set(false); this.mode.set('list'); this.selected.set(null);
    if (!this.preview()) this.reload();
  }

  reload(): void { if (this.preview()) return; this.request?.unsubscribe(); this.refresh.update(value => value + 1); }

  deleteSelected(): void {
    const record = this.pendingDelete();
    if (!record || this.busy() || !this.actionEnabled('delete')) return;
    if (this.preview()) {
      this.rows.update(rows => rows.filter(row => row.id !== record.id));
      this.total.set(this.rows().length); this.pendingDelete.set(null);
      return;
    }
    this.busy.set(true);
    this.api.deleteRecord(this.tenantId(), record.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busy.set(false); this.pendingDelete.set(null);
          this.reload();
        },
        error: () => {
          this.busy.set(false);
          this.error.set(true);
        }
      });
  }
  
}
