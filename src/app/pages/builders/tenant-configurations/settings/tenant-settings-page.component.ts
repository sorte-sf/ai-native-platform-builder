import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { SnackBarService } from '@core/services/snackbar.service';
import { BuildersApiService, ConfigTenant, TenantIntegrationConfig, TenantSmtpConfig } from '@core/builders/builders-api.service';
import { TenantConfigurationsComponent } from '../configurations/tenant-configurations.component';
import { catchError, forkJoin, of } from 'rxjs';

interface TenantSummary { smtpConfigured: boolean; integrationCount: number; }

@Component({
  selector: 'ant-tenant-settings-page',
  standalone: true,
  templateUrl: './tenant-settings-page.component.html',
  styleUrls: ['./tenant-settings-page.component.scss'],
  imports: [CommonModule, MatDialogModule],   
})
export class TenantSettingsPageComponent {
  private readonly api = inject(BuildersApiService);
  private readonly snackbar = inject(SnackBarService);
  private readonly dialog = inject(MatDialog);
  readonly tenants = signal<ConfigTenant[]>([]);
  readonly summaries = signal<Record<string, TenantSummary>>({});
  readonly loading = signal(true);

  constructor() { this.reload(); }

  summary(id: string): TenantSummary { return this.summaries()[id] ?? { smtpConfigured: false, integrationCount: 0 }; }
  initials(name: string): string { return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('') || 'TN'; }

  reload(): void {
    this.loading.set(true);
    this.api.configuredTenants().subscribe({
      next: tenants => {
        this.tenants.set(tenants);
        this.loading.set(false);
        for (const tenant of tenants) this.loadSummary(tenant);
      },
      error: () => { this.loading.set(false); this.snackbar.error('Could not load tenant workspaces.', false); }
    });
  }

  private loadSummary(tenant: ConfigTenant): void {
    forkJoin({
      smtp: this.api.tenantSmtp(tenant.tenantId).pipe(catchError(() => of(null as TenantSmtpConfig | null))),
      integrations: this.api.tenantIntegrations(tenant.tenantId).pipe(catchError(() => of([] as TenantIntegrationConfig[])))
    }).subscribe(result => this.summaries.update(current => ({
      ...current,
      [tenant.tenantId]: { smtpConfigured: !!result.smtp, integrationCount: result.integrations.length }
    })));
  }

  openTenant(tenant: ConfigTenant): void {
    const ref = this.dialog.open(TenantConfigurationsComponent, {
      data: { tenantId: tenant.tenantId },
      width: 'min(1040px, calc(100vw - 32px))',
      maxWidth: 'calc(100vw - 32px)',
      height: 'min(850px, calc(100dvh - 32px))',
      maxHeight: 'calc(100dvh - 32px)',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      panelClass: 'tenant-settings-dialog'
    });
    ref.afterClosed().subscribe(() => this.loadSummary(tenant));
  }

}
