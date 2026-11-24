import '@ng-forge/dynamic-forms-material';
import { describe, expect, it } from 'vitest';
import { runtimeComponentRegistry } from './runtime-component-registry';
import type { RuntimeFormDefinition } from './interfaces/runtime-form-definition';

describe('runtime component registrations', () => {
  it('propagates sandbox mode and tenant context to form and CRUD renderers', () => {
    const definition = { objectId: 'customers', formId: 'customer-form', key: 'customers', name: 'Customers', layoutJson: null, fields: [] } satisfies RuntimeFormDefinition;
    const context = { tenantId: 'tenant', preview: true, definitions: { 'customer-form': definition } };
    const form = runtimeComponentRegistry.get('form')!;
    expect(form.inputs({ id: 'node', type: 'form', formId: 'customer-form' }, context)).toMatchObject({ preview: true, tenantContext: 'tenant', objectId: 'customers' });
    expect(runtimeComponentRegistry.get('crud')!.inputs({ id: 'node', type: 'crud', formId: 'customer-form' }, context)).toMatchObject({ preview: true, tenantId: 'tenant', definition });
    expect(form.inputs({ id: 'missing', type: 'form', formId: 'foreign' }, context)).toBeNull();
    expect(runtimeComponentRegistry.get('remote-code')).toBeUndefined();
  });
  it('registers all reusable leaf renderer types', () => {
    for (const type of ['icon', 'calendar', 'timeline', 'tooltip', 'markdown', 'kpi', 'chart', 'kanban', 'table', 'form', 'crud'])
      expect(runtimeComponentRegistry.get(type)?.component).toBeDefined();
  });
  it('disables live datasource reads in frontend-only preview', () => {
    const context = { tenantId: 'tenant', preview: true, localOnly: true, definitions: {} };
    for (const type of ['chart', 'kpi', 'kanban', 'table'] as const)
      expect(runtimeComponentRegistry.get(type)!.inputs({ id: 'node', type, objectId: 'customers' }, context)).toMatchObject({ designMode: true });
  });
});
