import { Injectable, signal } from '@angular/core';

/** Scoped to one rendered page, so previews and applications do not share state. */
@Injectable({ providedIn: 'root' })
export class BlockPaginationService {
  readonly state = signal<Record<string, { page: number; pageSize: number; total: number }>>({});

  configure(id: string, total: number, pageSize: number): void {
    this.state.update(state => ({ ...state, [id]: { total, pageSize, page: Math.min(state[id]?.page ?? 1, Math.max(1, Math.ceil(total / pageSize))) } }));
  }
  move(id: string, offset: number): void {
    this.state.update(state => {
      const current = state[id]; if (!current) return state;
      return { ...state, [id]: { ...current, page: Math.max(1, Math.min(current.page + offset, Math.max(1, Math.ceil(current.total / current.pageSize)))) } };
    });
  }
  
}
