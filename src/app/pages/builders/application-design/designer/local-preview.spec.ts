import '@ng-forge/dynamic-forms-material';
import { signal } from '@angular/core';
import { describe, it, expect, vi } from 'vitest';
import { PageTreeDesignerComponent } from './page-tree-designer.component';

describe('frontend-only designer preview', () => {
  it('clones unsaved nodes and opens locally without saving or navigating', () => {
    const showModal = vi.fn(), save = vi.fn(), navigate = vi.fn();
    const nodes = [{ id: 'board', type: 'kanban', text: 'Unsaved pipeline' }];
    const context = {
      current: () => ({ key: 'customers', title: 'Customers' }), saving: () => false,
      nodes: () => nodes, previewNodes: signal([]), previewTitle: signal(''), previewDialog: () => ({ nativeElement: { showModal } }),
      previewNavigation: signal([]), previewMenus: [], buildPreviewNavigation: vi.fn(() => []),
      error: signal(''), save, router: { navigate }, dirty: true
    };
    PageTreeDesignerComponent.prototype.previewDraft.call(context as unknown as PageTreeDesignerComponent);
    expect(showModal).toHaveBeenCalledOnce();
    expect(context.previewNodes()).toEqual(nodes);
    expect(context.previewNodes()).not.toBe(nodes);
    expect(save).not.toHaveBeenCalled(); expect(navigate).not.toHaveBeenCalled();
    expect(context.dirty).toBe(true);
  });
});
