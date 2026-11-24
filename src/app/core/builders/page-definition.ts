import type { PageNode } from './page-blocks';
import { componentCapability, componentPropertyDefinitions, pageSchemaVersion } from './component-capabilities';
import { safeHttpsUrl } from './component-actions';

export interface PageDefinition { schemaVersion: 1; children: PageNode[]; }
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }

/** Shared structural contract. Backend remains authoritative for bindings and permissions. */
export function parsePageDefinition(json: string): PageDefinition {
  if (json.length > 500_000) throw new Error('Page definition exceeds 500 KB');
  const value: unknown = JSON.parse(json);
  if (!object(value) || value['schemaVersion'] !== pageSchemaVersion || !Array.isArray(value['children'])) throw new Error('Unsupported page definition version');
  const ids = new Set<string>(); let count = 0;
  const check = (node: unknown, depth: number): void => {
    if (!object(node) || depth > 12 || ++count > 500) throw new Error('Invalid page tree size or depth');
    const id = node['id'], type = node['type'];
    if (typeof id !== 'string' || !id.trim() || id.length > 100 || ids.has(id)) throw new Error('Duplicate or invalid component ID');
    ids.add(id);
    const capability = typeof type === 'string' ? componentCapability(type) : undefined;
    if (!capability) throw new Error('Unsupported component type');
    if (node['shellRole'] != null && (type !== 'container' || node['shellRole'] !== 'application-shell')) throw new Error('Invalid application shell marker');
    if (node['navigationPlacement'] != null && (type !== 'container' || node['text'] !== 'Side navigation' || !['left', 'right', 'top'].includes(String(node['navigationPlacement'])))) throw new Error('Invalid navigation placement');
    if (node['navigationLogoUrl'] != null && (type !== 'container' || node['text'] !== 'Side navigation' || typeof node['navigationLogoUrl'] !== 'string' || node['navigationLogoUrl'].length > 2048 || node['navigationLogoUrl'].length > 0 && !(node['navigationLogoUrl'].startsWith('/') && !node['navigationLogoUrl'].startsWith('//') && !node['navigationLogoUrl'].includes('\\') || safeHttpsUrl(node['navigationLogoUrl'])))) throw new Error('Invalid navigation logo URL');
    if (node['galleryColumns'] != null && (type !== 'gallery' || !Number.isInteger(node['galleryColumns']) || Number(node['galleryColumns']) < 1 || Number(node['galleryColumns']) > 6)) throw new Error('Invalid gallery columns');
    if (node['pageSize'] != null && (!['gallery', 'data-grid'].includes(String(type)) || !Number.isInteger(node['pageSize']) || Number(node['pageSize']) < 1 || Number(node['pageSize']) > 100)) throw new Error('Invalid page size');
    for (const key of ['imageField', 'targetNodeId']) if (node[key] != null && (typeof node[key] !== 'string' || node[key].length > 100)) throw new Error('Invalid block binding');
    if (node['actionValue'] != null && (typeof node['actionValue'] !== 'string' || node['actionValue'].length > 2048)) throw new Error('Invalid button action value');
    if (node['actionType'] != null) {
      if (type !== 'button' || !['none', 'page', 'url', 'form'].includes(String(node['actionType']))
        || node['actionType'] === 'form' && node['floatingButton'] !== true) throw new Error('Invalid button action type');
      const value = typeof node['actionValue'] === 'string' ? node['actionValue'] : '';
      if (node['actionType'] === 'page' && value && !/^[a-z][a-z0-9-]{0,79}$/.test(value)) throw new Error('Invalid application page action');
      // Draft pages can retain legacy/invalid links so designers can reopen and fix them.
      // Runtime action resolution still refuses unsafe URLs; publish validation is authoritative.
    }
    if (node['chartKind'] != null && (type !== 'chart' || !['bar', 'line', 'area', 'stacked-column', 'time-area', 'bar-line', 'pie', 'doughnut', 'funnel'].includes(String(node['chartKind'])))) throw new Error('Invalid chart type');
    if (node['legendPosition'] != null && (type !== 'chart' || !['top', 'bottom', 'left', 'right'].includes(String(node['legendPosition'])))) throw new Error('Invalid chart legend position');
    if (node['showDataLabels'] != null && (type !== 'chart' || typeof node['showDataLabels'] !== 'boolean')) throw new Error('Invalid chart data-label setting');
    for (const [key, limit] of [['pivotRows', 3], ['pivotColumns', 2]] as const) {
      const fields = node[key];
      if (fields != null && (type !== 'pivot-table' || !Array.isArray(fields) || fields.length > limit
        || fields.some(field => typeof field !== 'string' || !field.trim() || field.length > 100) || new Set(fields).size !== fields.length)) throw new Error('Invalid pivot dimensions');
    }
    if (node['pivotValues'] != null && (type !== 'pivot-table' || !Array.isArray(node['pivotValues']) || node['pivotValues'].length > 5
      || node['pivotValues'].some(value => !object(value) || typeof value['field'] !== 'string' || !value['field'].trim() || value['field'].length > 100
        || !['count', 'sum', 'average', 'min', 'max'].includes(String(value['aggregation'])) || value['label'] != null && (typeof value['label'] !== 'string' || value['label'].length > 100))
      || new Set(node['pivotValues'].map(value => object(value) ? value['field'] : null)).size !== node['pivotValues'].length)) throw new Error('Invalid pivot measures');
    for (const key of ['pivotRowTotals', 'pivotColumnTotals']) if (node[key] != null && (type !== 'pivot-table' || typeof node[key] !== 'boolean')) throw new Error('Invalid pivot total setting');
    for (const key of ['valueField', 'secondaryValueField', 'titleField', 'calendarTitleField', 'calendarStartField', 'calendarEndField']) {
      if (node[key] != null && (typeof node[key] !== 'string' || node[key].length > 100)) throw new Error('Invalid business field');
    }
    for (const key of ['calendarTitleField', 'calendarStartField', 'calendarEndField']) if (node[key] != null && type !== 'calendar') throw new Error('Calendar fields require a calendar component');
    if (node['crudActions'] != null) {
      const actions = node['crudActions'];
      if (type !== 'crud' || !object(actions) || Object.entries(actions).some(([key, enabled]) => !['create', 'view', 'edit', 'delete'].includes(key) || typeof enabled !== 'boolean'))
        throw new Error('Invalid CRUD action settings');
    }
    for (const key of ['text', 'imageUrl', 'pageKey', 'objectId', 'formId', 'tableJson']) {
      if (node[key] != null && typeof node[key] !== 'string') throw new Error(`Invalid component property: ${key}`);
    }
    for (const property of componentPropertyDefinitions) {
      const field = node[property.key];
      if (typeof field === 'string' && field.length > property.maxLength) throw new Error('Component property exceeds length limit');
    }
    if (node['children'] != null) {
      if (!Array.isArray(node['children']) || !capability.children && node['children'].length > 0) throw new Error('Invalid component children');
      for (const child of node['children']) check(child, depth + 1);
    }
  };
  for (const node of value['children']) check(node, 1);
  return value as unknown as PageDefinition;
}
