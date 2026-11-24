import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { getGatewayApiBaseUrl } from '../gateway-config';

export interface DropdownOption { value: string; label: string; }
export interface DropdownConfiguration {
  source?: 'static' | 'api';
  options?: Array<string | { value?: string | number; id?: string | number; label?: string; name?: string }>;
  api?: { path?: string; idField?: string; nameField?: string };
  placeholder?: string;
}

export function dropdownConfiguration(json?: string | null): DropdownConfiguration {
  if (!json) return {};
  try { return JSON.parse(json) as DropdownConfiguration; } catch { return {}; }
}

export function staticDropdownOptions(config: DropdownConfiguration): DropdownOption[] {
  return (config.options ?? []).map(option => typeof option === 'string'
    ? { value: option, label: option }
    : { value: String(option.value ?? option.id ?? ''), label: option.label ?? option.name ?? '' })
    .filter(option => option.value && option.label);
}

@Injectable({ providedIn: 'root' })
export class DropdownOptionsService {
  private readonly http = inject(HttpClient);

  load(config: DropdownConfiguration): Observable<DropdownOption[]> {
    if (config.source !== 'api') return of(staticDropdownOptions(config));
    const path = config.api?.path?.trim() ?? '';
    const idField = config.api?.idField?.trim() || 'id';
    const nameField = config.api?.nameField?.trim() || 'name';

    const gateway = new URL(getGatewayApiBaseUrl().replace(/\/builder\/?$/, ''));

    if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || path.includes('#') ||
        !/^[A-Za-z_][A-Za-z0-9_.]*$/.test(idField) || !/^[A-Za-z_][A-Za-z0-9_.]*$/.test(nameField))
      throw new Error('Use a gateway-relative API path and valid ID/name property names.');
      
    const url = new URL(path, gateway);
    if (url.origin !== gateway.origin || url.pathname.split('/').includes('..'))
      throw new Error('Dropdown API must use the configured gateway.');
    return this.http.get<unknown>(url.toString()).pipe(map(response => {
      const rows = Array.isArray(response) ? response : this.rows(response);
      if (!rows) throw new Error('Dropdown API must return an array or an items/data/results array.');
      return rows.map(row => {
        const id = this.property(row, idField);
        const name = this.property(row, nameField);
        return { value: String(id ?? ''), label: String(name ?? '') };
      }).filter(option => option.value && option.label);
    }));
  }

  private rows(value: unknown): unknown[] | null {
    if (!value || typeof value !== 'object') return null;
    const record = value as Record<string, unknown>;
    for (const key of ['items', 'data', 'results']) if (Array.isArray(record[key])) return record[key] as unknown[];
    return null;
  }

  private property(value: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => current && typeof current === 'object'
      ? (current as Record<string, unknown>)[key] : undefined, value);
  }
}
