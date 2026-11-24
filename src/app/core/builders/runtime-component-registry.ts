import type { Type } from '@angular/core';
import type { PageNode } from './page-blocks';
import type { RuntimeFormDefinition } from './interfaces/runtime-form-definition';
import { DisplayBlockComponent } from '../../shared/components/display-block.component';
import { DataWidgetComponent } from '../../shared/components/data-widget.component';
import { DataTableComponent } from '../../shared/components/data-table.component';
import { CrudComponent } from '../../shared/components/crud.component';
import { KanbanComponent } from '../../shared/components/kanban.component';
import { GalleryComponent } from '../../shared/components/gallery.component';
import { DesignerDataGridComponent } from '../../shared/components/designer-data-grid.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { PivotTableComponent } from '../../shared/components/pivot-table.component';
import { RuntimeFormComponent } from '../../pages/builders/runtime-form/runtime-form.component';

export interface RuntimeComponentContext {
  tenantId: string;
  preview: boolean;
  localOnly?: boolean;
  definitions: Record<string, RuntimeFormDefinition>;
}
export interface RuntimeComponentRegistration {
  component: Type<unknown>;
  inputs: (node: PageNode, context: RuntimeComponentContext) => Record<string, unknown> | null;
}
export class RuntimeComponentRegistry {
  private readonly registrations = new Map<string, RuntimeComponentRegistration>();
  register(type: PageNode['type'], registration: RuntimeComponentRegistration): void {
    if (this.registrations.has(type)) throw new Error(`Duplicate runtime component: ${type}`);
    this.registrations.set(type, Object.freeze({ ...registration }));
  }
  get(type: string): RuntimeComponentRegistration | undefined { return this.registrations.get(type); }
}

// Only trusted Angular components are registered. Stored JSON cannot select
// arbitrary code, remote modules, providers or credentials.
export const runtimeComponentRegistry = new RuntimeComponentRegistry();
runtimeComponentRegistry.register('pagination', { component: PaginationComponent, inputs: node => ({ node }) });
for (const [type, component] of [['gallery', GalleryComponent], ['data-grid', DesignerDataGridComponent]] as const)
  runtimeComponentRegistry.register(type, { component, inputs: (node, context) => ({ node, tenantId: context.tenantId, designMode: !!context.localOnly }) });
runtimeComponentRegistry.register('kanban', { component: KanbanComponent, inputs: (node, context) => ({ node, tenantId: context.tenantId, designMode: !!context.localOnly }) });
for (const type of ['icon', 'date-time-picker', 'flippable-card', 'timeline', 'tooltip', 'markdown', 'badge', 'barcode-reader', 'countdown', 'countup', 'qr-renderer', 'stopwatch'] as const)
  runtimeComponentRegistry.register(type, { component: DisplayBlockComponent, inputs: node => ({ node }) });
runtimeComponentRegistry.register('calendar', { component: DisplayBlockComponent, inputs: (node, context) => ({ node, tenantId: context.tenantId, designMode: !!context.localOnly }) });
for (const type of ['kpi', 'chart'] as const)
  runtimeComponentRegistry.register(type, { component: DataWidgetComponent, inputs: (node, context) => ({ node, tenantId: context.tenantId, designMode: !!context.localOnly }) });
runtimeComponentRegistry.register('table', { component: DataTableComponent, inputs: (node, context) => ({ node, tenantId: context.tenantId, designMode: !!context.localOnly }) });
runtimeComponentRegistry.register('pivot-table', { component: PivotTableComponent, inputs: (node, context) => ({ node, tenantId: context.tenantId, designMode: !!context.localOnly }) });
runtimeComponentRegistry.register('form', { component: RuntimeFormComponent, inputs: (node, context) => {
  const definition = node.formId ? context.definitions[node.formId] : undefined;
  return definition ? { objectId: definition.objectId, definition, tenantContext: context.tenantId, preview: context.preview, localOnly: !!context.localOnly } : null;
} });
runtimeComponentRegistry.register('crud', { component: CrudComponent, inputs: (node, context) => {
  const definition = node.formId ? context.definitions[node.formId] : undefined;
  return definition ? { node, definition, tenantId: context.tenantId, preview: context.preview, localOnly: !!context.localOnly } : null;
} });
