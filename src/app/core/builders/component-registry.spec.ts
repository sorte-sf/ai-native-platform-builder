import { describe, expect, it } from 'vitest';
import { ComponentRegistry } from './component-registry';
import { componentRegistry, createPageBlock, pageBlocks } from './page-blocks';

describe('component registry', () => {
  it('rejects duplicate and invalid registrations', () => {
    const registry = new ComponentRegistry();
    const definition = { key: 'text', name: 'Text', group: 'Elements', definitionVersion: 1, create: () => ({ id: 'text', type: 'text' as const }) };
    registry.register(definition);
    expect(() => registry.register(definition)).toThrow('Duplicate');
    expect(() => registry.register({ ...definition, key: 'Bad key' })).toThrow('Invalid');
    expect(() => registry.create('missing')).toThrow('Unknown');
  });
  it('creates every existing palette block with fresh nested IDs', () => {
    for (const block of pageBlocks) {
      expect(componentRegistry.get(block.key)?.definitionVersion).toBe(1);
      const first = createPageBlock(block.key), second = createPageBlock(block.key);
      expect(first.id).not.toBe(second.id);
      expect(first.type).toBe(second.type);
      expect(() => JSON.stringify(first)).not.toThrow();
      if (first.children?.length) expect(first.children[0].id).not.toBe(second.children?.[0].id);
    }
  });
});
