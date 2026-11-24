import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, of } from 'rxjs';
import { beforeAll, describe, it, expect, vi } from 'vitest';
import { DropdownOptionsService, dropdownConfiguration, staticDropdownOptions } from './dropdown-options.service';
import { loadGatewayConfig } from '../gateway-config';

beforeAll(async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ gatewayApiBaseUrl: 'http://localhost:11000', designerStudioUrl: '/designer-studio-app/' }) })));
  await loadGatewayConfig();
  vi.unstubAllGlobals();
});

describe('Dropdown metadata and API mapping', () => {
  it('keeps IDs separate from names and accepts legacy choices', () => {
    expect(staticDropdownOptions({ options: [{ id: 1, name: 'crm.active' }, 'Legacy'] })).toEqual([
      { value: '1', label: 'crm.active' }, { value: 'Legacy', label: 'Legacy' }
    ]);
    expect(dropdownConfiguration('invalid JSON')).toEqual({});
  });
  it('maps API ID/name responses without translating stored IDs', async () => {
    const get = vi.fn(() => of({ items: [{ id: 7, name: 'crm.active' }] }));
    const injector = Injector.create({ providers: [{ provide: HttpClient, useValue: { get } }] });
    const service = runInInjectionContext(injector, () => new DropdownOptionsService());
    expect(await firstValueFrom(service.load({ source: 'api', api: { path: '/builder/statuses' } }))).toEqual([{ value: '7', label: 'crm.active' }]);
    expect(get).toHaveBeenCalledWith('http://localhost:11000/builder/statuses');
  });
  it('rejects external URLs before making a request', () => {
    const get = vi.fn();
    const injector = Injector.create({ providers: [{ provide: HttpClient, useValue: { get } }] });
    const service = runInInjectionContext(injector, () => new DropdownOptionsService());
    expect(() => service.load({ source: 'api', api: { path: '//external.example/options' } })).toThrow();
    expect(get).not.toHaveBeenCalled();
  });
});
