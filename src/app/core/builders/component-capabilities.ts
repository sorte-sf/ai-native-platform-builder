import manifest from './page-components.v1.json';

/** Build-time contract, shared with the backend; not an executable plugin loader. */
const capabilities = new Map(manifest.components.map(component => [component.type, Object.freeze(component)]));
if (manifest.schemaVersion !== 1 || capabilities.size !== manifest.components.length)
  throw new Error('Invalid component capability manifest');

export const pageSchemaVersion = manifest.schemaVersion;
export const componentPropertyDefinitions = manifest.properties;
export function componentCapability(type: string): Readonly<{ type: string; children: boolean; properties: string[]; binding?: string }> | undefined {
  return capabilities.get(type);
}
export function bindingForComponent(type: string): 'form' | 'object' | 'object-or-json' | null {
  const binding = componentCapability(type)?.binding;
  if (binding === undefined) return null;
  if (binding !== 'form' && binding !== 'object' && binding !== 'object-or-json') throw new Error('Unsupported component binding');
  return binding;
}
