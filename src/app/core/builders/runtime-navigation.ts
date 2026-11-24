import type { PublishedApplication } from './builders-api.service';

export interface RuntimeMenuNode {
  item: PublishedApplication['Menus'][number];
  children: RuntimeMenuNode[];
}

/** Returns every menu group, including nested groups, so each can start expanded. */
export function runtimeNavigationGroupIds(nodes: RuntimeMenuNode[]): string[] {
  return nodes.flatMap(node => [
    ...(node.children.length ? [node.item.Id] : []),
    ...runtimeNavigationGroupIds(node.children)
  ]);
}

export function runtimeNavigationTree(
  bundle: PublishedApplication, applicationId: string, permissions: readonly string[], administrator: boolean
): RuntimeMenuNode[] {
  const prefix = `/builder/applications/${applicationId}/screens/`;
  const pages = new Set(bundle.Screens.map(page => prefix + page.Key));
  // Applications created from older starter releases can have pages but no
  // persisted menu rows. Keep those applications navigable without changing
  // their published snapshot; explicit menus always remain authoritative.
  const menus = bundle.Menus?.length ? bundle.Menus : bundle.Screens.map((page, index) => ({
    Id: `fallback-${page.Id}`,
    ParentId: null,
    Label: page.Title,
    Route: prefix + page.Key,
    SortOrder: index,
    Visible: true,
    Icon: "['fas','layer-group']",
    PermissionKey: null
  }));
  const items = new Map(menus.map(item => [item.Id, item]));
  const allowed = (item: PublishedApplication['Menus'][number]): boolean =>
    item.Visible && (!item.PermissionKey || administrator || permissions.includes('*') || permissions.includes(item.PermissionKey));

  const canRender = (id: string, visited = new Set<string>()): boolean => {
    if (visited.has(id)) return false;
    visited.add(id);
    const item = items.get(id);
    if (!item || !allowed(item)) return false;
    if (item.ParentId && !canRender(item.ParentId, visited)) return false;
    return !item.Route || pages.has(item.Route);
  };

  const nodes = new Map<string, RuntimeMenuNode>();
  for (const item of menus) {
    if (canRender(item.Id)) nodes.set(item.Id, { item, children: [] });
  }
  const roots: RuntimeMenuNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.item.ParentId ? nodes.get(node.item.ParentId) : undefined;
    if (parent) parent.children.push(node);
    else if (!node.item.ParentId) roots.push(node);
  }

  const sort = (siblings: RuntimeMenuNode[]) => {
    siblings.sort((a, b) => a.item.SortOrder - b.item.SortOrder);
    for (const sibling of siblings) sort(sibling.children);
  };
  sort(roots);
  return roots.filter(node => !!node.item.Route || node.children.length > 0);
}

export function runtimeNavigation(bundle: PublishedApplication, applicationId: string, permissions: readonly string[], administrator: boolean): PublishedApplication['Menus'] {
  const flatten = (nodes: RuntimeMenuNode[]): PublishedApplication['Menus'] => nodes.flatMap(node => [
    ...(node.item.Route ? [node.item] : []), ...flatten(node.children)
  ]);
  // Only routes contained in this snapshot; never render external/draft links.
  return flatten(runtimeNavigationTree(bundle, applicationId, permissions, administrator));
}
