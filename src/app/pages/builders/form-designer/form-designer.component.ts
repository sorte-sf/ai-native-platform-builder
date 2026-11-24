import { Component, ElementRef, Input, OnInit, computed, effect, untracked, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';

import { PlatformFormService } from '@core/plugins/platform-form.service';
import { DesignerField } from '@app/core/builders/interfaces/designer-field';
import { IDataTypeEnum } from '@core/enums/data-type-enum';
import { BuilderFieldType, fromBuilderFieldType, toBuilderFieldType } from '@core/builders/designer-data-type.adapter';
import { BuildersApiService } from '@app/core/builders/builders-api.service';
import { DesignerApplication } from '@app/core/builders/interfaces/designer-application';
import { DesignerObject } from '@app/core/builders/interfaces/designer-object';
import { AuthService } from '@core/services/auth/auth.service';
import { FormDesignerDraft, FormDesignerSeed } from '@core/builders/interfaces/form-designer-draft';
import { TranslocoModule, TranslocoPipe } from '@jsverse/transloco';
import { DropdownOption, DropdownOptionsService, dropdownConfiguration, staticDropdownOptions } from '@core/builders/dropdown-options.service';
import { PlatformDynamicFormComponent } from '@shared/dynamic-form/platform-dynamic-form.component';
import { BrandColorPickerComponent } from '@shared/components/brand-color-picker.component';
import { ConfirmationService } from '@shared/confirmation/confirmation.service';
import { ElementStyle, sanitizeElementStyle, styleGroups } from '@core/builders/element-styling';
import { createClientId } from '@core/builders/client-id';

type GridColumns = 2 | 3 | 4 | 6 | 12;
interface FormAppearance {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  fontSize: number;
  gridColumns: GridColumns;
}
const defaultAppearance: FormAppearance = {
  primaryColor: '#5e4fa2',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 14,
  gridColumns: 2
};

interface CanvasField extends Omit<DesignerField, 'type'> { localId: string; type: IDataTypeEnum; backendType?: BuilderFieldType; }

const palette: { type: IDataTypeEnum; label: string; icon: string; group: string }[] = [
  { type: IDataTypeEnum.Text, label: 'Text', icon: 'T', group: 'Inputs' },
  { type: IDataTypeEnum.TextArea, label: 'Long text', icon: '☷', group: 'Inputs' },
  { type: IDataTypeEnum.Email, label: 'Email', icon: '@', group: 'Inputs' },
  { type: IDataTypeEnum.Number, label: 'Number', icon: '#', group: 'Inputs' },
  { type: IDataTypeEnum.DateOnly, label: 'Date', icon: '▦', group: 'Inputs' },
  { type: IDataTypeEnum.DateTime, label: 'Date & time', icon: '◷', group: 'Inputs' },
  { type: IDataTypeEnum.Phone, label: 'Phone', icon: '☎', group: 'Inputs' },
  { type: IDataTypeEnum.Url, label: 'URL', icon: '↗', group: 'Inputs' },
  { type: IDataTypeEnum.Boolean, label: 'Checkbox', icon: '☑', group: 'Choices' },
  { type: IDataTypeEnum.MultipleSelection, label: 'Dropdown', icon: '⌄', group: 'Choices' },
  { type: IDataTypeEnum.Image, label: 'Image', icon: '▧', group: 'Display' }
];

@Component({
  selector: 'ant-form-designer',
  standalone: true,
  host: { '[class.embedded]': 'embedded' },
  templateUrl: './form-designer.component.html',
  styleUrl: './form-designer.component.scss',
  imports: [
    CommonModule,
    DragDropModule,
    TranslocoModule,
    PlatformDynamicFormComponent,
    BrandColorPickerComponent
  ],

})
export class FormDesignerComponent implements OnInit {
  @Input() embedded = false;
  @Input() set seed(value: FormDesignerSeed | null) {
    if (!value) return;
    this.objectId.set(null);
    this.formId.set(null);
    this.objectKey.set(value.objectKey);
    this.objectName.set(value.objectName);
    this.formKey.set(value.formKey);
    this.formName.set(value.formName);
    this.fields.set(value.fields.map((field, index) => ({
      ...field, id: undefined,
      key: field.key?.trim() || `field_${index + 1}`, label: field.label?.trim() || `Field ${index + 1}`,
      sortOrder: index, required: field.required ?? false, searchable: field.searchable ?? false,
      readOnly: field.readOnly ?? false, configurationJson: field.configurationJson ?? null,
      type: this.localType(field), backendType: field.type, localId: createClientId()
    })));
    this.appearance.set({ ...defaultAppearance });
    this.selectedId.set(null);
    this.dirty.set(false);
  }
  readonly dataTypes = IDataTypeEnum;
  private readonly api = inject(BuildersApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly forms = inject(PlatformFormService);
  private readonly auth = inject(AuthService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly dropdowns = inject(DropdownOptionsService);
  readonly apiOptions = signal<Record<string, DropdownOption[]>>({});
  readonly application = signal<DesignerApplication | null>(null);
  readonly fields = signal<CanvasField[]>([]);
  readonly previewConfig = computed(() => this.forms.fromBuilderFields(this.fields().map(field => ({ ...field, type: this.apiType(field) }))));
  readonly appearance = signal<FormAppearance>({ ...defaultAppearance });
  readonly selectedId = signal<string | null>(null);
  readonly selectedField = computed(() => this.fields().find(field => field.localId === this.selectedId()) ?? null);
  readonly search = signal('');
  readonly items = computed(() => palette.filter(item => item.label.toLowerCase().includes(this.search().toLowerCase())));
  readonly preview = signal(false);
  readonly viewport = signal<'desktop' | 'tablet' | 'mobile'>('desktop');
  readonly inspectorTab = signal<'properties' | 'styling'>('properties');
  readonly styleGroups = styleGroups;

  fieldStyle(field: CanvasField): ElementStyle {
    try { return sanitizeElementStyle(JSON.parse(field.configurationJson ?? '{}').styling); } catch { return {}; }
  }

  styleValue(key: string): string { const field = this.selectedField(); return field ? this.fieldStyle(field)[key] ?? '' : ''; }

  textStyle(field: CanvasField): ElementStyle {
    return Object.fromEntries(Object.entries(this.fieldStyle(field)).filter(([key]) => key.startsWith('font-') || key.startsWith('text-') || ['color', 'letter-spacing', 'line-height'].includes(key)));
  }
  setElementStyle(key: string, value: string): void {
    const field = this.selectedField(); if (!field || this.readOnly) return;
    const styling = this.fieldStyle(field);
    if (value.trim()) styling[key] = value.trim(); else delete styling[key];
    const clean = sanitizeElementStyle(styling);
    if (value.trim() && !CSS.supports(key, value.trim())) { this.error.set('This CSS value is invalid for the selected styling property.'); return; }
    if (value.trim() && clean[key] !== value.trim()) { this.error.set('Use a CSS value such as 16px, 50%, auto, or #334155.'); return; }
    this.setConfigValue('styling', clean); this.error.set('');
  }

  resetElementStyle(): void { if (!this.readOnly) this.setConfigValue('styling', {}); }

  fieldPermissionRoles(field: CanvasField, access: 'readRoles' | 'writeRoles'): string {
    try {
      const config = JSON.parse(field.configurationJson ?? '{}') as Record<string, any>;
      const roles = config['permissions']?.[access];
      return Array.isArray(roles) ? roles.filter((role: unknown): role is string => typeof role === 'string').join(', ') : '';
    } catch { return ''; }
  }

  setFieldPermissionRoles(access: 'readRoles' | 'writeRoles', event: Event): void {
    const field = this.selectedField(); if (!field || this.readOnly) return;
    let config: Record<string, any> = {};
    try { config = JSON.parse(field.configurationJson ?? '{}') as Record<string, any>; } catch { }
    const permissions = { ...(config['permissions'] ?? {}) } as Record<string, string[]>;
    const roles = [...new Set(this.inputValue(event).split(',').map(role => role.trim()).filter(Boolean))];
    if (roles.length) permissions[access] = roles; else delete permissions[access];
    if (Object.keys(permissions).length) config['permissions'] = permissions; else delete config['permissions'];
    this.updateField({ configurationJson: Object.keys(config).length ? JSON.stringify(config) : null });
  }

  private setConfigValue(key: string, value: unknown): void {
    const field = this.selectedField(); if (!field) return;
    let config: Record<string, unknown> = {};
    try { config = JSON.parse(field.configurationJson ?? '{}'); } catch { }
    this.updateField({ configurationJson: JSON.stringify({ ...config, [key]: value }) });
  }

  readonly history = signal<string[]>([]);
  readonly historyIndex = signal(-1);
  readonly canUndo = computed(() => this.historyIndex() > 0);
  readonly canRedo = computed(() => this.historyIndex() < this.history().length - 1);
  undo(): void { this.restoreHistory(this.historyIndex() - 1); }
  redo(): void { this.restoreHistory(this.historyIndex() + 1); }

  private restoreHistory(index: number): void {
    if (this.readOnly || this.saving() || index < 0 || index >= this.history().length) return;
    const state = JSON.parse(this.history()[index]) as { fields: CanvasField[]; appearance: FormAppearance; objectName: string; objectKey: string; formName: string; formKey: string };
    this.historyIndex.set(index); this.fields.set(state.fields); this.appearance.set(state.appearance);
    this.objectName.set(state.objectName); this.objectKey.set(state.objectKey); this.formName.set(state.formName); this.formKey.set(state.formKey);
    this.selectedId.set(null); this.dirty.set(true);
  }

  duplicateField(): void {
    const field = this.selectedField();
    if (!field || this.readOnly) return;
    let key = `${field.key}_copy`; let suffix = 2;
    while (this.fields().some(item => item.key === key)) key = `${field.key}_copy_${suffix++}`;
    const copy = { ...field, id: undefined, localId: createClientId(), key, label: `${field.label} copy`, sortOrder: this.fields().length };
    this.fields.update(fields => [...fields, copy]); this.selectedId.set(copy.localId); this.dirty.set(true);
  }

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly dirty = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly objectId = signal<string | null>(null);
  readonly formId = signal<string | null>(null);
  readonly moduleId = signal<string | null>(null);

  async selectModule(id: string): Promise<void> {
    if (this.dirty() && !await this.confirmation.confirm({ title: 'Discard module changes?', message: 'Your current module has unsaved changes. Discard them and switch modules?', confirmText: 'Discard changes', cancelText: 'Keep editing', tone: 'warning' })) return;
    const module = this.application()?.modules?.find(item => item.id === id);
    if (!module) return;
    this.dirty.set(false);
    this.moduleId.set(id);
    if (module.design) this.openObject(module.design);
    else { this.newObject(); this.objectKey.set(module.key.replace(/-/g, '_')); this.objectName.set(module.name); this.formKey.set(`${module.key.replace(/-/g, '_')}_form`); this.formName.set(`${module.name} form`); }
  }

  readonly objectName = signal('New data object');
  readonly objectKey = signal('new_data_object');
  readonly formName = signal('Main form');
  readonly formKey = signal('main_form');
  readonly tenantId: string;
  readonly applicationId: string;

  constructor() {
    effect(() => {
      if (this.loading()) return;
      const snapshot = JSON.stringify({
        fields: this.fields(),
        appearance: this.appearance(),
        objectName: this.objectName(),
        objectKey: this.objectKey(),
        formName: this.formName(),
        formKey: this.formKey()
      });
      untracked(() => {
        if (this.history()[this.historyIndex()] === snapshot) return;
        const entries = [...this.history().slice(0, this.historyIndex() + 1), snapshot].slice(-100);
        this.history.set(entries); this.historyIndex.set(entries.length - 1);
      });
    });
    this.applicationId = this.route.snapshot.paramMap.get('id') ?? '';
    this.tenantId = this.route.snapshot.queryParamMap.get('tenantId')
      ?? this.auth.tenantId() ?? '';
  }

  ngOnInit(): void {
    if (this.embedded) {
      this.application.set({ id: '', tenantId: '', key: '', name: '', status: 'Draft', objects: [] });
      this.loading.set(false);
      return;
    }
    if (!this.applicationId || !this.tenantId) {
      this.error.set('Application or tenant is missing. Open the designer from an application card.');
      this.loading.set(false);
      return;
    }
    this.load();
  }

  get readOnly(): boolean {
    if (this.embedded) return false;
    return this.application()?.status !== 'Draft' || !(this.auth.hasAnyRole(['SystemAdmin', 'TenantAdmin']) ||
      !!this.auth.userId() && this.application()?.createdByUserId === this.auth.userId());
  }

  private localType(field: DesignerField): IDataTypeEnum {
    if (field.type === 'File') {
      try { if ((JSON.parse(field.configurationJson ?? '{}') as { kind?: string }).kind === 'image') return IDataTypeEnum.Image; }
      catch { /* Legacy configuration is treated as a regular file field. */ }
    }
    return fromBuilderFieldType(field.type);
  }

  load(): void {
    this.loading.set(true);
    this.api.designerApplication(this.tenantId, this.applicationId).subscribe({
      next: application => {
        this.application.set(application);
        if (this.route.snapshot.queryParamMap.get('pageId')) {
          const objectId = this.route.snapshot.queryParamMap.get('objectId');
          const target = application.objects.find(obj => obj.id === objectId);
          if (target) this.openObject(target);
          else {
            this.newObject();
            const key = `page_${(this.route.snapshot.queryParamMap.get('pageNodeId') || this.route.snapshot.queryParamMap.get('pageId')!).replaceAll('-', '_')}`;
            this.objectKey.set(key); this.formKey.set(`${key}_form`);
          }
        }
        else if (this.route.snapshot.queryParamMap.get('objectId') && application.objects.some(object => object.id === this.route.snapshot.queryParamMap.get('objectId'))) this.openObject(application.objects.find(object => object.id === this.route.snapshot.queryParamMap.get('objectId'))!);
        else if (application.modules?.length) this.selectModule(this.route.snapshot.queryParamMap.get('moduleId') ?? application.modules[0].id);
        else if (application.objects.length) this.openObject(application.objects[0]);
        else this.newObject();
        this.loading.set(false);
      },
      error: response => {
        this.error.set(response?.error?.detail ?? (response?.status === 403
          ? 'Your account does not have access to this tenant’s application.'
          : response?.status === 404 ? 'This application was not found for the selected tenant.'
            : 'Could not load this application. Check your access and try again.'));
        this.loading.set(false);
      }
    });
  }

  async openObject(object: DesignerObject): Promise<void> {
    if (this.dirty() && !await this.confirmation.confirm({ title: 'Discard form changes?', message: 'This form has unsaved changes. Discard them and open another form?', confirmText: 'Discard changes', cancelText: 'Keep editing', tone: 'warning' })) return;
    this.history.set([]); this.historyIndex.set(-1);
    this.objectId.set(object.id);
    this.formId.set(object.formId ?? null);
    this.objectName.set(object.name);
    this.objectKey.set(object.key);
    this.formName.set(object.formName ?? `${object.name} form`);
    this.formKey.set(object.formKey ?? `${object.key}_form`);
    this.fields.set(object.fields.map(field => ({ ...field, type: this.localType(field), backendType: field.type, localId: field.id ?? createClientId() })));
    try {
      const layout = JSON.parse(object.layoutJson ?? '{}') as { designerAppearance?: Partial<FormAppearance> };
      this.appearance.set({ ...defaultAppearance, ...layout.designerAppearance });
    } catch { this.appearance.set({ ...defaultAppearance }); }
    this.selectedId.set(null);
    this.dirty.set(false);
    this.notice.set('');
  }

  async newObject(): Promise<void> {
    if (this.dirty() && !await this.confirmation.confirm({ title: 'Discard form changes?', message: 'This form has unsaved changes. Discard them and create a new form?', confirmText: 'Discard changes', cancelText: 'Keep editing', tone: 'warning' })) return;
    this.history.set([]); this.historyIndex.set(-1);
    this.objectId.set(null);
    this.formId.set(null);
    this.objectName.set('New data object');
    this.objectKey.set('new_data_object');
    this.formName.set('Main form');
    this.formKey.set('main_form');
    this.fields.set([]);
    this.appearance.set({ ...defaultAppearance });
    this.selectedId.set(null);
    this.dirty.set(false);
    this.notice.set('');
  }

  inputValue(event: Event): string { return (event.target as HTMLInputElement).value; }
  inputChecked(event: Event): boolean { return (event.target as HTMLInputElement).checked; }
  setSearch(event: Event): void { this.search.set(this.inputValue(event)); }
  async selectObject(event: Event): Promise<void> {
    const id = this.inputValue(event);
    const object = this.application()?.objects.find(item => item.id === id);
    if (object) this.openObject(object); else this.newObject();
  }
  setSelectedType(event: Event): void {
    const type = Number(this.inputValue(event)) as IDataTypeEnum;
    if (!palette.some(item => item.type === type)) return;
    const field = this.selectedField();
    if (!field) return;
    this.updateField({
      type, configurationJson: type === IDataTypeEnum.Image
        ? JSON.stringify({ kind: 'image', imageUrl: '' })
        : field.type === IDataTypeEnum.Image ? null : field.configurationJson
    });
  }
  typeName(type: IDataTypeEnum): string { return IDataTypeEnum[type] ?? 'Text'; }
  apiType(field: CanvasField): BuilderFieldType { return toBuilderFieldType(field.type, field.backendType); }
  setObjectName(event: Event): void { this.objectName.set(this.inputValue(event)); this.dirty.set(true); }
  setObjectKey(event: Event): void { this.objectKey.set(this.inputValue(event)); this.dirty.set(true); }
  setFormName(event: Event): void { this.formName.set(this.inputValue(event)); this.dirty.set(true); }
  setFormKey(event: Event): void { this.formKey.set(this.inputValue(event)); this.dirty.set(true); }
  setAppearance<K extends keyof FormAppearance>(key: K, value: FormAppearance[K]): void {
    this.appearance.update(current => ({ ...current, [key]: value }));
    this.dirty.set(true);
  }
  setGridColumns(event: Event): void {
    const columns = Number(this.inputValue(event));
    if ([2, 3, 4, 6].includes(columns)) this.setAppearance('gridColumns', columns as GridColumns);
  }
  setFontSize(event: Event): void { this.setAppearance('fontSize', Number(this.inputValue(event))); }
  setColor(key: 'primaryColor' | 'backgroundColor' | 'textColor', color: string): void { this.setAppearance(key, color); }
  setFontFamily(event: Event): void { this.setAppearance('fontFamily', this.inputValue(event)); }

  addField(type: IDataTypeEnum): void {
    if (this.readOnly) return;
    const definition = palette.find(item => item.type === type)!;
    const base = definition.label.toLowerCase().replace(/\s+/g, '_');
    let key = base;
    let suffix = 2;
    while (this.fields().some(field => field.key.toLowerCase() === key.toLowerCase())) key = `${base}_${suffix++}`;
    const field: CanvasField = {
      localId: createClientId(), key, label: definition.label, type, sortOrder: this.fields().length, required: false, searchable: false, readOnly: false,
      configurationJson: type === IDataTypeEnum.Image ? JSON.stringify({ kind: 'image', imageUrl: '' }) : null
    };
    this.fields.update(fields => [...fields, field]);
    this.selectedId.set(field.localId);
    this.dirty.set(true);
    this.notice.set('');
    if (this.embedded) requestAnimationFrame(() =>
      this.host.nativeElement.querySelector<HTMLElement>('.field-card.selected')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
  }

  dragStart(event: DragEvent, type: IDataTypeEnum): void { event.dataTransfer?.setData('text/plain', String(type)); }
  allowDrop(event: DragEvent): void { event.preventDefault(); }
  dropPalette(event: DragEvent): void {
    event.preventDefault();
    const type = Number(event.dataTransfer?.getData('text/plain')) as IDataTypeEnum;
    if (palette.some(item => item.type === type)) this.addField(type);
  }
  reorder(event: CdkDragDrop<CanvasField[]>): void {
    if (this.readOnly) return;
    this.fields.update(fields => { const copy = [...fields]; moveItemInArray(copy, event.previousIndex, event.currentIndex); return copy; });
    this.dirty.set(true);
  }
  updateField(patch: Partial<CanvasField>): void {
    const selected = this.selectedId();
    this.fields.update(fields => fields.map(field => field.localId === selected
      ? { ...field, ...patch, backendType: patch.type !== undefined && patch.type !== field.type ? undefined : field.backendType }
      : field));
    this.dirty.set(true);
  }
  removeField(): void {
    this.fields.update(fields => fields.filter(field => field.localId !== this.selectedId()));
    this.selectedId.set(null);
    this.dirty.set(true);
  }
  moveField(offset: number): void {
    const fields = [...this.fields()];
    const current = fields.findIndex(field => field.localId === this.selectedId());
    const next = current + offset;
    if (current < 0 || next < 0 || next >= fields.length) return;
    moveItemInArray(fields, current, next);
    this.fields.set(fields);
    this.dirty.set(true);
  }
  configValue(field: CanvasField, key: string): string {
    try { return String((JSON.parse(field.configurationJson ?? '{}') as Record<string, unknown>)[key] ?? ''); }
    catch { return ''; }
  }
  setConfig(key: string, value: string): void {
    const field = this.selectedField();
    if (!field) return;
    let config: Record<string, unknown> = {};
    try { config = JSON.parse(field.configurationJson ?? '{}') as Record<string, unknown>; } catch { /* invalid legacy configuration is replaced */ }
    config[key] = value;
    this.updateField({ configurationJson: JSON.stringify(config) });
  }
  optionsText(field: CanvasField): string {
    return staticDropdownOptions(dropdownConfiguration(field.configurationJson)).map(option => `${option.value} | ${option.label}`).join('\n');
  }
  dropdownOptions(field: CanvasField): DropdownOption[] {
    return this.configValue(field, 'source') === 'api' ? this.apiOptions()[field.localId] ?? []
      : staticDropdownOptions(dropdownConfiguration(field.configurationJson));
  }
  apiConfig(field: CanvasField, key: 'path' | 'idField' | 'nameField'): string {
    return dropdownConfiguration(field.configurationJson).api?.[key] ?? (key === 'idField' ? 'id' : key === 'nameField' ? 'name' : '');
  }
  setApiConfig(key: 'path' | 'idField' | 'nameField', event: Event): void {
    const field = this.selectedField(); if (!field || this.readOnly) return;
    const config = dropdownConfiguration(field.configurationJson);
    this.updateField({ configurationJson: JSON.stringify({ ...config, api: { ...config.api, [key]: this.inputValue(event) } }) });
    this.apiOptions.update(options => ({ ...options, [field.localId]: [] }));
  }
  loadDropdownPreview(): void {
    const field = this.selectedField(); if (!field) return;
    try {
      this.dropdowns.load(dropdownConfiguration(field.configurationJson)).subscribe({
        next: options => { this.apiOptions.update(current => ({ ...current, [field.localId]: options })); this.error.set(''); },
        error: () => this.error.set('Could not load dropdown options. Check the endpoint and ID/name mappings.')
      });
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'Invalid dropdown API configuration.'); }
  }
  setOptions(event: Event): void {
    const field = this.selectedField();
    if (!field) return;
    let config: Record<string, unknown> = {};
    try { config = JSON.parse(field.configurationJson ?? '{}') as Record<string, unknown>; } catch { /* replace */ }
    config['options'] = this.inputValue(event).split('\n').map(value => value.trim()).filter(Boolean).map(line => {
      const separator = line.indexOf('|');
      return separator < 0 ? { value: line, label: line } : { value: line.slice(0, separator).trim(), label: line.slice(separator + 1).trim() };
    });
    this.updateField({ configurationJson: JSON.stringify(config) });
  }
  exportDraft(): FormDesignerDraft | null {
    const keys = this.fields().map(field => field.key.trim());
    if (!this.objectName().trim() || !this.formName().trim() || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(this.objectKey()) || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(this.formKey())) {
      this.error.set('Give the object and form names, and use letters, numbers, hyphens or underscores for their keys.'); return null;
    }
    if (this.fields().length > 100) { this.error.set('A form can have at most 100 fields.'); return null; }
    if (keys.some(key => !/^[A-Za-z][A-Za-z0-9_-]*$/.test(key)) || new Set(keys.map(key => key.toLowerCase())).size !== keys.length || this.fields().some(field => !field.label.trim())) {
      this.error.set('Every field needs a label and a unique key using letters, numbers, hyphens or underscores.'); return null;
    }
    const apiFields: DesignerField[] = this.fields().map((field, sortOrder) => ({
      id: field.id, key: field.key.trim(), label: field.label.trim(),
      type: this.apiType(field), sortOrder,
      required: field.required, searchable: field.searchable, readOnly: field.readOnly,
      configurationJson: field.configurationJson
    }));
    return {
      objectKey: this.objectKey().trim(), objectName: this.objectName().trim(),
      formKey: this.formKey().trim(), formName: this.formName().trim(), fields: apiFields,
      layoutJson: JSON.stringify({ ...this.forms.fromBuilderFields(apiFields), designerAppearance: this.appearance() })
    };
  }

  save(): void {
    if (this.readOnly || this.saving()) return;
    const draft = this.exportDraft();
    if (!draft) return;
    this.error.set(''); this.notice.set(''); this.saving.set(true);
    this.api.saveDesignerDraft({
      tenantId: this.tenantId, applicationId: this.applicationId, objectId: this.objectId(),
      formId: this.formId(), moduleId: this.moduleId(), pageId: this.route.snapshot.queryParamMap.get('pageId'), pageNodeId: this.route.snapshot.queryParamMap.get('pageNodeId'), ...draft
    }).subscribe({
      next: object => {
        this.application.update(app => app ? { ...app, objects: [...app.objects.filter(item => item.id !== object.id), object] } : app);
        this.dirty.set(false);
        this.openObject(object);
        this.application.update(app => app ? { ...app, modules: app.modules?.map(module => module.id === this.moduleId() ? { ...module, objectId: object.id, formId: object.formId, design: object } : module) } : app);
        this.saving.set(false);
        this.notice.set('Draft saved. Your form and fields are stored in the application.');
      },
      error: response => { this.saving.set(false); this.error.set(response?.error?.detail ?? 'Could not save the draft. Please retry.'); }
    });
  }
  back(): void { void this.router.navigate(['/builder/applications', this.applicationId, 'design'], { queryParams: { tenantId: this.tenantId } }); }
}
