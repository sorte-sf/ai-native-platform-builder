import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { describe, it, expect } from 'vitest';
import { DataGridComponent } from '../../shared/data-grid/data-grid.component';
describe('existing grid designer integration', () => {
  it('uses configured paging, search and column filters', async () => {
    await TestBed.configureTestingModule({ imports: [DataGridComponent], providers: [{ provide: TranslocoService, useValue: { translate: (key: string) => key } }] })
      .overrideComponent(DataGridComponent, { set: { template: '', imports: [] } }).compileComponents();
    const fixture = TestBed.createComponent(DataGridComponent);
    fixture.componentRef.setInput('pageSizes', [2]);
    fixture.componentRef.setInput('columns', [{ field: 'name', caption: 'Name' }]);
    fixture.componentRef.setInput('rows', [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Carol' }]);
    fixture.detectChanges();
    const grid = fixture.componentInstance;
    expect(grid.pageSize()).toBe(2); expect(grid.pagedRows()).toHaveLength(2); expect(grid.pageCount()).toBe(2);
    grid.search.set('Bob'); expect(grid.filteredRows()).toEqual([{ name: 'Bob' }]);
    grid.search.set(''); grid.columnFilters.set({ name: { operator: 'startsWith', value: 'A' } });
    expect(grid.filteredRows()).toEqual([{ name: 'Alice' }]);
    fixture.destroy();
  });
});
