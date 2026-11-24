import { describe, expect, it } from 'vitest';
import { actionForNode, navigationTarget } from './component-actions';
describe('component navigation actions', () => {
  it('preserves tenant and draft context', () => {
    const action = actionForNode({ id: 'button', type: 'button', pageKey: 'customers' })!;
    expect(navigationTarget(action, { applicationId: 'crm', tenantId: 'tenant', preview: true })).toEqual({ commands: ['/builder/applications', 'crm', 'screens', 'customers'], queryParams: { tenantId: 'tenant', preview: 'draft' } });
  });
  it('rejects external targets and missing context', () => {
    expect(navigationTarget({ kind: 'navigate-page', pageKey: 'https://example.com' }, { applicationId: 'crm', tenantId: 'tenant', preview: false })).toBeNull();
    expect(navigationTarget({ kind: 'navigate-page', pageKey: 'home' }, { applicationId: 'crm', tenantId: '', preview: false })).toBeNull();
    expect(actionForNode({ id: 'text', type: 'text', pageKey: 'home' })).toBeNull();
  });
  it('supports only credential-free HTTPS button links', () => {
    expect(actionForNode({ id: 'button', type: 'button', actionType: 'url', actionValue: 'https://example.com/help' }))
      .toEqual({ kind: 'open-url', url: 'https://example.com/help' });
    for (const actionValue of ['javascript:alert(1)', 'http://example.com', 'https://user:pass@example.com', '/relative'])
      expect(actionForNode({ id: 'button', type: 'button', actionType: 'url', actionValue })).toBeNull();
  });
  it('lets an explicit no-action setting disable a legacy page link', () => {
    expect(actionForNode({ id: 'button', type: 'button', pageKey: 'home', actionType: 'none' })).toBeNull();
  });
});
