import type { PageNode } from '@core/builders/page-blocks';
import { createClientId } from '@core/builders/client-id';

export const elementBlocks = [
  { key: 'floating-button', name: 'elements.floatingButton', group: 'elements.common' },
  { key: 'row', name: 'elements.row', group: 'elements.containers' },
  { key: 'horizontal', name: 'elements.horizontal', group: 'elements.containers' },
  { key: 'vertical', name: 'elements.vertical', group: 'elements.containers' },
  { key: 'panel', name: 'elements.panel', group: 'elements.containers' },
  { key: 'collapse', name: 'elements.collapse', group: 'elements.containers' },
  { key: 'tabs', name: 'elements.tabs', group: 'elements.containers' },
  { key: 'stepper', name: 'elements.stepper', group: 'elements.containers' },
  { key: 'text-input', name: 'elements.textInput', group: 'elements.common' },
  { key: 'icon', name: 'elements.icon', group: 'elements.display' },
  { key: 'badge', name: 'elements.badge', group: 'elements.display' },
  { key: 'barcode-reader', name: 'elements.barcodeReader', group: 'elements.display' },
  { key: 'countdown', name: 'elements.countdown', group: 'elements.display' },
  { key: 'countup', name: 'elements.countup', group: 'elements.display' },
  { key: 'qr-renderer', name: 'elements.qrRenderer', group: 'elements.display' },
  { key: 'stopwatch', name: 'elements.stopwatch', group: 'elements.display' },
  { key: 'calendar', name: 'elements.calendar', group: 'elements.display' },
  { key: 'date-time-picker', name: 'elements.dateTimePicker', group: 'elements.display' },
  { key: 'flippable-card', name: 'elements.flippableCard', group: 'elements.display' },
  { key: 'timeline', name: 'elements.timeline', group: 'elements.display' },
  { key: 'tooltip', name: 'elements.tooltip', group: 'elements.display' },
  { key: 'markdown', name: 'elements.markdown', group: 'elements.display' },
  { key: 'thumbnail', name: 'elements.thumbnail', group: 'elements.display' }
];

export function createElementBlock(key: string): PageNode | undefined {
  const node = (type: PageNode['type'], text?: string, children?: PageNode[]): PageNode => ({ id: createClientId(), type, text, children });
  switch (key) {
    case 'row': case 'horizontal': return { ...node('container', undefined, []), styling: { display: 'grid', 'grid-template-columns': '1fr 1fr', gap: '16px' } };
    case 'vertical': return { ...node('container', undefined, []), styling: { display: 'grid', gap: '12px' } };
    case 'panel': return { ...node('container', undefined, []), styling: { 'border-style': 'solid', 'border-width': '1px', 'border-color': '#dce3ea', 'border-radius': '8px', 'padding-top': '16px', 'padding-bottom': '16px', 'padding-left': '16px', 'padding-right': '16px' } };
    case 'collapse': case 'tabs': case 'stepper': return {
      ...node('container', key === 'collapse' ? 'More information' : undefined,
        key === 'collapse' ? [node('text', 'Add content here')] : [node('container', 'First section', [node('text', 'First section content')]), node('container', 'Second section', [node('text', 'Second section content')])]), presentation: key
    };
    // Editable inputs must use BuilderField/ng-forge metadata; do not create an unsaved standalone input.
    case 'text-input': return node('form', 'Input form');
    case 'floating-button': return { ...node('button', '＋'), floatingButton: true, actionType: 'form', styling: { 'background-color': '#1677ff', color: '#ffffff', 'border-radius': '999px', width: '56px', height: '56px' } };
    case 'thumbnail': return { ...node('image', 'Image'), styling: { width: '120px', height: '120px', 'object-fit': 'cover', 'border-radius': '8px' } };
    case 'icon': return node('icon', 'star');
    case 'badge': return node('badge', 'New');
    case 'barcode-reader': return node('barcode-reader', 'Scan barcode');
    case 'countdown': return node('countdown', '60');
    case 'countup': return node('countup', '100');
    case 'qr-renderer': return node('qr-renderer', 'https://antsoft.com.tr');
    case 'stopwatch': return node('stopwatch', 'Stopwatch');
    case 'calendar': return node('calendar', '');
    case 'date-time-picker': return node('date-time-picker', '');
    case 'flippable-card': return node('flippable-card', 'A useful card for highlighting details.');
    case 'timeline': return node('timeline', 'First event\nSecond event\nThird event');
    case 'tooltip': return node('tooltip', 'Additional information');
    case 'markdown': return node('markdown', '# Heading\nYour content here.');
    default: return undefined;
  }
  
}
