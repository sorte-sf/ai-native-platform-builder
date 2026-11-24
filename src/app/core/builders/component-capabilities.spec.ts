import { describe, expect, it } from 'vitest';
import { bindingForComponent, componentCapability, pageSchemaVersion } from './component-capabilities';
import { pageBlocks, createPageBlock } from './page-blocks';
import { parsePageDefinition } from './page-definition';
import { propertiesForNode } from './component-properties';

describe('shared component capability contract', () => {
  it('declares the supported data binding editors', () => {
    expect(bindingForComponent('form')).toBe('form');
    expect(bindingForComponent('crud')).toBe('form');
    expect(bindingForComponent('table')).toBe('object-or-json');
    expect(bindingForComponent('kpi')).toBe('object');
    expect(bindingForComponent('chart')).toBe('object');
    expect(bindingForComponent('text')).toBeNull();
  });
  it('discovers property editors from the contract', () => {
    expect(propertiesForNode({ id: 'image', type: 'image' }).map(property => property.key)).toEqual(['imageUrl', 'text']);
    expect(propertiesForNode({ id: 'button', type: 'button' }).find(property => property.key === 'pageKey')?.editor).toBe('page');
  });
  it('rejects oversized declared properties before rendering', () => {
    expect(() => parsePageDefinition(JSON.stringify({ schemaVersion: 1, children: [
      { id: 'button', type: 'button', pageKey: 'a'.repeat(81) }
    ] }))).toThrow();
  });
  it('supports every registered palette factory', () => {
    expect(pageSchemaVersion).toBe(1);
    for (const block of pageBlocks) {
      const node = createPageBlock(block.key);
      expect(componentCapability(node.type)).toBeDefined();
      expect(() => parsePageDefinition(JSON.stringify({ schemaVersion: 1, children: [node] }))).not.toThrow();
    }
  });
  it('allows nesting only on registered container types', () => {
    expect(componentCapability('container')?.children).toBe(true);
    expect(componentCapability('text')?.children).toBe(false);
    expect(componentCapability('untrusted-script')).toBeUndefined();
  });
});
