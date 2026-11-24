import { Component, inject, signal, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoModule, TranslocoPipe } from '@jsverse/transloco';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BuilderRelationship, BuildersApiService } from '@core/builders/builders-api.service';
import { AuthService } from '@core/services/auth/auth.service';
import type { DesignerApplication } from '@core/builders/interfaces/designer-application';
import type { DesignerField } from '@core/builders/interfaces/designer-field';

@Component({
  standalone: true,
  selector: 'ant-data-sources',
  templateUrl: './data-sources.component.html',
  styleUrl: './data-sources.component.scss',
  imports: [RouterLink, TranslocoModule],
})
export class DataSourcesComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly api = inject(BuildersApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly applicationId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly tenantId = this.route.snapshot.queryParamMap.get('tenantId') ?? this.auth.tenantId() ?? '';
  readonly app = signal<DesignerApplication | null>(null); readonly busy = signal(false); readonly error = signal(''); readonly notice = signal('');
  readonly name = signal('Customers'); readonly key = signal('customers'); readonly showEditor = signal(false);
  readonly moduleId = signal(''); readonly moduleName = signal(''); readonly moduleKey = signal('');
  readonly relationships = signal<BuilderRelationship[]>([]);
  readonly relationshipSource = signal(''); readonly relationshipTarget = signal('');
  readonly relationshipKey = signal(''); readonly relationshipName = signal('');
  readonly relationshipCardinality = signal<BuilderRelationship['cardinality']>('one-to-many');
  readonly fieldTypes: DesignerField['type'][] = ['Text', 'Email', 'Phone', 'LongText', 'Decimal', 'Integer', 'Boolean', 'Date', 'Lookup'];

  readonly fields = signal<DesignerField[]>([
    { key: 'name', label: 'Customer name', type: 'Text', sortOrder: 0, required: true, searchable: true, readOnly: false },
    { key: 'email', label: 'Email', type: 'Email', sortOrder: 1, required: false, searchable: true, readOnly: false },
    { key: 'phone', label: 'Phone', type: 'Phone', sortOrder: 2, required: false, searchable: true, readOnly: false }
  ]);

  constructor() { this.load(); }

  moduleNameFor(objectId: string): string { return this.app()?.modules?.find(module => module.objectId === objectId)?.name ?? 'Unassigned'; }

  load(): void {
    this.api.dataObjects(this.tenantId, this.applicationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: app => this.app.set(app),
        error: () => this.error.set('crud.loadError')
      });
    this.api.relationships(this.tenantId, this.applicationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: relationships => this.relationships.set(relationships), error: () => this.error.set('Could not load table relationships.') });
  }

  objectName(id: string): string { return this.app()?.objects.find(object => object.id === id)?.name ?? id; }

  createRelationship(): void {
    const sourceObjectId = this.relationshipSource(), targetObjectId = this.relationshipTarget();
    const key = this.relationshipKey().trim(), name = this.relationshipName().trim();
    if (this.busy() || this.app()?.status !== 'Draft' || !sourceObjectId || !targetObjectId ||
      !/^[a-z][a-z0-9_-]{0,79}$/.test(key) || !name) {
      this.error.set('Choose both tables and enter a name and lowercase key.'); return;
    }
    this.busy.set(true); this.error.set('');
    this.api.createRelationship({
      tenantId: this.tenantId, sourceObjectId, targetObjectId,
      key, name, cardinality: this.relationshipCardinality()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: relationship => {
          this.relationships.update(items => [...items, relationship]);
          this.relationshipKey.set(''); this.relationshipName.set('');
          this.busy.set(false); this.notice.set('Relationship created.');
        },
        error: () => { this.busy.set(false); this.error.set('Could not create the relationship. Check the tables and key.'); }
      });
  }

  addField(): void {
    this.fields.update(fields => [...fields,
    {
      key: `field_${fields.length + 1}`,
      label: 'Field',
      type: 'Text',
      sortOrder: fields.length,
      required: false,
      searchable: true,
      readOnly: false
    }]
    );
  }

  updateField(index: number, property: 'key' | 'label' | 'type' | 'required', value: string): void {
    this.fields.update(fields =>
      fields.map((field, i) => i !== index ? field : {
        ...field, ...(property === 'required' ? { required: value === 'true' } : property === 'type' ? { type: this.fieldTypes.find(type => type === value) ?? 'Text', configurationJson: null, readOnly: false } : { [property]: value })
      })
    );
  }

  private config(field: DesignerField): Record<string, any> {
    try { return field.configurationJson ? JSON.parse(field.configurationJson) as Record<string, any> : {}; }
    catch { return {}; }
  }
  lookupValue(field: DesignerField, key: 'targetObjectId' | 'displayField'): string { return String(this.config(field)['lookup']?.[key] ?? ''); }
  formulaValue(field: DesignerField, key: 'left' | 'operator' | 'right'): string { return String(this.config(field)['formula']?.[key] ?? ''); }
  isCalculated(field: DesignerField): boolean { return !!this.config(field)['formula']; }
  setFieldConfig(index: number, section: 'lookup' | 'formula', key: string, value: string): void {
    this.fields.update(fields => fields.map((field, i) => {
      if (i !== index) return field;
      const config = this.config(field), sectionConfig = { ...(config[section] ?? {}), [key]: value };
      if (section === 'lookup' && key === 'targetObjectId') sectionConfig['displayField'] = '';
      return { ...field, configurationJson: JSON.stringify({ ...config, [section]: sectionConfig }) };
    }));
  }
  toggleCalculated(index: number, enabled: boolean): void {
    this.fields.update(fields => fields.map((field, i) => i !== index ? field : {
      ...field, readOnly: enabled,
      configurationJson: enabled ? JSON.stringify({ formula: { left: '', operator: '+', right: '' } }) : null
    }));
  }

  removeField(index: number): void { this.fields.update(fields => fields.filter((_, i) => i !== index)); }
  createModule(): void {
    const key = this.moduleKey().trim(), name = this.moduleName().trim();
    if (this.busy() || !/^[a-z][a-z0-9-]{0,79}$/.test(key) || !name) { this.error.set('Enter a valid module name and lowercase key.'); return; }
    this.busy.set(true); this.error.set('');
    this.api.createApplicationModule(this.tenantId, this.applicationId, key, name).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: module => { this.moduleId.set(module.id); this.busy.set(false); this.notice.set('Module created. Add its data fields below.'); this.load(); },
      error: () => { this.busy.set(false); this.error.set('Could not create the module. Check its key and try again.'); }
    });
  }

  async importFields(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0]; input.value = '';
    if (!file) return;
    if (file.size > 1024 * 1024) { this.error.set('The JSON file must be under 1 MB.'); return; }
    try {
      const source: unknown = JSON.parse(await file.text());
      const rows = Array.isArray(source) ? source : source && typeof source === 'object' && 'fields' in source ? (source as { fields: unknown }).fields : source && typeof source === 'object' ? [source] : null;
      if (!Array.isArray(rows) || rows.length < 1) throw new Error('Expected a JSON object or a non-empty array.');
      const descriptors = rows.every(row => row && typeof row === 'object' && 'key' in row && 'type' in row);
      const sample = !descriptors ? rows[0] : null;
      if (sample && (!sample || typeof sample !== 'object' || Array.isArray(sample))) throw new Error('The JSON sample must contain an object.');
      const definitions = descriptors ? rows : Object.entries(sample as Record<string, unknown>).map(([label, value]) => {
        const key = label.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
        const type: DesignerField['type'] = typeof value === 'boolean' ? 'Boolean' : typeof value === 'number' ? Number.isInteger(value) ? 'Integer' : 'Decimal'
          : typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? 'Date'
            : typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Email' : 'Text';
        return { key, label, type };
      });
      if (definitions.length < 1 || definitions.length > 100) throw new Error('Expected 1–100 fields.');
      const imported: DesignerField[] = definitions.map((row: unknown, index: number) => {
        if (!row || typeof row !== 'object') throw new Error('Each field must be an object.');
        const item = row as Record<string, unknown>;
        const key = String(item['key'] ?? '').trim();
        const label = String(item['label'] ?? key).trim();
        const type = String(item['type'] ?? 'Text') as DesignerField['type'];
        if (!/^[a-z][a-z0-9_]{0,79}$/.test(key) || !label || !this.fieldTypes.includes(type)) throw new Error(`Invalid field at position ${index + 1}.`);
        return {
          key, label, type, sortOrder: index, required: item['required'] === true, searchable: item['searchable'] === true, readOnly: item['readOnly'] === true,
          configurationJson: typeof item['configurationJson'] === 'string' ? item['configurationJson'] : item['configuration'] && typeof item['configuration'] === 'object' ? JSON.stringify(item['configuration']) : null
        };
      });
      if (new Set(imported.map(field => field.key)).size !== imported.length) throw new Error('Field keys must be unique.');
      this.fields.set(imported); this.error.set(''); this.notice.set(`${imported.length} fields imported. Review them before saving.`);
    } catch (error) { this.error.set(error instanceof Error ? error.message : 'Invalid JSON field file.'); }
  }

  create(): void {
    if (this.busy()) return;
    const key = this.key().trim(), fields = this.fields();
    if (!/^[a-z][a-z0-9_-]{0,79}$/.test(key) || !this.name().trim() || !fields.length || fields.some(field => !field.label.trim() || !/^[a-z][a-z0-9_]{0,79}$/.test(field.key)) || new Set(fields.map(field => field.key)).size !== fields.length) { this.error.set('crud.invalidFields'); return; }
    this.busy.set(true); this.error.set('');
    this.api.createDataObject({ tenantId: this.tenantId, applicationId: this.applicationId, moduleId: this.moduleId() || null, objectKey: key, objectName: this.name().trim(), formKey: key + '_form', formName: this.name().trim(), fields: fields.map((field, sortOrder) => ({ ...field, sortOrder })) }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.busy.set(false); this.showEditor.set(false); this.moduleId.set(''); this.notice.set('crud.objectCreated'); this.load(); }, error: () => { this.busy.set(false); this.error.set('crud.error'); } });
  }

  generate(objectId: string): void {
    if (this.busy())
      return;
    this.busy.set(true);
    this.error.set('');
    this.api.generateCrud(this.tenantId, this.applicationId, objectId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.notice.set('crud.generated');
        },
        error: () => {
          this.busy.set(false);
          this.error.set('crud.generateError');
        }
      });
  }

  publish(): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.api.validateApplication(this.tenantId, this.applicationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: errors => {
          if (errors.length) {
            this.busy.set(false);
            this.error.set('crud.validationFailed');
            return;
          }
          this.api.publishApplication(this.tenantId, this.applicationId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: result => {
                this.busy.set(false);
                this.notice.set('crud.published');
                if (result.promotedApplicationId) {
                  void this.router.navigate(['/builder/applications']);
                  return;
                }
                this.load();
              },
              error: () => {
                this.busy.set(false);
                this.error.set('crud.error');
              }
            });
        },
        error: () => {
          this.busy.set(false);
          this.error.set('crud.error');
        }
      });
  }
}
