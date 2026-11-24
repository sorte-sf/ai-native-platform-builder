import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BuildersApiService, TenantAiPolicy, TenantAiUsage } from '@core/builders/builders-api.service';
import { BuilderApplication } from '@core/builders/interfaces/builder-application';
import { SnackBarService } from '@core/services/snackbar.service';

@Component({
  selector: 'ant-ai-governance',
  standalone: true,
  templateUrl: './ai-governance.component.html',
  styleUrls: ['./ai-governance.component.scss'],
  imports: [CommonModule, FormsModule],
})
export class AiGovernanceComponent implements OnInit {
  private readonly api = inject(BuildersApiService);
  private readonly snackbar = inject(SnackBarService);
  readonly tenants = signal<Array<{ id: string; name: string }>>([]);
  readonly usage = signal<TenantAiUsage | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  tenantId = '';
  month = new Date().toISOString().slice(0, 7);
  mode = 'Disabled'; provider = ''; endpoint = ''; model = ''; apiKeyReference = '';
  authScheme = 'bearer'; monthlyTokenLimit = 100000; monthlyRequestLimit = 1000; maxOutputTokens = 4096;

  ngOnInit(): void {
    this.api.applications(true).subscribe({
      next: (apps: BuilderApplication[]) => {
        const unique = new Map<string, { id: string; name: string }>();
        for (const app of apps) if (!unique.has(app.tenantId)) unique.set(app.tenantId, { id: app.tenantId, name: 'Tenant' });
        this.tenants.set([...unique.values()].sort((a, b) => a.name.localeCompare(b.name)));
      }, error: () => this.snackbar.error('Could not load tenant list.')
    });
  }

  loadTenant(): void {
    if (!this.tenantId) { this.usage.set(null); return; }
    this.loading.set(true);
    this.api.aiPolicy(this.tenantId).subscribe({
      next: p => { this.applyPolicy(p); this.loadUsage(); this.loading.set(false); },
      error: () => { this.snackbar.error('Could not load this tenant AI policy.'); this.loading.set(false); }
    });
  }
  private applyPolicy(p: TenantAiPolicy): void {
    this.mode = p.mode; this.provider = p.provider ?? ''; this.endpoint = p.endpoint ?? ''; this.model = p.model ?? '';
    this.monthlyTokenLimit = p.monthlyTokenLimit; this.monthlyRequestLimit = p.monthlyRequestLimit; this.maxOutputTokens = p.maxOutputTokens;
    this.apiKeyReference = p.hasApiKey ? '•••••• (leave as-is)' : '';
  }
  loadUsage(): void {
    if (this.tenantId) this.api.aiUsage(this.tenantId, `${this.month}-01`).subscribe({ next: value => this.usage.set(value), error: () => this.snackbar.error('Could not load AI usage metrics.') });
  }
  save(): void {
    if (!this.tenantId) return;
    this.saving.set(true);
    const keyRef = this.apiKeyReference.startsWith('••••••') ? null : this.apiKeyReference.trim() || null;
    this.api.saveAiPolicy({
      tenantId: this.tenantId, mode: this.mode, provider: this.provider.trim() || null,
      endpoint: this.endpoint.trim() || null, model: this.model.trim() || null, apiKeyReference: keyRef,
      authScheme: this.authScheme, monthlyTokenLimit: Number(this.monthlyTokenLimit), monthlyRequestLimit: Number(this.monthlyRequestLimit),
      maxOutputTokens: Number(this.maxOutputTokens)
    }).subscribe({
      next: p => { this.applyPolicy(p); this.snackbar.success('Tenant AI policy saved.'); this.saving.set(false); this.loadUsage(); },
      error: err => { this.snackbar.error(err?.error?.detail ?? err?.error ?? 'Could not save tenant AI policy.'); this.saving.set(false); }
    });
  }
}
