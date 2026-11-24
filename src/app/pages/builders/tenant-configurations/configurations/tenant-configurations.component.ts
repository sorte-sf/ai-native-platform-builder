import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '@core/services/auth/auth.service';
import { SnackBarService } from '@core/services/snackbar.service';
import { ConfirmationService } from '@shared/confirmation/confirmation.service';
import { BuildersApiService, ConfigTenant, TenantFieldMapping, TenantIntegrationConfig, TenantIntegrationInput, TenantSmtpConfig } from '@core/builders/builders-api.service';
import { BuilderApplication } from '@core/builders/interfaces/builder-application';

@Component({
  selector: 'ant-tenant-configurations',
  standalone: true,
  templateUrl: './tenant-configurations.component.html',
  styleUrls: ['./tenant-configurations.component.scss'],
  imports: [CommonModule, FormsModule],  
    
})
export class TenantConfigurationsComponent implements OnInit {
  readonly dialogData = inject<{ tenantId: string } | null>(MAT_DIALOG_DATA, { optional: true });
  private readonly dialogRef = inject(MatDialogRef<TenantConfigurationsComponent>, { optional: true });
  private readonly api = inject(BuildersApiService);
  private readonly auth = inject(AuthService);
  private readonly snackbar = inject(SnackBarService);
  private readonly confirmation = inject(ConfirmationService);
  readonly systemAdmin = signal(this.auth.hasAnyRole(['SystemAdmin']));
  readonly tenants = signal<ConfigTenant[]>([]);
  readonly applications = signal<BuilderApplication[]>([]);
  readonly integrations = signal<TenantIntegrationConfig[]>([]);
  readonly mappings = signal<TenantFieldMapping[]>([]);
  readonly selectedTenant = signal<ConfigTenant | null>(null);
  readonly selectedIntegration = signal<TenantIntegrationConfig | null>(null);
  readonly section = signal<'smtp' | 'integrations'>('smtp');
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly integrationEditor = signal(false);
  readonly mappingEditor = signal(false);
  readonly smtp = signal<TenantSmtpConfig | null>(null);
  tenantId = '';
  editingIntegrationId: string | null = null;
  editingMappingId: string | null = null;
  smtpForm = this.emptySmtp();
  integrationForm = this.emptyIntegration();
  mappingForm = this.emptyMapping();

  ngOnInit(): void {
    this.tenantId = this.dialogData?.tenantId ?? this.auth.tenantId() ?? '';
    this.api.configuredTenants().subscribe({
      next: items => {
        this.tenants.set(items);
        this.selectTenant();
      },
      error: () => { this.loading.set(false); this.snackbar.error('Could not load tenant configurations.', false); }
    });
  }

  closeDialog(): void { this.dialogRef?.close(); }

  selectTenant(): void {
    this.selectedTenant.set(this.tenants().find(x => x.tenantId === this.tenantId) ?? null);
    this.selectedIntegration.set(null); this.integrations.set([]); this.mappings.set([]); this.smtp.set(null);
    if (!this.tenantId) { this.loading.set(false); return; }
    this.loading.set(true); this.pendingLoads = 0;
    const appsRequest = this.systemAdmin() ? this.api.applications(true) : this.api.applications();
    appsRequest.subscribe({ next: apps => this.applications.set(apps.filter(app => app.tenantId === this.tenantId)), error: () => this.applications.set([]) });
    this.api.tenantSmtp(this.tenantId).subscribe({ next: value => { this.smtp.set(value); this.smtpForm = this.smtpToForm(value); this.finishLoad(); }, error: () => { this.smtpForm = this.emptySmtp(); this.finishLoad(); } });
    this.api.tenantIntegrations(this.tenantId).subscribe({ next: value => { this.integrations.set(value); this.finishLoad(); }, error: () => { this.integrations.set([]); this.finishLoad(); } });
  }

  private pendingLoads = 0;
  private finishLoad(): void { this.pendingLoads++; if (this.pendingLoads % 2 === 0) this.loading.set(false); }
  applicationName(id: string): string { return this.applications().find(app => app.id === id)?.name ?? 'Application'; }
  isApiIntegration(): boolean { return Number(this.integrationForm.integrationType) === 2; }
  private emptySmtp() { return { host: '', port: 587 as number | null, from: '', displayName: '', userName: '', password: '', enableSsl: false, useStartTls: true, clearPassword: false }; }
  private smtpToForm(value: TenantSmtpConfig | null) { return value ? { host: value.host, port: value.port ?? 587, from: value.from, displayName: value.displayName ?? '', userName: value.userName ?? '', password: '', enableSsl: value.enableSsl ?? false, useStartTls: value.useStartTls ?? true, clearPassword: false } : this.emptySmtp(); }
  private emptyIntegration(): TenantIntegrationInput { return { name: '', applicationId: '', integrationType: 1, port: 5432, userName: '', password: '', token: '', connectionString: '', databaseName: '', enableSsl: false, clearPassword: false, clearToken: false, clearConnectionString: false }; }
  private emptyMapping() { return { sourceFieldName: '', sourceFieldDescription: '', destinationFieldName: '' }; }

  saveSmtp(): void {
    if (!this.tenantId || !this.smtpForm.host.trim() || !this.smtpForm.from.trim() || !this.smtpForm.port) { this.snackbar.warning('Enter a host, sender address, and valid port.', false); return; }
    this.busy.set(true);
    this.api.saveTenantSmtp(this.tenantId, { ...this.smtpForm, host: this.smtpForm.host.trim(), from: this.smtpForm.from.trim(), displayName: this.smtpForm.displayName.trim() || null, userName: this.smtpForm.userName.trim() || null, password: this.smtpForm.password || null }).subscribe({
      next: value => { this.smtp.set(value); this.smtpForm = this.smtpToForm(value); this.busy.set(false); this.snackbar.success('SMTP settings saved.', false); },
      error: err => { this.busy.set(false); this.snackbar.error(err?.error?.detail ?? err?.error ?? 'Could not save SMTP settings.', false); }
    });
  }
  async deleteSmtp(): Promise<void> {
    if (!this.tenantId || !await this.confirmation.confirm({ title: 'Remove SMTP settings?', message: 'Email delivery settings for this tenant will be deleted.', confirmText: 'Remove settings', tone: 'danger' })) return;
    this.busy.set(true); this.api.deleteTenantSmtp(this.tenantId).subscribe({ next: () => { this.smtp.set(null); this.smtpForm = this.emptySmtp(); this.busy.set(false); this.snackbar.success('SMTP settings removed.', false); }, error: () => { this.busy.set(false); this.snackbar.error('Could not remove SMTP settings.', false); } });
  }

  newIntegration(): void { this.editingIntegrationId = null; this.selectedIntegration.set(null); this.integrationForm = { ...this.emptyIntegration(), applicationId: this.applications()[0]?.id ?? '' }; this.integrationEditor.set(true); }
  editIntegration(item: TenantIntegrationConfig): void { this.editingIntegrationId = item.id; this.selectedIntegration.set(item); this.integrationForm = { ...this.emptyIntegration(), name: item.name, applicationId: item.applicationId, integrationType: Number(item.integrationType) || (item.integrationType === 'Api' ? 2 : 1), port: item.port ?? 5432, userName: item.userName ?? '', databaseName: item.databaseName ?? '', enableSsl: item.enableSsl ?? false }; this.integrationEditor.set(true); }
  selectIntegration(item: TenantIntegrationConfig): void { this.selectedIntegration.set(item); this.integrationEditor.set(false); this.loadMappings(); }
  saveIntegration(): void {
    if (!this.integrationForm.name.trim() || !this.integrationForm.applicationId) { this.snackbar.warning('Enter an integration name and choose an application.', false); return; }
    this.busy.set(true); const payload = { ...this.integrationForm, name: this.integrationForm.name.trim(), port: this.integrationForm.port || null, userName: this.integrationForm.userName?.trim() || null, databaseName: this.integrationForm.databaseName?.trim() || null, password: this.integrationForm.password || null, token: this.integrationForm.token || null, connectionString: this.integrationForm.connectionString || null };
    const request = this.editingIntegrationId ? this.api.updateTenantIntegration(this.tenantId, this.editingIntegrationId, payload) : this.api.createTenantIntegration(this.tenantId, payload);
    request.subscribe({ next: () => { this.busy.set(false); this.integrationEditor.set(false); this.snackbar.success('Integration saved.', false); this.refreshIntegrations(); }, error: err => { this.busy.set(false); this.snackbar.error(err?.error?.detail ?? err?.error ?? 'Could not save integration.', false); } });
  }
  async deleteIntegration(item: TenantIntegrationConfig): Promise<void> {
    if (!await this.confirmation.confirm({ title: 'Delete integration?', message: `“${item.name}” and its field mappings will be removed.`, confirmText: 'Delete integration', tone: 'danger' })) return;
    this.api.deleteTenantIntegration(this.tenantId, item.id).subscribe({ next: () => { if (this.selectedIntegration()?.id === item.id) { this.selectedIntegration.set(null); this.mappings.set([]); } this.snackbar.success('Integration deleted.', false); this.refreshIntegrations(); }, error: () => this.snackbar.error('Could not delete integration.', false) });
  }
  private refreshIntegrations(): void { this.api.tenantIntegrations(this.tenantId).subscribe({ next: items => { this.integrations.set(items); const selected = items.find(x => x.id === this.selectedIntegration()?.id); this.selectedIntegration.set(selected ?? null); if (selected) this.loadMappings(); } }); }
  private loadMappings(): void { const item = this.selectedIntegration(); if (!item) return; this.api.tenantMappings(this.tenantId, item.id).subscribe({ next: items => this.mappings.set(items), error: () => this.snackbar.error('Could not load field mappings.', false) }); }

  newMapping(): void { this.editingMappingId = null; this.mappingForm = this.emptyMapping(); this.mappingEditor.set(true); }
  editMapping(item: TenantFieldMapping): void { this.editingMappingId = item.id; this.mappingForm = { sourceFieldName: item.sourceFieldName, sourceFieldDescription: item.sourceFieldDescription ?? '', destinationFieldName: item.destinationFieldName }; this.mappingEditor.set(true); }
  saveMapping(): void {
    const selected = this.selectedIntegration(); if (!selected || !this.mappingForm.sourceFieldName.trim() || !this.mappingForm.destinationFieldName.trim()) { this.snackbar.warning('Enter both source and destination fields.', false); return; }
    this.busy.set(true); const payload = { ...this.mappingForm, sourceFieldName: this.mappingForm.sourceFieldName.trim(), sourceFieldDescription: this.mappingForm.sourceFieldDescription.trim() || null, destinationFieldName: this.mappingForm.destinationFieldName.trim() };
    const request = this.editingMappingId ? this.api.updateTenantMapping(this.tenantId, selected.id, this.editingMappingId, payload) : this.api.createTenantMapping(this.tenantId, selected.id, payload);
    request.subscribe({ next: () => { this.busy.set(false); this.mappingEditor.set(false); this.snackbar.success('Field mapping saved.', false); this.loadMappings(); this.refreshIntegrations(); }, error: err => { this.busy.set(false); this.snackbar.error(err?.error?.detail ?? err?.error ?? 'Could not save field mapping.', false); } });
  }
  async deleteMapping(item: TenantFieldMapping): Promise<void> {
    const selected = this.selectedIntegration(); if (!selected || !await this.confirmation.confirm({ title: 'Delete field mapping?', message: `The mapping for “${item.sourceFieldName}” will be removed.`, confirmText: 'Delete mapping', tone: 'danger' })) return;
    this.api.deleteTenantMapping(this.tenantId, selected.id, item.id).subscribe({ next: () => { this.snackbar.success('Field mapping deleted.', false); this.loadMappings(); this.refreshIntegrations(); }, error: () => this.snackbar.error('Could not delete field mapping.', false) });
  }
}
