import type { PageNode } from './page-blocks';
import { componentCapability, componentPropertyDefinitions } from './component-capabilities';

export interface ComponentProperty {
  readonly key: 'text' | 'imageUrl' | 'pageKey';
  readonly label: string;
  readonly editor: 'multiline' | 'url' | 'page';
  readonly maxLength: number;
}
const definitions = new Map<string, ComponentProperty>();
for (const property of componentPropertyDefinitions) {
  if (property.key !== 'text' && property.key !== 'imageUrl' && property.key !== 'pageKey'
      || property.editor !== 'multiline' && property.editor !== 'url' && property.editor !== 'page'
      || !Number.isInteger(property.maxLength) || property.maxLength < 1 || definitions.has(property.key))
    throw new Error('Invalid component property contract');
  definitions.set(property.key, Object.freeze({ ...property, key: property.key, editor: property.editor }));
}
export function propertiesForNode(node: PageNode): readonly ComponentProperty[] {
  if (node.type === 'container' && !node.presentation) return [];
  return (componentCapability(node.type)?.properties ?? []).map(key => {
    const property = definitions.get(key);
    if (!property) throw new Error('Unknown component property');
    return property;
  });
}
