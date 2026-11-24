import type { PageNode } from '../../core/builders/page-blocks';
import { createClientId } from '../../core/builders/client-id';

/** Serializable compositions, not executable HTML or arbitrary scripts. */
export const applicationBlocks = [
  { key: 'app-layout', name: 'blocks.applicationLayout', group: 'blocks.layout' },
  { key: 'app-header', name: 'blocks.header', group: 'blocks.layout' },
  { key: 'app-footer', name: 'blocks.footer', group: 'blocks.layout' },
  { key: 'app-sidenav', name: 'blocks.sidenav', group: 'blocks.layout' },
  { key: 'app-grid', name: 'blocks.grid', group: 'blocks.layout' },
  { key: 'kpi', name: 'blocks.kpi', group: 'blocks.data' },
  { key: 'chart', name: 'blocks.chart', group: 'blocks.data' },
  { key: 'time-area-chart', name: 'businessBlocks.timeAreaChart', group: 'blocks.data' },
  { key: 'bar-line-chart', name: 'businessBlocks.barLineChart', group: 'blocks.data' },
  ...['line', 'area', 'pie', 'doughnut', 'funnel'].map(kind => ({ key: `${kind}-chart`, name: `businessBlocks.${kind}`, group: 'blocks.data' })),
  { key: 'kanban', name: 'businessBlocks.kanban', group: 'blocks.data' },
  { key: 'pivot-table', name: 'businessBlocks.pivotTable', group: 'blocks.data' },
  ...['gallery', 'data-grid', 'pagination'].map(key => ({ key, name: `businessBlocks.${key}`, group: 'blocks.data' }))
];

export function createApplicationBlock(key: string): PageNode | undefined {
  const node = (type: PageNode['type'], text?: string, children?: PageNode[]): PageNode => ({ id: createClientId(), type, text, children });
  const container = (children: PageNode[], styling: Record<string, string>): PageNode => ({ ...node('container', undefined, children), styling });
  const header = () => container([node('heading', 'My application')], { display: 'flex', 'padding-top': '16px', 'padding-bottom': '16px', 'background-color': '#ffffff' });
  const footer = () => container([node('text', 'My application · All rights reserved')], { 'padding-top': '12px', 'padding-bottom': '12px', 'background-color': '#f5f7fb' });
  const sidebar = () => createSideNavigation([]);
  switch (key) {
    case 'gallery': return { ...node('gallery', 'Gallery'), galleryColumns: 3, pageSize: 12, imageField: 'url', titleField: 'title' };
    case 'data-grid': return { ...node('data-grid', 'Data'), pageSize: 25 };
    case 'pagination': return node('pagination');
    case 'kanban': return node('kanban', 'Pipeline');
    case 'pivot-table': return { ...node('pivot-table', 'Pivot table'), pivotRowTotals: true, pivotColumnTotals: true };
    case 'line-chart': case 'area-chart': case 'time-area-chart': case 'bar-line-chart': case 'pie-chart': case 'doughnut-chart': case 'funnel-chart':
      return { ...node('chart', 'Chart'), chartKind: key.replace('-chart', '') as PageNode['chartKind'] };
    case 'app-header': return header();
    case 'app-footer': return footer();
    case 'app-sidenav': return sidebar();
    case 'app-grid': return container([], { display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '16px' });
    case 'app-layout': return container([header(), container([sidebar(), container([node('heading', 'Dashboard')], { 'min-width': '0', 'padding-left': '24px', 'padding-right': '24px' })], { display: 'grid', 'grid-template-columns': '220px 1fr', gap: '16px' }), footer()], { display: 'grid', gap: '16px' });
    case 'kpi': return node('kpi', 'Total records');
    case 'chart': return node('chart', 'Records by category');
    default: return undefined;
  }
}

/** Editable page-tree composition: groups and page links remain ordinary, validated nodes. */
export function createSideNavigation(pages: ReadonlyArray<{ key: string; title: string }>): PageNode {
  const item = (type: PageNode['type'], text: string, extra: Partial<PageNode> = {}): PageNode =>
    ({ id: createClientId(), type, text, ...extra });
  const link = (title: string, pageKey?: string): PageNode => item('button', title, pageKey ? { pageKey } : {});
  const links = pages.length ? pages.slice(0, 30).map(page => link(page.title, page.key)) :
    [link('Dashboard'), link('Customers'), link('Opportunities')];
  const group = (title: string, children: PageNode[]): PageNode => item('container', title, {
    presentation: 'collapse', children,
    styling: { 'border-color': '#65758a', 'border-style': 'solid', 'border-width': '0px',
      'padding-top': '8px', 'padding-bottom': '8px' }
  });
  return item('container', 'Side navigation', {
    navigationPlacement: 'left',
    children: [item('heading', 'My application'), group('Main', links), group('Workspace', [])],
    styling: { display: 'grid', gap: '8px', 'background-color': '#1b1c24', color: '#f2edf5',
      'padding-left': '16px', 'padding-right': '16px', 'padding-top': '20px', 'padding-bottom': '20px',
      'min-width': '200px', 'min-height': '100vh', width: '100%', 'border-radius': '12px',
      'border-color': '#39333f', 'border-style': 'solid', 'border-width': '1px' }
  });
}
