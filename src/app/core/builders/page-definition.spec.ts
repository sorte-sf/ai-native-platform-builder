import { describe, expect, it } from 'vitest';
import { parsePageDefinition } from './page-definition';
describe('shared page definition loader', () => {
  it('accepts chart variants and rejects arbitrary chart types', () => {
    for (const chartKind of ['bar', 'line', 'area', 'stacked-column', 'pie', 'doughnut', 'funnel'])
      expect(parsePageDefinition(JSON.stringify({ schemaVersion: 1, children: [{ id: 'chart', type: 'chart', chartKind }] })).children[0].chartKind).toBe(chartKind);
    expect(() => parsePageDefinition(JSON.stringify({ schemaVersion: 1, children: [{ id: 'chart', type: 'chart', chartKind: 'script' }] }))).toThrow();
  });
  it('validates declarative CRUD action flags', () => {
    const definition = (type: string, crudActions: unknown) => JSON.stringify({ schemaVersion: 1, children: [{ id: 'node', type, crudActions }] });
    expect(parsePageDefinition(definition('crud', { delete: false })).children[0].crudActions?.delete).toBe(false);
    expect(() => parsePageDefinition(definition('table', { delete: false }))).toThrow();
    expect(() => parsePageDefinition(definition('crud', { delete: 'false' }))).toThrow();
    expect(() => parsePageDefinition(definition('crud', { execute: true }))).toThrow();
  });
  it('preserves existing nested metadata', () => {
    const definition = { schemaVersion: 1, children: [{ id: 'root', type: 'container', children: [{ id: 'form', type: 'form', objectId: 'customers', formId: 'entry' }] }] };
    expect(parsePageDefinition(JSON.stringify(definition))).toEqual(definition);
  });
  it('accepts responsive navigation placement and a safe company logo', () => {
    const nav = { id: 'nav', type: 'container', text: 'Side navigation', navigationPlacement: 'right', navigationLogoUrl: 'https://example.com/logo.svg', children: [
      { id: 'main', type: 'container', presentation: 'collapse', text: 'Main', children: [{ id: 'customers', type: 'button', text: 'Customers', actionType: 'page', actionValue: 'customers' }] }
    ] };
    expect(parsePageDefinition(JSON.stringify({ schemaVersion: 1, children: [nav] })).children[0]).toMatchObject(nav);
    for (const navigationPlacement of ['bottom', 'center']) {
      expect(() => parsePageDefinition(JSON.stringify({ schemaVersion: 1, children: [{ ...nav, navigationPlacement }] }))).toThrow();
    }
    expect(() => parsePageDefinition(JSON.stringify({ schemaVersion: 1, children: [{ ...nav, navigationLogoUrl: 'javascript:alert(1)' }] }))).toThrow();
  });
  it('preserves legacy unsafe URLs in drafts while leaving safety to the action resolver and publish validator', () => {
    const make = (actionType: string, actionValue: string) => JSON.stringify({ schemaVersion: 1, children: [{ id: 'button', type: 'button', actionType, actionValue }] });
    expect(parsePageDefinition(make('url', 'https://example.com/help')).children[0].actionValue).toBe('https://example.com/help');
    expect(parsePageDefinition(make('url', 'http://example.com/help')).children[0].actionValue).toBe('http://example.com/help');
    expect(parsePageDefinition(make('url', 'javascript:alert(1)')).children[0].actionValue).toBe('javascript:alert(1)');
    expect(() => parsePageDefinition(make('script', 'alert(1)'))).toThrow();
  });
  it('allows form-dialog actions only on floating buttons', () => {
    const make = (floatingButton: boolean) => JSON.stringify({ schemaVersion: 1, children: [{
      id: 'button', type: 'button', floatingButton, actionType: 'form'
    }] });
    expect(parsePageDefinition(make(true)).children[0]).toMatchObject({ floatingButton: true, actionType: 'form' });
    expect(() => parsePageDefinition(make(false))).toThrow('Invalid button action type');
  });
  it('rejects unsupported versions, types and duplicate IDs', () => {
    for (const value of [{ schemaVersion: 2, children: [] }, { schemaVersion: 1, children: [{ id: 'code', type: 'script' }] }, { schemaVersion: 1, children: [{ id: 'same', type: 'text' }, { id: 'same', type: 'text' }] }])
      expect(() => parsePageDefinition(JSON.stringify(value))).toThrow();
  });
  it('rejects non-container children and excessive tree depth', () => {
    expect(() => parsePageDefinition('{"schemaVersion":1,"children":[{"id":"text","type":"text","children":[{"id":"child","type":"text"}]}]}')).toThrow();
    let node: unknown = { id: 'leaf', type: 'text' };
    for (let i = 0; i < 13; i++) node = { id: `container-${i}`, type: 'container', children: [node] };
    expect(() => parsePageDefinition(JSON.stringify({ schemaVersion: 1, children: [node] }))).toThrow();
  });
});
