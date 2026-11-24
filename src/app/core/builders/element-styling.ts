export type ElementStyle = Record<string, string>;
export const styleGroups = [
  {
    title: 'Layout', fields: [
      { key: 'display', label: 'Display', options: ['block', 'inline-block', 'flex', 'grid'] },
      { key: 'text-align', label: 'Alignment', options: ['left', 'center', 'right', 'justify'] },
      ...['width', 'height', 'min-width', 'min-height', 'max-width', 'max-height'].map(key => ({ key, label: key.replaceAll('-', ' ') })),
      { key: 'position', label: 'Position', options: ['static', 'relative', 'absolute'] },
      { key: 'container-type', label: 'Container sizing', options: ['normal', 'inline-size'] },
      ...['left', 'top'].map(key => ({ key, label: key })),
      { key: 'aspect-ratio', label: 'Aspect ratio' },
      { key: 'grid-column', label: 'Column span', options: ['auto', 'span 2', 'span 3', 'span 4', 'span 6', '1 / -1'] },
      { key: 'grid-template-columns', label: 'Grid columns', options: ['1fr', '1fr 1fr', '1fr 1fr 1fr', '1fr 1fr 1fr 1fr'] },
      ...['padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'gap'].map(key => ({ key, label: key.replaceAll('-', ' ') }))
    ]
  },
  {
    title: 'Text', fields: [
      { key: 'font-family', label: 'Font', options: ['inherit', 'Arial, sans-serif', 'Georgia, serif', 'monospace', 'Inter, system-ui, sans-serif'] },
      { key: 'font-weight', label: 'Weight', options: ['inherit', '400', '500', '600', '700', '800'] },
      { key: 'font-size', label: 'Size' }, { key: 'line-height', label: 'Line height' }, { key: 'letter-spacing', label: 'Letter spacing' },
      { key: 'color', label: 'Text color' },
      { key: 'text-transform', label: 'Caps', options: ['none', 'uppercase', 'lowercase', 'capitalize'] },
      { key: 'text-decoration', label: 'Decoration', options: ['none', 'underline', 'line-through', 'overline'] },
      { key: 'font-style', label: 'Italic', options: ['normal', 'italic'] }
    ]
  },
  {
    title: 'Fill & Border', fields: [
      { key: 'background-color', label: 'Fill color' }, { key: 'border-color', label: 'Border color' },
      { key: 'border-style', label: 'Border style', options: ['none', 'solid', 'dashed', 'dotted', 'double'] },
      { key: 'border-width', label: 'Border width' }, { key: 'border-radius', label: 'Corner radius' },
      { key: 'opacity', label: 'Opacity (0–1)' },
      { key: 'object-fit', label: 'Image fit', options: ['contain', 'cover', 'fill', 'none', 'scale-down'] }
    ]
  }
] as const;
const allowed = new Set(styleGroups.flatMap(group => group.fields.map(field => field.key)));
function safeValueForProperty(key: string, value: string): boolean {
  if (key === 'position') return ['static', 'relative', 'absolute'].includes(value);
  if (key === 'container-type') return ['normal', 'inline-size'].includes(value);
  if (key === 'left' || key === 'top') return /^(?:auto|-?\d+(?:\.\d+)?(?:px|%|rem|em|vw|vh)?)$/.test(value);
  if (key === 'aspect-ratio') return /^(?:auto|\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?)$/.test(value);
  return /^[a-zA-Z0-9#.,% /_-]+$/.test(value) && !/url|expression|javascript|important/i.test(value);
}
export function sanitizeElementStyle(value: unknown): ElementStyle {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key, value]) => allowed.has(key) && typeof value === 'string'
    && value.length <= 100 && safeValueForProperty(key, value)));
}
export function fieldStyleClass(key: string): string { return `ant-field-${Array.from(key).map(char => char.codePointAt(0)!.toString(16)).join('-')}`; }
