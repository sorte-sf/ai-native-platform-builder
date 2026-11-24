import { TranslocoModule, TranslocoPipe } from '@jsverse/transloco';
import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { combineLatest, defer, forkJoin, of, startWith, Subscription, catchError } from 'rxjs';
import { DropdownOptionsService, dropdownConfiguration, staticDropdownOptions } from '@core/builders/dropdown-options.service';
import type { FormConfig } from '@ng-forge/dynamic-forms';
import { BuildersApiService } from '@core/builders/builders-api.service';
import { PlatformDynamicFormComponent } from '@shared/dynamic-form/platform-dynamic-form.component';
import { PlatformFormService } from '@core/plugins/platform-form.service';
import { BuilderRecord } from '@app/core/builders/interfaces/builder-record';
import { RuntimeFormDefinition } from '@core/builders/interfaces/runtime-form-definition';
import { PaginationComponent } from '@shared/components/pagination.component';
import { createClientId } from '@core/builders/client-id';

interface LookupPicker {
  key: string; label: string; targetObjectId: string; displayField: string; required: boolean;
  search: string; page: number; total: number; options: { value: string; label: string }[];
  selectedId: string; selectedLabel: string; loading: boolean; error: string;
}

@Component({
  selector: 'ant-runtime-form',
  templateUrl: './runtime-form.component.html',
  styleUrl: './runtime-form.component.scss',
  imports: [
    TranslocoModule,
    PlatformDynamicFormComponent,
    PaginationComponent
  ],
})
export class RuntimeFormComponent {
  readonly objectId = input.required<string>();
  readonly definition = input<RuntimeFormDefinition | null>(null);
  readonly tenantContext = input<string | null>(null);
  readonly existingRecord = input<BuilderRecord | null>(null);
  readonly preview = input(false);
  readonly localOnly = input(false);
  readonly recordSaved = output<BuilderRecord>();
  readonly submitting = signal(false);
  private readonly api = inject(BuildersApiService);
  private readonly forms = inject(PlatformFormService);
  private readonly dropdowns = inject(DropdownOptionsService);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);
  private optionsSubscription?: Subscription;
  private lookupSubscriptions = new Map<string, Subscription>();

  readonly title = signal('Form');
  readonly config = signal<FormConfig | null>(null);
  readonly error = signal<string | null>(null);
  readonly savedRecord = signal<BuilderRecord | null>(null);
  readonly images = signal<Array<{ url: string; alt: string }>>([]);
  readonly lookups = signal<LookupPicker[]>([]);
  readonly appearance = signal({ primaryColor: '#5e4fa2', backgroundColor: '#ffffff', textColor: '#1f2937', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14, gridColumns: 2 });

  constructor() {
    effect(() => this.load(this.objectId()));
  }

  submit(value: unknown): void {
    if (this.submitting()) return;
    const tenantId = this.tenantId();
    if (!tenantId) { this.error.set('No tenant has been selected.'); return; }
    const existing = this.existingRecord();
    const lookupValues = Object.fromEntries(this.lookups().map(lookup => [lookup.key, lookup.selectedId || null]));
    if (this.lookups().some(lookup => lookup.required && !lookup.selectedId)) { this.error.set('Select a value for each required lookup.'); return; }
    const data = { ...(value && typeof value === 'object' ? value as Record<string, unknown> : {}), ...lookupValues };
    if (this.preview()) {
      const record: BuilderRecord = { id: existing?.id ?? createClientId(), tenantId, objectId: this.objectId(), dataJson: JSON.stringify(data), version: (existing?.version ?? 0) + 1 };
      this.savedRecord.set(record); this.error.set(null); this.recordSaved.emit(record); return;
    }
    if (existing && (existing.objectId !== this.objectId() || existing.tenantId !== tenantId)) { this.error.set('Record context does not match this form.'); return; }
    this.submitting.set(true);
    (existing ? this.api.updateRecord(tenantId, existing, data) : this.api.createRecord(tenantId, this.objectId(), data)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: record => { this.submitting.set(false); this.savedRecord.set(record); this.error.set(null); this.recordSaved.emit(record); },
      error: () => { this.submitting.set(false); this.error.set('The record could not be saved. Please verify your permissions, record version and form values.'); }
    });
  }

  private load(objectId: string): void {
    this.optionsSubscription?.unsubscribe();
    for (const subscription of this.lookupSubscriptions.values()) subscription.unsubscribe();
    this.lookupSubscriptions.clear(); this.lookups.set([]);
    const tenantId = this.tenantId();
    if (!tenantId) { this.error.set('No tenant has been selected.'); return; }
    if (this.localOnly() && !this.definition()) { this.error.set('preview.localHelp'); return; }
    (this.definition() ? of(this.definition()!) : this.api.runtimeForm(tenantId, objectId)).subscribe({
      next: definition => {
        this.title.set(definition.name);
        this.images.set(definition.fields.flatMap(field => {
          if (field.type !== 'File' || !field.configurationJson) return [];
          try {
            const config = JSON.parse(field.configurationJson) as { kind?: string; imageUrl?: string; alt?: string };
            return config.kind === 'image' && config.imageUrl ? [{ url: config.imageUrl, alt: config.alt || field.label }] : [];
          } catch { return []; }
        }));
        let config: FormConfig | null = null;
        if (definition.layoutJson) {
          try {
            const parsed: unknown = JSON.parse(definition.layoutJson);
            if (parsed && typeof parsed === 'object' && 'fields' in parsed && Array.isArray(parsed.fields)) {
              config = parsed as FormConfig;
              if ('designerAppearance' in parsed && parsed.designerAppearance && typeof parsed.designerAppearance === 'object')
                this.appearance.update(current => ({ ...current, ...parsed.designerAppearance as Partial<typeof current> }));
            }
          } catch { /* Fall back to the current field definitions. */ }
        }
        this.error.set(null);
        let baseConfig = config ?? this.forms.fromBuilderFields(definition.fields);
        const existing = this.existingRecord();
        let existingValues: Record<string, unknown> = {};
        if (existing) {
          try { existingValues = JSON.parse(existing.dataJson) as Record<string, unknown>;
            baseConfig = { ...baseConfig, fields: baseConfig.fields.map(field => field.key in existingValues ? { ...field, value: existingValues[field.key] } : field) } as FormConfig;
          } catch { this.error.set('Invalid record data.'); return; }
        }
        const lookupKeys = new Set(definition.fields.filter(field => field.type === 'Lookup').map(field => field.key));
        baseConfig = { ...baseConfig, fields: baseConfig.fields.filter(field => !lookupKeys.has(field.key)) } as FormConfig;
        this.lookups.set(definition.fields.filter(field => field.type === 'Lookup').flatMap(field => {
          try {
            const lookup = (JSON.parse(field.configurationJson ?? '{}') as { lookup?: { targetObjectId?: string; displayField?: string } }).lookup;
            if (!lookup?.targetObjectId || !lookup.displayField) return [];
            const selectedId = String(existingValues[field.key] ?? '');
            return [{ key: field.key, label: field.label, required: field.required, targetObjectId: lookup.targetObjectId,
              displayField: lookup.displayField, search: '', page: 1, total: 0, options: [], selectedId, selectedLabel: selectedId,
              loading: false, error: '' }];
          } catch { return []; }
        }));
        for (const lookup of this.lookups()) this.loadLookup(lookup.key, 1);
        const choices = definition.fields.filter(field => ['Choice', 'MultiChoice', 'SelectionBox', 'RadioButton'].includes(field.type));
        const requests = choices.map(field => defer(() => this.localOnly() ? of(staticDropdownOptions(dropdownConfiguration(field.configurationJson))) : this.dropdowns.load(dropdownConfiguration(field.configurationJson))).pipe(
          catchError(() => { this.error.set(`Could not load options for ${field.label}.`); return of([]); })));
        this.optionsSubscription = combineLatest([
          requests.length ? forkJoin(requests) : of([]),
          this.transloco.langChanges$.pipe(startWith(this.transloco.getActiveLang()))
        ]).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(([options]) => {
          const byKey = new Map(choices.map((field, index) => [field.key, options[index] ?? []]));
          this.config.set({
            ...baseConfig, fields: baseConfig.fields.map(field => byKey.has(field.key)
              ? { ...field, options: byKey.get(field.key)!.map(option => ({ ...option, label: this.transloco.translate(option.label) })) } : field)
          } as FormConfig);
        });
      },
      error: () => this.error.set('This form could not be loaded.')
    });
  }

  updateLookup(key: string, patch: Partial<LookupPicker>): void {
    this.lookups.update(items => items.map(item => item.key === key ? { ...item, ...patch } : item));
  }

  loadLookup(key: string, page: number): void {
    const lookup = this.lookups().find(item => item.key === key), tenantId = this.tenantId();
    if (!lookup || !tenantId || this.localOnly()) return;
    this.lookupSubscriptions.get(key)?.unsubscribe();
    this.updateLookup(key, { loading: true, error: '' });
    const subscription = this.api.queryLookupRecords(tenantId, lookup.targetObjectId, lookup.displayField, lookup.search, page)
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: response => {
          const options = response.items.map(record => {
            try { const data = JSON.parse(record.dataJson) as Record<string, unknown>;
              return { value: record.id, label: String(data[lookup.displayField] ?? '') }; }
            catch { return { value: record.id, label: '' }; }
          }).filter(option => option.label);
          const selected = options.find(option => option.value === lookup.selectedId);
          this.updateLookup(key, { page: response.page, total: response.total, options, loading: false,
            selectedLabel: selected?.label ?? lookup.selectedLabel });
        },
        error: () => this.updateLookup(key, { loading: false, error: 'Could not load lookup records. Check access to the source table.' })
      });
    this.lookupSubscriptions.set(key, subscription);
  }

  selectLookup(key: string, value: string): void {
    const lookup = this.lookups().find(item => item.key === key);
    if (!lookup) return;
    this.updateLookup(key, { selectedId: value, selectedLabel: lookup.options.find(option => option.value === value)?.label ?? '' });
  }

  private tenantId(): string { return this.tenantContext() ?? localStorage.getItem('tenantId') ?? localStorage.getItem('companyId') ?? ''; }

}
