import { describe, it, expect } from 'vitest';
import { createPageBlock, PageNode, responsiveNodeStyle } from './page-blocks';
import { createSideNavigation } from '../../shared/components/application-blocks';
import { sanitizeElementStyle } from './element-styling';
import { parsePageDefinition } from './page-definition';
describe('reusable page blocks', () => {
  it('preserves table column mappings and source data through JSON', () => {
    const node: PageNode = { ...createPageBlock('table'), tableJson: '[{"name":"Example"}]', tableColumns: [{ field: 'name', title: 'Customer', width: 240, align: 'left', format: 'text' }] };
    const saved = JSON.parse(JSON.stringify(node));
    expect(saved.tableColumns[0]).toEqual(node.tableColumns?.[0]);
    expect(JSON.parse(saved.tableJson)[0].name).toBe('Example');
    expect(createPageBlock('table').tableColumns).toHaveLength(2);
  });
  it('preserves data sources and mapped columns in nested page definitions across save/reload serialization', () => {
    const definition = {
      schemaVersion: 1 as const,
      children: [{
        id: 'layout', type: 'container' as const, children: [{
          id: 'grid', type: 'data-grid' as const, objectId: 'object-123', pageSize: 25,
          columns: ['firstName', 'email'],
          tableColumns: [
            { field: 'firstName', title: 'First name', align: 'left' as const, format: 'text' as const },
            { field: 'email', title: 'Work email', align: 'left' as const, format: 'text' as const }
          ]
        }]
      }]
    };

    const savedJson = JSON.stringify(definition);
    const reloaded = parsePageDefinition(savedJson);
    const grid = reloaded.children[0].children?.[0];

    expect(grid?.objectId).toBe('object-123');
    expect(grid?.columns).toEqual(['firstName', 'email']);
    expect(grid?.tableColumns).toEqual(definition.children[0].children[0].tableColumns);
  });
  it('creates all additional element instances as serializable safe metadata', () => {
    for (const key of ['row', 'horizontal', 'vertical', 'panel', 'collapse', 'tabs', 'stepper', 'text-input', 'icon', 'calendar', 'timeline', 'tooltip', 'markdown', 'thumbnail', 'badge', 'barcode-reader', 'countdown', 'countup', 'qr-renderer', 'stopwatch']) {
      const block = createPageBlock(key);
      expect(JSON.parse(JSON.stringify(block)).type).toBe(block.type);
      const nodes = [block, ...(block.children ?? [])];
      expect(new Set(nodes.map(node => node.id)).size).toBe(nodes.length);
    }
    expect(createPageBlock('text-input').type).toBe('form');
    expect(createPageBlock('tabs').presentation).toBe('tabs');
  });
  it('preserves separate device proportions through saved JSON', () => {
    const node: PageNode = { id: 'grid', type: 'container', responsiveColumns: { desktop: [8, 16], tablet: [12, 12], mobile: [24] } };
    expect(responsiveNodeStyle(JSON.parse(JSON.stringify(node)))).toEqual({ '--desktop-columns': '8fr 16fr', '--tablet-columns': '12fr 12fr', '--mobile-columns': '24fr' });
    expect(responsiveNodeStyle({ ...node, responsiveColumns: { desktop: [0, -1] } })).toEqual({});
  });
  const flatten = (node: PageNode): PageNode[] => [node, ...(node.children ?? []).flatMap(flatten)];
  it('creates unique IDs for every nested instance', () => {
    const nodes = [...flatten(createPageBlock('cards')), ...flatten(createPageBlock('cards'))];
    expect(new Set(nodes.map(node => node.id)).size).toBe(nodes.length);
  });
  it('creates an editable application layout with header, navigation, content and footer', () => {
    const layout = createPageBlock('app-layout');
    expect(layout.type).toBe('container');
    expect(layout.children).toHaveLength(3);
    expect(layout.children?.[1].children).toHaveLength(2);
    const nodes = flatten(layout);
    expect(nodes.filter(node => node.type === 'button')).toHaveLength(3);
    expect(new Set(nodes.map(node => node.id)).size).toBe(nodes.length);
    expect(JSON.parse(JSON.stringify(layout))).toEqual(layout);
  });
  it('creates expandable navigation groups with links to the selected application pages', () => {
    const menu = createSideNavigation([{ key: 'dashboard', title: 'Dashboard' }, { key: 'customers', title: 'Customers' }]);
    const groups = menu.children?.filter(child => child.presentation === 'collapse') ?? [];
    expect(groups).toHaveLength(2);
    expect(groups[0].children?.map(child => child.pageKey)).toEqual(['dashboard', 'customers']);
    expect(new Set(flatten(menu).map(child => child.id)).size).toBe(flatten(menu).length);
  });
  it('does not invent data bindings for dashboard widgets', () => {
    for (const key of ['kpi', 'chart']) {
      const block = createPageBlock(key);
      expect(block.type).toBe(key);
      expect(block.objectId).toBeUndefined();
    }
  });
  it('preserves supported styles after serialization and sanitization', () => {
    for (const key of ['hero', 'card', 'cards', 'app-layout', 'app-header', 'app-footer', 'app-sidenav', 'app-grid']) for (const node of flatten(JSON.parse(JSON.stringify(createPageBlock(key))))) {
      expect(sanitizeElementStyle(node.styling)).toEqual(node.styling ?? {});
    }
  });
  it('keeps unbound forms as draft placeholders instead of inventing data IDs', () => {
    const form = flatten(createPageBlock('contact')).find(node => node.type === 'form');
    expect(form).toBeDefined(); expect(form?.objectId).toBeUndefined(); expect(form?.formId).toBeUndefined();
  });
});
