import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BuildersApiService, type AiProviderOption } from '@app/core/builders/builders-api.service';
import { BuilderApplication } from '@app/core/builders/interfaces/builder-application';

import { AuthService } from '@core/services/auth/auth.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { DatePipe } from '@angular/common';
import { TranslocoModule, TranslocoPipe } from '@jsverse/transloco';
import { BuilderTemplate } from '@core/builders/interfaces/builder-template';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TemplatePickerDialogComponent } from '../templates/template-picker-dialog.component';
import { FormsModule } from '@angular/forms';
import { SnackBarService } from '@core/services/snackbar.service';
import { TemplateUpdateReview } from '@app/core/builders/builders-api.service';
import { TemplateUpdateReviewDialogComponent } from './template-update/template-update-review-dialog.component';
import { getDesignerStudioUrl } from '@core/gateway-config';

@Component({
  selector: 'ant-applications',
  templateUrl: './applications.component.html',
  styleUrl: './applications.component.scss',
  imports: [
    RouterLink,
    FontAwesomeModule,
    DatePipe,
    TranslocoModule,
    FormsModule
  ],

})
export class ApplicationsComponent implements OnInit {
  readonly designerStudioUrl = getDesignerStudioUrl();
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  
  chooseStarter(): void {
    if (!this.canCreate || this.templatesLoading()) return;
    this.dialog.open(TemplatePickerDialogComponent, {
      data: this.templates(),
      width: '1200px',
      maxWidth: '96vw',
      maxHeight: '90dvh'
    }).afterClosed().subscribe((id?: string) => { if (id) this.startTemplate(id); });
  }
  startTemplate(id: string): void {
    if (!this.canCreate || !this.templates().some(template => template.id === id)) return;
    void this.router.navigate(['/builder/applications/new'], { queryParams: { templateId: id } });
  }
  createNewApplication(): void {
    if (!this.canCreate) return;
    void this.router.navigate(['/builder/applications/new']);
  }
  usePromptSuggestion(prompt: string): void { this.aiPrompt.set(prompt); this.aiError.set(''); }
  createApplicationFromPrompt(): void {
    const prompt = this.aiPrompt().trim();
    if (!prompt) { this.createNewApplication(); return; }
    if (!this.canUseAi() || this.aiBusy()) return;
    const tenantId = this.auth.tenantId();
    if (!tenantId) { this.aiError.set('workspace.aiTenantMissing'); return; }
    this.aiBusy.set(true); this.aiError.set('');
    const selected = this.selectedAiModel();
    this.api.proposeAiScaffold(tenantId, prompt, selected?.provider, selected?.model).subscribe({
      next: proposal => {
        this.aiBusy.set(false);
        void this.router.navigate(['/builder/applications/new'], {
          state: { aiScaffold: { tenantId, prompt, proposal } }
        });
      },
      error: response => {
        this.aiBusy.set(false);
        this.aiError.set(response?.error?.detail ?? response?.error?.error ?? 'workspace.aiGenerateFailed');
      }
    });
  }
  private readonly api = inject(BuildersApiService);
  private readonly snackbar = inject(SnackBarService);
  readonly auth = inject(AuthService);
  items: BuilderApplication[] = [];
  error = '';
  readonly canCreate = this.auth.hasAnyRole(['SystemAdmin', 'TenantAdmin', 'Developer', 'BuilderAdmin', 'BuilderEditor']);
  readonly canUseAi = this.auth.isAuthenticated;
  readonly view = signal<'recent' | 'apps' | 'templates'>('apps');
  readonly search = signal('');
  readonly templateSearch = signal('');
  readonly aiModels = signal<AiProviderOption[]>([]);
  readonly selectedAiModel = signal<AiProviderOption | null>(null);
  readonly aiModelMenuOpen = signal(false);
  readonly aiModelSettingsOpen = signal(false);
  readonly aiModelBusy = signal(false);
  readonly aiModelError = signal('');
  aiProvider = 'OpenAI-compatible';
  aiEndpoint = '';
  aiModelName = '';
  aiApiKey = '';
  aiAuthScheme = 'bearer';
  readonly templateCategory = signal('');
  readonly templateSourceFilter = signal<'all' | 'scratch' | 'prebuilt' | 'studio'>('all');
  readonly templates = signal<BuilderTemplate[]>([]);
  readonly loading = signal(true);
  readonly templatesLoading = signal(true);
  readonly templateError = signal('');
  readonly isAdmin = this.auth.hasAnyRole(['SystemAdmin', 'TenantAdmin']);
  readonly deletionQueue = signal<Array<{ id: string; tenantId: string; applicationId: string; applicationName: string; requestedByUserId: string; reason: string; createdAt: string }>>([]);
  deletionReason = '';
  rejectionReason = '';
  readonly deletionMessage = signal('');
  readonly operationalStateBusyId = signal<string | null>(null);
  readonly templateUpdates = signal(new Map<string, TemplateUpdateReview>());
  readonly templateUpdateBusyId = signal<string | null>(null);
  readonly createDraftBusyId = signal<string | null>(null);
  readonly aiPrompt = signal('');
  readonly aiBusy = signal(false);
  readonly aiError = signal('');
  visibleApps(): BuilderApplication[] {
    const term = this.search().trim().toLocaleLowerCase();
    const matches = this.items.filter(item => `${item.name} ${item.description ?? ''}`.toLocaleLowerCase().includes(term));
    if (this.view() === 'apps') {
      const userId = this.auth.userId();
      return userId ? matches.filter(item => item.createdByUserId === userId) : [];
    }
    const recent = [...matches].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
    return this.view() === 'recent' && !this.isAdmin ? recent.slice(0, 10) : recent;
  }
  visibleTemplates(): BuilderTemplate[] {
    const term = this.search().trim().toLocaleLowerCase();
    return this.templates().filter(item => `${item.name} ${item.description ?? ''}`.toLocaleLowerCase().includes(term));
  }
  templatesBySource(source: 'prebuilt' | 'studio'): BuilderTemplate[] {
    const templates = this.visibleTemplates();
    return templates.filter(template => this.templateSource(template) === source);
  }
  templateGroups(): Array<'prebuilt' | 'studio'> {
    const selected = this.templateSourceFilter();
    return (selected === 'all' ? ['prebuilt', 'studio'] : selected === 'scratch' ? [] : [selected]) as Array<'prebuilt' | 'studio'>;
  }
  starterTemplates(source: 'prebuilt' | 'studio'): BuilderTemplate[] {
    const term = this.templateSearch().trim().toLocaleLowerCase();
    const category = this.templateCategory();
    return this.templates().filter(template => this.templateSource(template) === source
      && (!category || (template.category || 'General') === category)
      && (!term || `${template.name} ${template.description ?? ''} ${template.category ?? ''}`.toLocaleLowerCase().includes(term)));
  }
  starterCategories(): string[] {
    return [...new Set(this.templates().filter(template => this.templateSourceFilter() === 'all'
      || this.templateSourceFilter() === 'scratch'
      || this.templateSource(template) === this.templateSourceFilter())
      .map(template => template.category || 'General'))].sort((a, b) => a.localeCompare(b));
  }
  showScratch(): boolean {
    const source = this.templateSourceFilter();
    if (source !== 'all' && source !== 'scratch') return false;
    if (this.templateCategory()) return false;
    const term = this.templateSearch().trim().toLocaleLowerCase();
    return !term || ['scratch', 'blank', 'new app', 'new project'].some(value => value.includes(term));
  }
  selectTemplateSource(source: 'all' | 'scratch' | 'prebuilt' | 'studio'): void {
    this.templateSourceFilter.set(source);
    this.templateCategory.set('');
  }
  sourceCount(source: 'all' | 'scratch' | 'prebuilt' | 'studio'): number {
    if (source === 'scratch') return 1;
    if (source === 'all') return this.templates().length + 1;
    return this.templates().filter(template => this.templateSource(template) === source).length;
  }
  templateSource(template: BuilderTemplate): 'prebuilt' | 'studio' {
    return template.key?.startsWith('designer-studio:') ? 'studio' : 'prebuilt';
  }
  setView(view: 'recent' | 'apps' | 'templates'): void { this.view.set(view); this.search.set(''); }
  loadTemplates(): void {
    this.templatesLoading.set(true); this.templateError.set('');
    this.api.templates().subscribe({
      next: items => { this.templates.set(items); this.templatesLoading.set(false); },
      error: () => { this.templateError.set('workspace.templateError'); this.templatesLoading.set(false); }
    });
  }
  readonly icons = signal(new Map<string, IconDefinition>());

  ngOnInit(): void {
    import('@fortawesome/free-solid-svg-icons').then(pack => {
      const icons = new Map<string, IconDefinition>();
      for (const icon of Object.values(pack.fas)) icons.set(icon.iconName, icon);
      this.icons.set(icons);
    });
    this.load();
    this.loadTemplates();
    this.loadAiModels();
    if (this.isAdmin) this.loadDeletionQueue();
  }

  loadAiModels(): void {
    const tenantId = this.auth.tenantId();
    if (!tenantId) return;
    this.api.availableAiModels(tenantId).subscribe({
      next: models => {
        this.aiModels.set(models);
        this.selectedAiModel.set(models[0] ?? null);
        if (models[0]) { this.aiProvider = models[0].provider; this.aiModelName = models[0].model; }
      },
      error: () => this.aiModels.set([])
    });
  }

  selectAiModel(model: AiProviderOption): void {
    this.selectedAiModel.set(model);
    this.aiModelMenuOpen.set(false);
  }

  saveAiModel(): void {
    const tenantId = this.auth.tenantId();
    if (!tenantId || this.aiModelBusy()) return;
    this.aiModelBusy.set(true); this.aiModelError.set('');
    this.api.savePersonalAiModel({ tenantId, provider: this.aiProvider.trim(), endpoint: this.aiEndpoint.trim() || null,
      model: this.aiModelName.trim(), apiKey: this.aiApiKey || null, authScheme: this.aiAuthScheme }).subscribe({
      next: () => { this.aiApiKey = ''; this.aiModelBusy.set(false); this.aiModelSettingsOpen.set(false); this.loadAiModels(); },
      error: response => {
        this.aiModelBusy.set(false);
        this.aiModelError.set(response?.error?.detail ?? response?.error?.error ?? response?.error ?? 'workspace.aiModelSaveFailed');
      }
    });
  }

  @HostListener('document:click') closeAiModelMenu(): void { this.aiModelMenuOpen.set(false); }

  iconFor(value?: string | null): IconDefinition | null {
    if (!value) return null;
    try {
      const data = JSON.parse(value.replaceAll("'", '"')) as string[];
      return data[0] === 'fas' ? this.icons().get(data[1]) ?? null : null;
    } catch { return null; }
  }

  load(): void {
    this.error = '';
    this.loading.set(true);
    this.api.applications(this.auth.hasAnyRole(['SystemAdmin'])).subscribe({
      next: items => { this.items = items; this.loading.set(false); this.loadTemplateUpdates(items); },
      error: response => {
        this.loading.set(false); this.error = response.status === 401
          ? 'The Builder API rejected this request. Your login is still active; check that the gateway and Builder API share the same token settings.'
          : 'The Builder API is unavailable. Please retry when the service is healthy.';
      }
    });
  }

  private loadTemplateUpdates(items: BuilderApplication[]): void {
    const reviews = new Map(this.templateUpdates());
    for (const item of items) {
      if (item.status !== 'Draft' || !item.canEdit) { reviews.delete(item.id); continue; }
      this.api.templateUpdates(item.id).subscribe({
        next: review => { const current = new Map(this.templateUpdates()); current.set(item.id, review); this.templateUpdates.set(current); },
        error: () => { const current = new Map(this.templateUpdates()); current.delete(item.id); this.templateUpdates.set(current); }
      });
    }
    this.templateUpdates.set(reviews);
  }

  reviewTemplateUpdate(item: BuilderApplication): void {
    if (!item.canEdit || this.templateUpdateBusyId()) return;
    this.templateUpdateBusyId.set(item.id);
    this.api.templateUpdates(item.id).subscribe({
      next: review => {
        this.templateUpdateBusyId.set(null);
        if (!review.updateAvailable) { this.snackbar.info('This application already uses the latest starter template.', false); return; }
        this.dialog.open(TemplateUpdateReviewDialogComponent, {
          data: { app: item, review }, width: 'min(46rem, calc(100vw - 2rem))', maxWidth: '96vw',
          maxHeight: '88vh', autoFocus: false, ariaLabel: 'Review starter template update'
        }).afterClosed().subscribe(result => {
          if (!result) return;
          if (!result.applied) { this.snackbar.error(result.error ? (result.version || 'Could not apply the template update. Refresh and try again.') : 'No template changes were applied.', false); return; }
          this.snackbar.success(`Starter template ${result.version} applied. Added ${result.added} new items; existing customizations were preserved.`, false);
          this.load();
        });
      },
      error: () => { this.templateUpdateBusyId.set(null); this.snackbar.error('Could not load the template update review.', false); }
    });
  }

  createDraftFromPublished(item: BuilderApplication): void {
    if (!item.canEdit || item.status !== 'Published' || this.createDraftBusyId()) return;
    this.createDraftBusyId.set(item.id);
    this.api.createPublishedApplicationDraft(item.id).subscribe({
      next: draft => {
        this.createDraftBusyId.set(null);
        this.snackbar.success(draft.existingDraft ? 'Opening your existing draft.' : 'A draft was created from the latest published version.', false);
        void this.router.navigate(['/builder/applications', draft.id, 'design'], { queryParams: { tenantId: draft.tenantId } });
      },
      error: response => {
        this.createDraftBusyId.set(null);
        this.snackbar.error(response.status === 409
          ? (response.error?.message ?? 'Could not create a draft. Refresh the application and try again.')
          : 'Could not create a draft from this published application.', false);
      }
    });
  }

  requestDeletion(item: BuilderApplication): void {
    const reason = this.deletionReason.trim();
    if (!reason || item.status !== 'Draft' || item.pendingDeletion) return;
    this.api.requestApplicationDeletion(item.id, item.tenantId, reason).subscribe({
      next: () => { this.deletionReason = ''; this.deletionMessage.set('workspace.deletionRequestSent'); this.load(); },
      error: response => this.deletionMessage.set(response.status === 409 ? 'workspace.deletionRequestExists' : 'workspace.deletionRequestFailed')
    });
  }

  setOperationalState(item: BuilderApplication): void {
    if (item.status !== 'Published' || !item.canEdit || this.operationalStateBusyId()) return;
    const isActive = item.operationalState === 'Passive';
    this.operationalStateBusyId.set(item.id);
    this.api.setApplicationOperationalState(item.id, item.tenantId, isActive).subscribe({
      next: () => {
        this.operationalStateBusyId.set(null);
        this.deletionMessage.set(isActive ? 'workspace.appActivated' : 'workspace.appSetPassive');
        this.load();
      },
      error: () => {
        this.operationalStateBusyId.set(null);
        this.deletionMessage.set('workspace.appStateChangeFailed');
      }
    });
  }

  loadDeletionQueue(): void {
    this.api.pendingApplicationDeletions(this.auth.hasAnyRole(['SystemAdmin']) ? undefined : this.auth.tenantId() ?? undefined)
      .subscribe({ next: requests => this.deletionQueue.set(requests), error: () => this.deletionQueue.set([]) });
  }

  reviewDeletion(requestId: string, approve: boolean): void {
    this.api.reviewApplicationDeletion(requestId, approve, this.rejectionReason.trim() || undefined).subscribe({
      next: () => { this.rejectionReason = ''; this.deletionMessage.set(approve ? 'workspace.deletionApproved' : 'workspace.deletionRejected'); this.load(); this.loadDeletionQueue(); },
      error: response => this.deletionMessage.set(response.status === 403 ? 'workspace.deletionReviewDenied' : 'workspace.deletionReviewFailed')
    });
  }
}
