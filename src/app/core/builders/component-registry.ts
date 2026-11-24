import type { PageNode } from './page-blocks';
import type { ComponentProperty } from './component-properties';
import { componentCapability } from './component-capabilities';

export interface ComponentDefinition {
  readonly key: string;
  readonly name: string;
  readonly group: string;
  readonly definitionVersion: number;
  readonly create: () => PageNode;
  readonly properties?: (node: PageNode) => readonly ComponentProperty[];
}

/** Trusted, code-registered definitions only; never execute code from saved JSON. */
export class ComponentRegistry {
  private readonly definitions = new Map<string, ComponentDefinition>();

  register(definition: ComponentDefinition): void {
    if (!/^[a-z][a-z0-9-]*$/.test(definition.key) || !Number.isInteger(definition.definitionVersion) || definition.definitionVersion < 1)
      throw new Error('Invalid component registration');
    if (this.definitions.has(definition.key)) throw new Error(`Duplicate component registration: ${definition.key}`);
    this.definitions.set(definition.key, Object.freeze({ ...definition }));
  }

  list(): readonly ComponentDefinition[] { return [...this.definitions.values()]; }
  get(key: string): ComponentDefinition | undefined { return this.definitions.get(key); }
  create(key: string): PageNode {
    const definition = this.get(key);
    if (!definition) throw new Error(`Unknown component: ${key}`);
    const node = definition.create();
    if (!componentCapability(node.type)) throw new Error('Component factory uses an unsupported node type');
    return node;
  }
}
