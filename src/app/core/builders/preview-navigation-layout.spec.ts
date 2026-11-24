import { describe, expect, it } from 'vitest';
import { composePreviewPage } from './preview-navigation-layout';
import type { PageNode } from './page-blocks';

describe('draft navigation shell', () => {
  it('keeps the navigation and swaps only app-layout page content', () => {
    const nav: PageNode = { id: 'nav', type: 'container', text: 'Side navigation', children: [{ id: 'link', type: 'button', text: 'Customers', pageKey: 'customers' }] };
    const shell: PageNode[] = [{ id: 'layout', type: 'container', children: [{ id: 'header', type: 'heading', text: 'App' },
      { id: 'row', type: 'container', children: [nav, { id: 'content', type: 'container', children: [{ id: 'old', type: 'text', text: 'Old' }] }] }] }];
    const result = composePreviewPage(shell, [{ id: 'new', type: 'text', text: 'Customers' }]);
    expect(result[0].children?.[1].children?.[0].id).toBe('nav');
    expect(result[0].children?.[1].children?.[1].children?.[0].id).toBe('new');
    expect(shell[0].children?.[1].children?.[1].children?.[0].id).toBe('old');
  });
});
