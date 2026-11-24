import { ElementStyle } from './element-styling';
import { ComponentRegistry } from './component-registry';
import { propertiesForNode } from './component-properties';
import { applicationBlocks, createApplicationBlock } from '../../shared/components/application-blocks';
import { elementBlocks, createElementBlock } from '../../shared/components/element-blocks';
import { createClientId } from './client-id';
export interface PageNode {
  pivotRows?: string[];
  pivotColumns?: string[];
  pivotValues?: PagePivotValue[];
  pivotRowTotals?: boolean;
  pivotColumnTotals?: boolean;
  calendarTitleField?: string;
  calendarStartField?: string;
  calendarEndField?: string;
  galleryColumns?: number;
  pageSize?: number;
  imageField?: string;
  targetNodeId?: string;
  chartKind?: 'bar' | 'line' | 'area' | 'stacked-column' | 'time-area' | 'bar-line' | 'pie' | 'doughnut' | 'funnel';
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
  showDataLabels?: boolean;
  valueField?: string;
  secondaryValueField?: string;
  titleField?: string;
  crudActions?: { create?: boolean; view?: boolean; edit?: boolean; delete?: boolean };
  actionType?: 'none' | 'page' | 'url' | 'form';
  actionValue?: string;
  tableColumns?: TableColumn[];
  tableJson?: string;
  id: string; type: 'container' | 'text' | 'heading' | 'image' | 'button' | 'table' | 'form' | 'crud' | 'kpi' | 'chart' | 'kanban' | 'gallery' | 'data-grid' | 'pivot-table' | 'pagination' | 'icon' | 'calendar' | 'date-time-picker' | 'flippable-card' | 'timeline' | 'tooltip' | 'markdown' | 'badge' | 'barcode-reader' | 'countdown' | 'countup' | 'qr-renderer' | 'stopwatch';
  presentation?: 'collapse' | 'tabs' | 'stepper';
  shellRole?: 'application-shell';
  navigationPlacement?: 'left' | 'right' | 'top';
  navigationLogoUrl?: string;
  text?: string; objectId?: string; formId?: string; children?: PageNode[]; imageUrl?: string; pageKey?: string; columns?: string[]; styling?: ElementStyle;
  floatingButton?: boolean;
  responsiveColumns?: { desktop?: number[]; tablet?: number[]; mobile?: number[] };
}
export interface PagePivotValue { field: string; aggregation: 'count' | 'sum' | 'average' | 'min' | 'max'; label?: string; }
export interface TableColumn { field: string; title: string; width?: number; align?: 'left' | 'center' | 'right'; format?: 'text' | 'number' | 'date'; hidden?: boolean; }

export function responsiveNodeStyle(node: PageNode): Record<string, string> {
  const result: Record<string, string> = {};
  for (const device of ['desktop', 'tablet', 'mobile'] as const) {
    const values = node.responsiveColumns?.[device];
    if (values?.length && values.length <= 12 && values.every(value => Number.isFinite(value) && value > 0 && value <= 24))
      result[`--${device}-columns`] = values.map(value => `${value}fr`).join(' ');
  }
  return result;
}
const builtInBlocks = [
  ...applicationBlocks,
  ...elementBlocks,
  { key: 'container', name: 'blocks.container', group: 'Elements' }, { key: 'heading', name: 'blocks.heading', group: 'Elements' },
  { key: 'text', name: 'blocks.paragraph', group: 'Elements' }, { key: 'image', name: 'blocks.image', group: 'Elements' },
  { key: 'button', name: 'blocks.button', group: 'Elements' }, { key: 'table', name: 'blocks.data_table', group: 'Data' }, { key: 'form', name: 'blocks.data_form', group: 'Data' },
  { key: 'hero', name: 'blocks.hero_section', group: 'Sections' }, { key: 'card', name: 'blocks.content_card', group: 'Sections' },
  { key: 'cards', name: 'blocks.three_column_cards', group: 'Sections' }, { key: 'contact', name: 'blocks.contact_section', group: 'Sections' }
];
function createBuiltInBlock(key: string): PageNode {
  const applicationBlock = createApplicationBlock(key);
  if (applicationBlock) return applicationBlock;
  const elementBlock = createElementBlock(key);
  if (elementBlock) return elementBlock;
  const node = (type: PageNode['type'], text?: string, children?: PageNode[]): PageNode => ({ id: createClientId(), type, ...(text ? { text } : {}), ...(children ? { children } : {}) });
  const card = () => ({ ...node('container', undefined, [node('heading', 'Card title'), node('text', 'Add your content here.'), node('button', 'Learn more')]), styling: { 'padding-top': '24px', 'padding-right': '24px', 'padding-bottom': '24px', 'padding-left': '24px', 'border-radius': '12px', 'background-color': '#f5f7fb' } });
  switch (key) {
    case 'hero': return { ...node('container', undefined, [node('heading', 'Build something great'), node('text', 'Tell your users what your application can do.'), node('button', 'Get started')]), styling: { 'padding-top': '48px', 'padding-right': '48px', 'padding-bottom': '48px', 'padding-left': '48px', 'text-align': 'center', 'background-color': '#eef2ff' } };
    case 'card': return card();
    case 'cards': return { ...node('container', undefined, [card(), card(), card()]), styling: { display: 'grid', 'grid-template-columns': '1fr 1fr 1fr', gap: '16px' } };
    case 'contact': return node('container', undefined, [node('heading', 'Contact us'), node('text', 'We would love to hear from you.'), node('form')]);
    case 'text': return node('text', 'Your text');
    case 'heading': return node('heading', 'Section heading');
    case 'button': return node('button', 'Button');
    case 'container': return node('container', undefined, []);
    case 'table': return { ...node('table'), tableColumns: [{ field: '', title: 'Column 1' }, { field: '', title: 'Column 2' }] };
    case 'form': return node('form');
    case 'image': return node('image');
    default: throw new Error('Unknown block');
  }
}

export const componentRegistry = new ComponentRegistry();
for (const block of builtInBlocks) {
  componentRegistry.register({ ...block, definitionVersion: 1, create: () => createBuiltInBlock(block.key), properties: propertiesForNode });
}
/** Compatibility exports for existing palette consumers and saved definitions. */
export const pageBlocks = componentRegistry.list();
export function createPageBlock(key: string): PageNode { return componentRegistry.create(key); }
