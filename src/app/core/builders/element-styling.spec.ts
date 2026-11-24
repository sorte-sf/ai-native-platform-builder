import { describe, it, expect } from 'vitest';
import { fieldStyleClass, sanitizeElementStyle, styleGroups } from './element-styling';

describe('Selected element styling', () => {
  it('preserves layout, typography and fill metadata through JSON', () => {
    const styling = { width: '50%', 'padding-top': '16px', 'font-size': '18px', color: '#334155', 'border-radius': '8px' };
    expect(sanitizeElementStyle(JSON.parse(JSON.stringify({ styling })).styling)).toEqual(styling);
  });
  it('rejects unsafe values and unsupported properties', () => {
    expect(sanitizeElementStyle({ color: 'red;display:none', 'background-color': 'url(https://example.com)', position: 'fixed', opacity: '0.5' })).toEqual({ opacity: '0.5' });
  });
  it('preserves safe positional styles used by imported responsive artboards', () => {
    const styling = { position: 'relative', 'container-type': 'inline-size', left: '12.5%', top: '8%', width: '100%', height: '100%', 'aspect-ratio': '1440 / 900', 'font-size': '0.9722cqw' };
    expect(sanitizeElementStyle(JSON.parse(JSON.stringify({ styling })).styling)).toEqual(styling);
    expect(sanitizeElementStyle({ position: 'fixed', left: '0;display:none', top: 'url(https://example.test)' })).toEqual({});
  });
  it('produces collision-free CSS classes for field keys', () => {
    expect(fieldStyleClass('a-b')).not.toBe(fieldStyleClass('a_b'));
    expect(fieldStyleClass('name')).toMatch(/^ant-field-[a-f0-9-]+$/);
    expect(styleGroups.flatMap(group => group.fields).length).toBeGreaterThan(30);
  });
});
