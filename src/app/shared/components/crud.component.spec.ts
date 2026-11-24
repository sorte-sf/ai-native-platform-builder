import { TestBed } from '@angular/core/testing';
import '@ng-forge/dynamic-forms-material';
import { describe, it, expect, vi } from 'vitest';
import { CrudComponent } from './crud.component';
import { BuildersApiService } from '../../core/builders/builders-api.service';
import { of, Subject } from 'rxjs';

describe('draft CRUD sandbox', () => {
  it('cancels stale loads and returns to the last available page after deletion', async () => {
    const first = new Subject<{ items: never[]; total: number }>();
    const query = vi.fn().mockReturnValueOnce(first).mockReturnValue(of({ items: [], total: 0 }));
    await TestBed.configureTestingModule({ imports: [CrudComponent], providers: [{ provide: BuildersApiService, useValue: { queryCrudRecords: query, recordCapabilities: () => of({ read: true, create: false, update: false, delete: false }) } }] })
      .overrideComponent(CrudComponent, { set: { template: '', imports: [] } }).compileComponents();
    const fixture = TestBed.createComponent(CrudComponent);
    fixture.componentRef.setInput('tenantId', 'tenant');
    fixture.componentRef.setInput('node', { id: 'crud', type: 'crud', objectId: 'customers' });
    fixture.componentRef.setInput('definition', { objectId: 'customers', fields: [] });
    fixture.detectChanges();
    expect(first.observed).toBe(true);
    expect(fixture.componentInstance.actionEnabled('view')).toBe(true);
    expect(fixture.componentInstance.actionEnabled('edit')).toBe(false);
    fixture.componentInstance.reload();
    expect(first.observed).toBe(false);
    fixture.detectChanges();
    fixture.componentInstance.page.set(2);
    fixture.detectChanges();
    fixture.detectChanges();
    expect(fixture.componentInstance.page()).toBe(1);
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(query).toHaveBeenLastCalledWith('tenant', 'customers', 1);
    fixture.destroy();
  });
  it('creates, edits and deletes temporary records without calling record APIs', async () => {
    const api = { queryCrudRecords: vi.fn(), deleteRecord: vi.fn(), updateRecord: vi.fn(), createRecord: vi.fn() };
    await TestBed.configureTestingModule({ imports: [CrudComponent], providers: [{ provide: BuildersApiService, useValue: api }] })
      .overrideComponent(CrudComponent, { set: { template: '', imports: [] } }).compileComponents();
    const fixture = TestBed.createComponent(CrudComponent);
    fixture.componentRef.setInput('preview', true);
    fixture.componentRef.setInput('tenantId', 'tenant');
    fixture.componentRef.setInput('node', { id: 'crud', type: 'crud', objectId: 'customers' });
    fixture.componentRef.setInput('definition', { objectId: 'customers', fields: [] });
    fixture.detectChanges();
    const component = fixture.componentInstance;
    fixture.componentRef.setInput('definition', { objectId: 'customers', fields: [{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }] });
    fixture.componentRef.setInput('node', { id: 'crud', type: 'crud', objectId: 'customers', tableColumns: [
      { field: 'email', title: 'Contact email', width: 240, align: 'right' },
      { field: 'name', title: 'Name', hidden: true }, { field: 'invalid', title: 'Invalid' }
    ] });
    fixture.detectChanges();
    expect(component.columns()).toEqual(['email']);
    expect(component.label('email')).toBe('Contact email');
    expect(component.columnSettings()[0].width).toBe(240);
    fixture.componentRef.setInput('node', { ...component.node(), crudActions: { create: false, edit: false, delete: false } });
    fixture.detectChanges();
    component.create();
    expect(component.mode()).toBe('list');
    expect(component.actionEnabled('delete')).toBe(false);
    fixture.componentRef.setInput('node', { ...component.node(), crudActions: undefined });
    fixture.detectChanges();
    const record = { id: 'temporary', tenantId: 'tenant', objectId: 'customers', dataJson: '{"name":"Test"}', version: 1 };
    component.saved(record);
    expect(component.rows()).toEqual([record]);
    component.saved({ ...record, dataJson: '{"name":"Changed"}', version: 2 });
    expect(component.rows()).toHaveLength(1);
    expect(component.value(component.rows()[0], 'name')).toBe('Changed');
    component.pendingDelete.set(component.rows()[0]);
    component.deleteSelected();
    expect(component.rows()).toEqual([]);
    expect(component.total()).toBe(0);
    component.reload();
    for (const method of Object.values(api)) expect(method).not.toHaveBeenCalled();
    component.saved(record);
    component.open('edit', record);
    component.pendingDelete.set(record);
    fixture.componentRef.setInput('tenantId', 'other-tenant');
    fixture.detectChanges();
    expect(component.rows()).toEqual([]);
    expect(component.selected()).toBeNull();
    expect(component.pendingDelete()).toBeNull();
    expect(component.mode()).toBe('list');
  });
  it('opens the model-bound create and edit forms in the list dialog when permitted', async () => {
    await TestBed.configureTestingModule({ imports: [CrudComponent], providers: [{ provide: BuildersApiService, useValue: {
      queryCrudRecords: () => of({ items: [], total: 0 }),
      recordCapabilities: () => of({ read: true, create: true, update: true, delete: false })
    } }] }).overrideComponent(CrudComponent, { set: { template: '', imports: [] } }).compileComponents();
    const fixture = TestBed.createComponent(CrudComponent);
    fixture.componentRef.setInput('tenantId', 'tenant');
    fixture.componentRef.setInput('node', { id: 'crud', type: 'crud', objectId: 'customers' });
    fixture.componentRef.setInput('definition', { objectId: 'customers', name: 'Customer', fields: [] });
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.create();
    expect(component.dialogOpen()).toBe(true);
    expect(component.mode()).toBe('create');
    const record = { id: 'customer-1', tenantId: 'tenant', objectId: 'customers', dataJson: '{}', version: 1 };
    component.open('edit', record);
    expect(component.dialogOpen()).toBe(true);
    expect(component.mode()).toBe('edit');
    expect(component.selected()).toEqual(record);
    component.closeDialog();
    expect(component.dialogOpen()).toBe(false);
    fixture.destroy();
  });
});
