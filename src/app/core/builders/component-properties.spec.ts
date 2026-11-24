import { describe, expect, it } from 'vitest';
import { propertiesForNode } from './component-properties';
import { componentRegistry, createPageBlock } from './page-blocks';

describe('component property schemas', () => {
  it('exposes only supported editors and retains page navigation', () => {
    expect(propertiesForNode({ id: 'button', type: 'button' }).map(property => property.key)).toEqual(['text', 'pageKey']);
    expect(propertiesForNode({ id: 'image', type: 'image' }).map(property => property.key)).toEqual(['imageUrl', 'text']);
    expect(propertiesForNode({ id: 'form', type: 'form' })).toEqual([]);
    expect(propertiesForNode({ id: 'container', type: 'container' })).toEqual([]);
    expect(propertiesForNode({ id: 'tabs', type: 'container', presentation: 'tabs' })).toHaveLength(1);
  });
  it('makes inspector schemas discoverable through registered blocks', () => {
    const node = createPageBlock('button');
    expect(componentRegistry.get('button')?.properties?.(node)).toEqual(propertiesForNode(node));
  });
});
