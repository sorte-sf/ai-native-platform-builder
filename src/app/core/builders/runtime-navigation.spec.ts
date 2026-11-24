import { describe, it, expect } from 'vitest';
import { runtimeNavigation, runtimeNavigationGroupIds, runtimeNavigationTree } from './runtime-navigation';
import type { PublishedApplication } from './builders-api.service';

describe('standalone runtime navigation', () => {
  const menu = (Id: string, overrides = {}) => ({ Id, ParentId: null, Label: Id, Route: '/builder/applications/app/screens/home', SortOrder: 0, Visible: true, ...overrides });
  const bundle = (Menus: unknown[]) => ({ Screens: [{ Key: 'home' }], Menus } as PublishedApplication);
  it('allows only pages in the application snapshot', () => {
    expect(runtimeNavigation(bundle([menu('home'), menu('external', { Route: 'https://example.com' }), menu('other', { Route: '/builder/applications/other/screens/home' })]), 'app', [], false).map(x => x.Id)).toEqual(['home']);
  });
  it('enforces menu permission and admin override', () => {
    const data = bundle([menu('home', { PermissionKey: 'crm.read' })]);
    expect(runtimeNavigation(data, 'app', [], false)).toEqual([]);
    expect(runtimeNavigation(data, 'app', ['crm.read'], false)).toHaveLength(1);
    expect(runtimeNavigation(data, 'app', [], true)).toHaveLength(1);
  });
  it('hides descendants of hidden parents and rejects cycles', () => {
    expect(runtimeNavigation(bundle([menu('parent', { Visible: false }), menu('child', { ParentId: 'parent' }), menu('cycle', { ParentId: 'cycle' })]), 'app', [], true)).toEqual([]);
  });
  it('sorts visible application links', () => {
    expect(runtimeNavigation(bundle([menu('second', { SortOrder: 2 }), menu('first', { SortOrder: 1 })]), 'app', [], false).map(x => x.Id)).toEqual(['first', 'second']);
  });
  it('preserves nested groups and sorts each level', () => {
    const tree = runtimeNavigationTree(bundle([
      menu('group', { Route: null, SortOrder: 1 }),
      menu('later', { ParentId: 'group', SortOrder: 2 }),
      menu('earlier', { ParentId: 'group', SortOrder: 1 })
    ]), 'app', [], false);
    expect(tree.map(node => node.item.Id)).toEqual(['group']);
    expect(tree[0].children.map(node => node.item.Id)).toEqual(['earlier', 'later']);
  });
  it('identifies every group, including nested groups and route-bearing parents, for collapsible rendering', () => {
    const tree = runtimeNavigationTree(bundle([
      menu('root', { Route: null }),
      menu('routed-group', { ParentId: 'root' }),
      menu('nested-child', { ParentId: 'routed-group', Route: null }),
      menu('leaf', { ParentId: 'nested-child' })
    ]), 'app', [], false);
    expect(runtimeNavigationGroupIds(tree)).toEqual(['root', 'routed-group', 'nested-child']);
  });
  it('builds page links for older applications that have no saved menu rows', () => {
    const data = { ...bundle([]), Screens: [{ Id: 'dashboard-id', Key: 'dashboard', Title: 'Dashboard' }, { Id: 'requests-id', Key: 'requests', Title: 'Purchase requests' }] } as PublishedApplication;
    expect(runtimeNavigation(data, 'app', [], false).map(item => [item.Label, item.Route])).toEqual([
      ['Dashboard', '/builder/applications/app/screens/dashboard'],
      ['Purchase requests', '/builder/applications/app/screens/requests']
    ]);
  });
  it('does not leak children when their parent permission is missing', () => {
    const tree = runtimeNavigationTree(bundle([
      menu('restricted', { Route: null, PermissionKey: 'crm.admin' }),
      menu('child', { ParentId: 'restricted' })
    ]), 'app', [], false);
    expect(tree).toEqual([]);
  });
});
