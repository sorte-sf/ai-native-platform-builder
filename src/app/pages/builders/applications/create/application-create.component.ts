import { TranslocoPipe } from '@jsverse/transloco';
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BuildersApiService, type AiApplicationProposal } from '@core/builders/builders-api.service';
import { AuthService } from '@core/services/auth/auth.service';
import { IconSelectorComponent } from '@app/shared/sorte-components/icon-selector/icon-selector.component';

@Component({
  selector: 'ant-application-create',
  templateUrl: 'application-create.component.html',
  styleUrl: 'application-create.component.scss',
  imports: [TranslocoPipe, ReactiveFormsModule, RouterLink, IconSelectorComponent],

})
export class ApplicationCreateComponent {
  private readonly api = inject(BuildersApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly templateId = this.route.snapshot.queryParamMap.get('templateId');
  readonly templateName = signal('');
  readonly loadingTemplate = signal(false);
  readonly templateAvailable = signal(false);
  readonly duplicateApplication = signal<{ id: string; name: string; tenantId: string } | null>(null);
  constructor() {
    const navigationState = this.router.getCurrentNavigation()?.extras.state ??
      (typeof history !== 'undefined' ? history.state : {}) ?? {};
    const aiScaffold = navigationState['aiScaffold'] as { prompt?: string; proposal?: AiApplicationProposal } | undefined;
    if (!this.templateId && aiScaffold?.proposal) {
      this.scaffoldMode.set(true);
      this.aiPrompt.set(aiScaffold.prompt ?? '');
      this.aiProposal.set(aiScaffold.proposal);
      this.form.controls.name.setValue(aiScaffold.proposal.name);
      this.form.controls.description.setValue(aiScaffold.proposal.description ?? '');
      this.suggestKey();
    }
    if (!this.templateId) return;
    this.loadingTemplate.set(true);
    this.api.templates().subscribe({
      next: items => {
        const template = items.find(item => item.id === this.templateId);
        this.templateName.set(template?.name ?? '');
        this.templateAvailable.set(!!template);
        this.loadingTemplate.set(false);
        if (!template) this.error.set('The selected template is unavailable. Return to Applications and select another template.');
        if (template) this.api.applications().subscribe({
          next: apps => {
            const existing = apps.find(app => app.templateId === template.id && app.operationalState !== 'Deleted');
            if (existing) this.duplicateApplication.set({ id: existing.id, name: existing.name, tenantId: existing.tenantId });
          }
        });
      },
      error: () => { this.loadingTemplate.set(false); this.error.set('Templates could not be loaded. Return to Applications and try again.'); }
    });
  }
  readonly canCreate = this.auth.hasAnyRole(['SystemAdmin', 'TenantAdmin', 'Developer', 'BuilderAdmin', 'BuilderEditor']);
  readonly canUseAi = this.auth.isAuthenticated;
  readonly saving = signal(false);
  readonly error = signal('');
  readonly scaffoldMode = signal(false);
  readonly aiPrompt = signal('');
  readonly aiBusy = signal(false);
  readonly aiError = signal('');
  readonly aiProposal = signal<AiApplicationProposal | null>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    key: ['', [Validators.required, Validators.pattern(/^[a-z][a-z0-9-]{0,79}$/)]],
    applicationType: ['Web' as 'Web' | 'Mobile', Validators.required], description: ['', Validators.maxLength(500)], icon: [''],
    versionNo: ['0.0.1', [Validators.required, Validators.maxLength(64), Validators.pattern(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/)]]
  });
  suggestKey(): void {
    if (this.form.controls.key.dirty) return;
    this.form.controls.key.setValue(this.form.controls.name.value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80));
  }
  fieldCount(proposal: AiApplicationProposal): number { return proposal.objects.reduce((total, object) => total + object.fields.length, 0); }
  fieldLabels(object: AiApplicationProposal['objects'][number]): string { return object.fields.map(field => field.label).join(', '); }
  proposeScaffold(): void {
    if (!this.canUseAi() || this.aiBusy() || !this.aiPrompt().trim()) return;
    const tenantId = this.auth.tenantId();
    if (!tenantId) { this.aiError.set('Your tenant could not be identified. Please sign in again.'); return; }
    this.aiBusy.set(true); this.aiError.set(''); this.aiProposal.set(null);
    this.api.proposeAiScaffold(tenantId, this.aiPrompt().trim()).subscribe({
      next: proposal => {
        this.aiProposal.set(proposal);
        if (!this.form.controls.name.dirty) this.form.controls.name.setValue(proposal.name);
        this.suggestKey();
        if (!this.form.controls.description.dirty) this.form.controls.description.setValue(proposal.description ?? '');
        this.aiBusy.set(false);
      },
      error: response => { this.aiError.set(response?.error?.detail ?? response?.error?.error ?? 'Could not generate an application proposal. Check your tenant AI settings and try again.'); this.aiBusy.set(false); }
    });
  }
  create(): void {
    if (this.saving() || this.loadingTemplate() || (this.templateId && !this.templateAvailable()) || this.duplicateApplication() || (!this.scaffoldMode() && !this.canCreate)) return;
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.form.controls.name.value.trim()) { this.error.set('Enter a valid application name, key and type.'); return; }
    const tenantId = this.auth.tenantId();
    if (!tenantId) { this.error.set('Your tenant could not be identified. Please sign in again.'); return; }
    this.saving.set(true); this.error.set('');
    if (this.scaffoldMode()) {
      const proposal = this.aiProposal();
      if (!proposal) { this.saving.set(false); this.error.set('Generate and review the application proposal first.'); return; }
      this.api.createAiScaffold({
        tenantId, key: this.form.controls.key.value.trim(), name: this.form.controls.name.value.trim(),
        description: this.form.controls.description.value.trim(), applicationType: this.form.controls.applicationType.value, proposal
      }).subscribe({
        next: app => { void this.router.navigate(['/builder/applications', app.id, 'design'], { queryParams: { tenantId: app.tenantId } }); },
        error: response => { this.saving.set(false); this.error.set(response?.error?.message ?? response?.error?.detail ?? response?.error?.error ?? 'The draft application could not be created.'); }
      });
      return;
    }
    this.api.createApplication({
      tenantId, ...this.form.getRawValue(), name: this.form.controls.name.value.trim(),
      templateId: this.templateId,
      ...(this.templateId ? {} : { initialScreen: { key: 'home', title: 'HomePage', htmlContent: '' } }),
    }).subscribe({
      next: app => { void this.router.navigate(['/builder/applications', app.id, 'design'], { queryParams: { tenantId: app.tenantId } }); },
      error: response => {
        this.saving.set(false);
        if (response?.error?.existingApplicationId) {
          this.duplicateApplication.set({
            id: response.error.existingApplicationId,
            name: response.error.existingApplicationName ?? this.templateName(), tenantId
          });
          return;
        }
        const message = response?.error?.message ?? response?.error?.detail ??
          (typeof response?.error === 'string' ? response.error : null);
        this.error.set(message ?? 'Application could not be created. Please retry.');
      }
    });
  }
}
