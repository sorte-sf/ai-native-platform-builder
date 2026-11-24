import type { PageNode } from './page-blocks';

export interface NavigatePageAction { kind: 'navigate-page'; pageKey: string; }
export interface OpenUrlAction { kind: 'open-url'; url: string; }
export type ComponentAction = NavigatePageAction | OpenUrlAction;
export interface ActionContext { applicationId: string; tenantId: string; preview: boolean; }
export interface NavigationTarget { commands: string[]; queryParams: { tenantId: string; preview: 'draft' | null }; }

/** Declarative button actions only; arbitrary scripts and unsafe URL schemes are rejected. */
export function actionForNode(node: PageNode): ComponentAction | null {
  if (node.type !== 'button') return null;
  if (node.actionType === 'none') return null;
  if (node.actionType === 'url') {
    const url = safeHttpsUrl(node.actionValue);
    return url ? { kind: 'open-url', url } : null;
  }
  const pageKey = node.actionType === 'page' ? node.actionValue : node.pageKey;
  return pageKey ? { kind: 'navigate-page', pageKey } : null;
}
export function navigationTarget(action: NavigatePageAction, context: ActionContext): NavigationTarget | null {
  if (!context.applicationId || !context.tenantId || !/^[a-z][a-z0-9-]{0,79}$/.test(action.pageKey)) return null;
  return { commands: ['/builder/applications', context.applicationId, 'screens', action.pageKey],
    queryParams: { tenantId: context.tenantId, preview: context.preview ? 'draft' : null } };
}

export function safeHttpsUrl(value: string | undefined): string | null {
  if (!value || value.length > 2048) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !!url.hostname && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
