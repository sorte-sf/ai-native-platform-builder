import type { PageNode } from './page-blocks';
import { createClientId } from './client-id';

function isSideNavigation(node: PageNode): boolean {
  return node.type === 'container' && node.text === 'Side navigation';
}

/** Keep the draft application's navigation shell while swapping page content. Never mutates saved definitions. */
export function composePreviewPage(shellNodes: readonly PageNode[], pageNodes: readonly PageNode[]): PageNode[] {
  const clone = <T>(value: T): T => structuredClone(value);
  const cloneNodes = (nodes: readonly PageNode[]): PageNode[] => clone([...nodes]);
  if (pageNodes.some(node => containsNavigation(node))) return cloneNodes(pageNodes);
  const layout = shellNodes.find(node => node.type === 'container' && node.children?.some(child =>
    child.type === 'container' && child.children?.some(isSideNavigation)));
  if (layout) {
    const result = clone(layout);
    const row = result.children?.find(child => child.type === 'container' && child.children?.some(isSideNavigation));
    if (row) {
      const content = row.children?.find(child => !isSideNavigation(child));
      if (content) content.children = cloneNodes(pageNodes);
      else row.children?.push({ id: createClientId(), type: 'container', children: cloneNodes(pageNodes) });
    }
    return [result];
  }
  const navigation = shellNodes.find(isSideNavigation);
  if (!navigation) return cloneNodes(pageNodes);
  return [{ id: createClientId(), type: 'container', children: [clone(navigation),
    { id: createClientId(), type: 'container', children: cloneNodes(pageNodes) }],
    styling: { display: 'grid', 'grid-template-columns': '220px 1fr', gap: '16px' } }];
}

export function containsNavigation(node: PageNode): boolean {
  return isSideNavigation(node) || !!node.children?.some(containsNavigation);
}
