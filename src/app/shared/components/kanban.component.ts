import { Component, effect, inject, input, signal } from '@angular/core';
import { TranslocoModule, TranslocoPipe } from '@jsverse/transloco';
import { ComponentDataSourceService, sourceForNode } from '@core/builders/component-data-source';
import type { PageNode } from '@core/builders/page-blocks';

@Component({
  selector: 'ant-kanban',
  templateUrl: './kanban.component.html',
  styleUrl: './kanban.component.scss',
  imports: [TranslocoModule,],
})
export class KanbanComponent {
  readonly node = input.required<PageNode>(); readonly tenantId = input(''); readonly designMode = input(false);
  readonly rows = signal<Record<string, unknown>[]>([]); readonly failed = signal(false); readonly loading = signal(false);
  private readonly sources = inject(ComponentDataSourceService);
  constructor() {
    effect(cleanup => {
      const source = sourceForNode(this.node()), tenant = this.tenantId();
      this.rows.set([]); this.failed.set(false); this.loading.set(false);
      if (this.designMode() || !source || !tenant) return;
      this.loading.set(true);
      const subscription = this.sources.read(source, tenant).subscribe({ next: result => { this.rows.set(result.rows); this.loading.set(false); }, error: () => { this.failed.set(true); this.loading.set(false); } });
      cleanup(() => subscription.unsubscribe());
    });
  }

  lanes(): { name: string; cards: string[] }[] {
    if (this.designMode()) return ['New', 'In progress', 'Won'].map(name => ({ name, cards: ['Opportunity'] }));
    const field = this.node().columns?.[0], title = this.node().titleField;
    if (!field || !title) return [];
    const lanes = new Map<string, string[]>();
    for (const row of this.rows()) {
      if (row[field] == null || typeof row[field] === 'object') continue;
      const name = String(row[field]); if (!lanes.has(name)) lanes.set(name, []);
      lanes.get(name)!.push(String(row[title] ?? ''));
    }
    return [...lanes].slice(0, 20).map(([name, cards]) => ({ name, cards }));
  }

}
