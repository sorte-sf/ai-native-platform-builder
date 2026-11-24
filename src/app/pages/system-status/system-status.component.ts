import { TranslocoPipe } from '@jsverse/transloco';
import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faUsers, faCubes, faCircleCheck, faFilePen, faArrowUpRightDots } from '@fortawesome/free-solid-svg-icons';
import { BuildersApiService, SystemDashboardSummary } from '@core/builders/builders-api.service';
import { AuthService } from '@core/services/auth/auth.service';

@Component({
  selector: 'ant-system-status',
  templateUrl: './system-status.component.html',
  styleUrl: './system-status.component.scss',
  imports: [TranslocoPipe, FontAwesomeModule, DatePipe, DecimalPipe]
})
export class SystemStatusComponent {
  private readonly api = inject(BuildersApiService);
  private readonly auth = inject(AuthService);
  readonly summary = signal<SystemDashboardSummary | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly lastUpdated = signal<Date | null>(null);
  readonly greetingName = computed(() => this.auth.displayName());

  readonly metrics = computed(() => {
    const data = this.summary();
    if (!data) return [];
    return [
      { label: 'Applications', value: data.applications.total, detail: 'Active applications', icon: faCubes, tone: 'violet' },
      { label: 'Published applications', value: data.applications.published, detail: `${data.applications.drafts} drafts · ${data.applications.archived} archived`, icon: faCircleCheck, tone: 'cyan' },
      { label: 'Draft applications', value: data.applications.drafts, detail: `${data.applications.passive} passive · ${data.applications.deleted} deleted`, icon: faFilePen, tone: 'orange' },
      { label: 'Active application users', value: data.users.active, detail: `${data.users.createdLast30Days} created in the last 30 days`, icon: faUsers, tone: 'green' }
    ];
  });

  readonly statusRows = computed(() => {
    const data = this.summary()?.applications;
    if (!data) return [];
    const rows = [
      { label: 'Published', value: data.published, tone: 'published' },
      { label: 'Draft', value: data.drafts, tone: 'draft' },
      { label: 'Archived', value: data.archived, tone: 'archived' },
      { label: 'Passive', value: data.passive, tone: 'passive' },
      { label: 'Deleted', value: data.deleted, tone: 'deleted' }
    ];
    const max = Math.max(...rows.map(row => row.value), 1);
    return rows.map(row => ({ ...row, width: `${Math.max(row.value ? 3 : 0, row.value / max * 100)}%` }));
  });

  readonly tenantRows = computed(() => {
    const rows = this.summary()?.tenantBreakdown ?? [];
    const maxApps = Math.max(...rows.map(row => row.applicationCount), 1);
    const maxUsers = Math.max(...rows.map(row => row.activeUserCount), 1);
    return rows.map(row => ({
      ...row,
      applicationWidth: `${row.applicationCount ? Math.max(3, row.applicationCount / maxApps * 100) : 0}%`,
      userWidth: `${row.activeUserCount ? Math.max(3, row.activeUserCount / maxUsers * 100) : 0}%`
    }));
  });

  readonly icons = { trend: faArrowUpRightDots };

  constructor() { this.refresh(); }

  refresh(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.systemDashboardSummary().subscribe({
      next: data => {
        this.summary.set(data);
        this.lastUpdated.set(new Date(data.asOfUtc));
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'Dashboard statistics could not be loaded.');
        this.loading.set(false);
      }
    });
  }
}
