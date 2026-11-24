import { Injectable, inject } from '@angular/core';
import { Observable, defer, map, of } from 'rxjs';
import { BuildersApiService } from './builders-api.service';
import type { PageNode } from './page-blocks';

export type ComponentDataSource = { kind: 'object'; objectId: string } | { kind: 'json'; json: string };
export interface ComponentDataResult { rows: Record<string, unknown>[]; total: number; sampled: boolean; }

/** Compatibility adapter: existing persisted bindings remain the source of truth. */
export function sourceForNode(node: PageNode): ComponentDataSource | null {
  if (node.tableJson) return { kind: 'json', json: node.tableJson };
  return node.objectId ? { kind: 'object', objectId: node.objectId } : null;
}
export function parseSourceRows(json: string): Record<string, unknown>[] {
  const value: unknown = JSON.parse(json);
  if (!Array.isArray(value) || value.length > 200 || value.some(row => !row || typeof row !== 'object' || Array.isArray(row)))
    throw new Error('Invalid component JSON source');
  return value as Record<string, unknown>[];
}

@Injectable({ providedIn: 'root' })
export class ComponentDataSourceService {
  private readonly api = inject(BuildersApiService);
  read(source: ComponentDataSource, tenantId: string): Observable<ComponentDataResult> {
    return defer(() => {
      if (source.kind === 'json') {
        const rows = parseSourceRows(source.json);
        return of({ rows, total: rows.length, sampled: false });
      }
      if (!tenantId || !source.objectId) throw new Error('Data source context is required');
      // Authorization and tenant filtering stay in the existing backend query path.
      return this.api.queryWidgetRecords(tenantId, source.objectId).pipe(map(result => {
        const rows = result.items.flatMap(record => {
          try { return parseSourceRows(`[${record.dataJson}]`); } catch { return []; }
        });
        return { rows, total: result.total, sampled: result.total > result.items.length };
      }));
    });
  }
}
