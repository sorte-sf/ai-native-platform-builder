import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import { BuildersApiService } from './builders-api.service';
import { ComponentDataSourceService, parseSourceRows, sourceForNode } from './component-data-source';

describe('component data sources', () => {
  it('adapts saved bindings and rejects malformed JSON', () => {
    expect(sourceForNode({ id: 'table', type: 'table', objectId: 'customers' })).toEqual({ kind: 'object', objectId: 'customers' });
    expect(sourceForNode({ id: 'table', type: 'table', tableJson: '[]', objectId: 'customers' })).toEqual({ kind: 'json', json: '[]' });
    expect(() => parseSourceRows('{}')).toThrow();
    expect(() => parseSourceRows('[null]')).toThrow();
    expect(() => parseSourceRows(JSON.stringify(Array(201).fill({})))).toThrow();
  });
  it('reads bounded tenant-scoped results and never calls APIs for JSON sources', async () => {
    const api = { queryWidgetRecords: vi.fn(() => of({ items: [{ dataJson: '{"name":"Customer"}' }], total: 51 })) };
    TestBed.configureTestingModule({ providers: [{ provide: BuildersApiService, useValue: api }] });
    const service = TestBed.inject(ComponentDataSourceService);
    expect(await firstValueFrom(service.read({ kind: 'json', json: '[{"name":"Local"}]' }, ''))).toEqual({ rows: [{ name: 'Local' }], total: 1, sampled: false });
    expect(api.queryWidgetRecords).not.toHaveBeenCalled();
    await expect(firstValueFrom(service.read({ kind: 'object', objectId: 'customers' }, ''))).rejects.toThrow('context');
    expect((await firstValueFrom(service.read({ kind: 'object', objectId: 'customers' }, 'tenant'))).sampled).toBe(true);
    expect(api.queryWidgetRecords).toHaveBeenCalledWith('tenant', 'customers');
  });
});
