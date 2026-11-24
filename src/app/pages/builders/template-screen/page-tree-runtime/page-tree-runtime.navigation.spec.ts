import { describe, expect, it } from 'vitest';
import { PageTreeRuntimeComponent } from './page-tree-runtime.component';

describe('application-container navigation', () => {
  const pages = [{ key: 'dashboard', title: 'Dashboard' }, { key: 'customers', title: 'Customers' }];
  const context = { availablePages: () => pages } as unknown as PageTreeRuntimeComponent;

  it('resolves a legacy menu label to a page within the same application', () => {
    expect(PageTreeRuntimeComponent.prototype.pageKeyFor.call(context, { id: '1', type: 'button', text: 'Customers' })).toBe('customers');
  });

  it('prefers an explicit page key and leaves unrelated actions unbound', () => {
    expect(PageTreeRuntimeComponent.prototype.pageKeyFor.call(context, { id: '1', type: 'button', text: 'Customers', pageKey: 'dashboard' })).toBe('dashboard');
    expect(PageTreeRuntimeComponent.prototype.pageKeyFor.call(context, { id: '2', type: 'button', text: 'Save' })).toBeNull();
  });
});
