import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { TranslocoModule, TranslocoPipe } from '@jsverse/transloco';
import { ComponentDataSourceService, sourceForNode } from '../../core/builders/component-data-source';
import type { PageNode } from '@core/builders/page-blocks';
import { BlockPaginationService } from './block-pagination.service';
import { PaginationComponent } from './pagination.component';

export function galleryUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return value;
  try { return new URL(value).protocol === 'https:' ? value : null; } catch { return null; }
}

@Component({
  selector: 'ant-gallery',
  templateUrl: './gallery.component.html',
  imports: [TranslocoModule, PaginationComponent],
})
export class GalleryComponent {
  readonly node = input.required<PageNode>(); readonly tenantId = input(''); readonly designMode = input(false);
  readonly rows = signal<Record<string, unknown>[]>([]); readonly failed = signal(false); readonly loading = signal(false);
  readonly paging = inject(BlockPaginationService); private readonly sources = inject(ComponentDataSourceService);
  constructor() {
    effect(cleanup => {
      const source = sourceForNode(this.node()), tenant = this.tenantId();
      this.rows.set([]); this.failed.set(false); this.loading.set(false);
      if (!source || source.kind === 'object' && (this.designMode() || !tenant)) return;
      this.loading.set(true);
      const subscription = this.sources.read(source, tenant).subscribe({ next: value => { this.rows.set(value.rows); this.loading.set(false); }, error: () => { this.failed.set(true); this.loading.set(false); } });
      cleanup(() => subscription.unsubscribe());
    });
    effect(() => { const node = this.node(), length = this.rows().length; untracked(() => this.paging.configure(node.id, length, node.pageSize ?? 12)); });
  }
  visibleRows() { const state = this.paging.state()[this.node().id], start = ((state?.page ?? 1) - 1) * (this.node().pageSize ?? 12); return this.rows().slice(start, start + (this.node().pageSize ?? 12)); }
  url(row: Record<string, unknown>) { return galleryUrl(row[this.node().imageField ?? 'url']); }
  title(row: Record<string, unknown>) { const value = row[this.node().titleField ?? 'title']; return typeof value === 'string' || typeof value === 'number' ? String(value) : ''; }
}
