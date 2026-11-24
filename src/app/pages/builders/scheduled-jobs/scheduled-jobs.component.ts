import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslocoModule, TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { faCalendarCheck, faPlus, faRepeat, faClock, faShieldHalved, faWrench, faArrowsRotate, faBoxArchive, faTrashCan, faEnvelope, faBell, faFileCircleCheck, faFileLines, faFileInvoiceDollar, faCalendarDays, faMagnifyingGlass, faPause, faPlay, faArrowLeft, faArrowRight, faEllipsisVertical, faBan, faDownload } from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '@core/services/auth/auth.service';
import { SnackBarService } from '@core/services/snackbar.service';
import { ConfirmationService } from '@shared/confirmation/confirmation.service';
import { BuilderScheduledJob, BuilderScheduledJobTemplate, BuildersApiService } from '@core/builders/builders-api.service';

type JobsTab = 'recent' | 'all' | 'templates';
interface ScheduleTemplate extends BuilderScheduledJobTemplate { cron: string; actionType: string; actionJson: string; icon: typeof faClock; tint: string; }

@Component({
  standalone: true,
  selector: 'ant-scheduled-jobs',
  imports: [CommonModule, FormsModule, RouterModule, FontAwesomeModule, TranslocoModule, TranslocoPipe],
  templateUrl: './scheduled-jobs.component.html',
  styleUrl: './scheduled-jobs.component.scss'
})
export class ScheduledJobsComponent implements OnInit {
  private readonly api = inject(BuildersApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly snackbar = inject(SnackBarService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly transloco = inject(TranslocoService);

  readonly applicationId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly tenantId = this.auth.tenantId() ?? '';
  readonly jobs = signal<BuilderScheduledJob[]>([]);
  readonly templates = signal<ScheduleTemplate[]>([]);
  readonly tab = signal<JobsTab>('recent');
  readonly category = signal('All');
  readonly search = signal('');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editorOpen = signal(false);
  readonly error = signal('');
  readonly openMenuFor = signal<string | null>(null);
  readonly filteredTemplates = computed(() => this.templates().filter(item =>
    (this.category() === 'All' || item.category === this.category()) &&
    `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(this.search().trim().toLowerCase())));
  readonly categories = computed(() => ['All', ...new Set(this.templates().map(item => item.category))]);
  readonly enabledCount = computed(() => this.jobs().filter(job => job.enabled).length);
  readonly monthDays = Array.from({ length: 28 }, (_, index) => index + 1);
  readonly timeZones = (() => {
    const intl = Intl as typeof Intl & { supportedValuesOf?: (key: 'timeZone') => string[] };
    const zones = intl.supportedValuesOf?.('timeZone') ?? ['Europe/Istanbul', 'UTC', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Tokyo', 'Australia/Sydney'];
    return [...new Set(['Europe/Istanbul', 'UTC', ...zones])].sort((a, b) => a === 'Europe/Istanbul' ? -1 : b === 'Europe/Istanbul' ? 1 : a.localeCompare(b));
  })();

  name = '';
  cron = '0 0 8 * * *';
  timeZoneId = 'Europe/Istanbul';
  scheduleType: 'once' | 'recurring' = 'recurring';
  recurrence: 'minutes' | 'hours' | 'daily' | 'weekdays' | 'weekly' | 'monthly' = 'daily';
  advancedSchedule = false;
  runAtLocal = '';
  timeOfDay = '08:00';
  interval = 1;
  minuteOfHour = 0;
  weekday = 1;
  monthDay = 1;
  actionType = 'event.audit';
  actionJson = '{\n  "event": "scheduled-job"\n}';
  eventName = 'scheduled-job';
  recipientId = '';
  notificationTitle = '';
  notificationMessage = '';
  workflowId = '';
  recordId = '';
  reportKey = '';
  reportEmailEnabled = false;
  reportEmailTo = '';
  reportEmailSubject = '';
  reportEmailBody = '';
  mailTo = '';
  mailSubject = '';
  mailBody = '';
  mailIsHtml = false;
  apiMethod = 'GET';
  apiUrl = '';
  apiBody = '';
  readonly icons = { page: faCalendarCheck, add: faPlus, repeat: faRepeat, clock: faClock, shield: faShieldHalved, maintenance: faWrench, sync: faArrowsRotate, archive: faBoxArchive, cleanup: faTrashCan, mail: faEnvelope, bell: faBell, report: faFileCircleCheck, document: faFileLines, finance: faFileInvoiceDollar, calendar: faCalendarDays, search: faMagnifyingGlass, pause: faPause, play: faPlay, back: faArrowLeft, next: faArrowRight, more: faEllipsisVertical, disable: faBan, download: faDownload };

  ngOnInit(): void {
    if (!this.applicationId || !this.tenantId) { this.snackbar.error('scheduledJobs.messages.contextMissing'); this.loading.set(false); return; }
    this.loadJobs();
    this.api.scheduledJobTemplates(this.applicationId, this.tenantId).subscribe({
      next: items => this.templates.set(items.map(item => {
        let detail: { cron?: string; actionType?: string; actionJson?: string } = {};
        try { detail = JSON.parse(item.manifestJson ?? '{}'); } catch { /* malformed built-in template is shown with defaults */ }
        return { ...item, cron: detail.cron ?? '0 0 8 * * *', actionType: detail.actionType ?? 'event.audit', actionJson: detail.actionJson ?? '{"event":"scheduled-job"}', ...this.visual(item.category) };
      }).sort((a, b) => this.categoryOrder(a.category) - this.categoryOrder(b.category))),
      error: () => this.snackbar.error('scheduledJobs.messages.templatesLoadFailed')
    });
  }

  loadJobs(): void {
    this.loading.set(true);
    this.api.scheduledJobs(this.tenantId, this.applicationId).subscribe({
      next: items => { this.jobs.set(items); this.loading.set(false); },
      error: () => { this.snackbar.error('scheduledJobs.messages.jobsLoadFailed'); this.loading.set(false); }
    });
  }

  startBlank(): void {
    this.name = ''; this.cron = '0 0 8 * * *'; this.timeZoneId = 'Europe/Istanbul';
    this.scheduleType = 'recurring'; this.recurrence = 'daily'; this.advancedSchedule = false;
    this.runAtLocal = ''; this.timeOfDay = '08:00'; this.interval = 1; this.minuteOfHour = 0; this.weekday = 1; this.monthDay = 1;
    this.setActionType('event.audit'); this.error.set(''); this.editorOpen.set(true);
  }
  useTemplate(template: ScheduleTemplate): void {
    this.name = template.name;
    this.cron = template.cron;
    this.timeZoneId = 'Europe/Istanbul';
    this.scheduleType = 'recurring';
    this.inferGuidedSchedule(template.cron);
    this.actionType = template.actionType;
    try { this.loadActionFields(template.actionType, JSON.parse(template.actionJson) as Record<string, unknown>); }
    catch { this.setActionType(template.actionType); }
    this.error.set('');
    this.editorOpen.set(true);
  }

  save(): void {
    if (!this.name.trim()) { this.error.set(this.transloco.translate('scheduledJobs.errors.nameRequired')); return; }
    if (this.scheduleType === 'once' && !this.runAtLocal) { this.error.set(this.transloco.translate('scheduledJobs.errors.onceTimeRequired')); return; }
    if (this.scheduleType === 'recurring') {
      if (!this.advancedSchedule) this.updateCronFromGuided();
      if (this.cron.trim().split(/\s+/).length !== 6) { this.error.set(this.transloco.translate('scheduledJobs.errors.invalidCron')); return; }
    }
    const payload = this.buildActionPayload();
    if (this.actionType === 'notification.create' && ![this.recipientId, this.notificationTitle, this.notificationMessage].every(value => value.trim())) { this.error.set(this.transloco.translate('scheduledJobs.errors.notificationRequired')); return; }
    if (this.actionType === 'workflow.start' && ![this.workflowId, this.recordId].every(value => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim()))) { this.error.set(this.transloco.translate('scheduledJobs.errors.workflowIdsInvalid')); return; }
    if (this.actionType === 'report.generate' && this.reportEmailEnabled && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.reportEmailTo.trim())) { this.error.set(this.transloco.translate('scheduledJobs.errors.reportEmailInvalid')); return; }
    if (this.actionType === 'email.send' && ![this.mailTo, this.mailSubject, this.mailBody].every(value => value.trim())) { this.error.set(this.transloco.translate('scheduledJobs.errors.emailRequired')); return; }
    if (this.actionType === 'http.request' && (!this.apiUrl.startsWith('https://') || !this.apiMethod)) { this.error.set(this.transloco.translate('scheduledJobs.errors.apiHttpsRequired')); return; }
    this.saving.set(true); this.error.set('');
    this.api.createScheduledJob(this.applicationId, { tenantId: this.tenantId, applicationId: this.applicationId, key: this.name.trim(), schedule: this.scheduleType === 'once' ? 'once' : this.cron.trim(), timeZoneId: this.timeZoneId, scheduleType: this.scheduleType, localRunAt: this.scheduleType === 'once' ? this.runAtLocal : null, actionType: this.actionType, actionJson: JSON.stringify(payload), nextRunAt: null }).subscribe({
      next: () => { this.saving.set(false); this.editorOpen.set(false); this.snackbar.success('scheduledJobs.messages.saved'); this.tab.set('all'); this.loadJobs(); },
      error: err => { this.saving.set(false); this.error.set(err?.error?.detail ?? err?.error ?? this.transloco.translate('scheduledJobs.errors.saveFailed')); }
    });
  }

  scheduleModeChanged(mode: 'once' | 'recurring'): void {
    this.scheduleType = mode;
    if (mode === 'recurring' && !this.advancedSchedule) this.updateCronFromGuided();
  }

  updateCronFromGuided(): void {
    const [hoursText = '8', minutesText = '0'] = this.timeOfDay.split(':');
    const hour = Math.max(0, Math.min(23, Number(hoursText) || 0));
    const minute = Math.max(0, Math.min(59, Number(minutesText) || 0));
    const interval = Math.max(1, Math.min(this.recurrence === 'minutes' ? 59 : 23, Math.floor(Number(this.interval) || 1)));
    this.interval = interval;
    const time = `0 ${this.recurrence === 'hours' ? Math.max(0, Math.min(59, this.minuteOfHour)) : minute} ${hour}`;
    switch (this.recurrence) {
      case 'minutes': this.cron = `0 */${interval} * * * *`; break;
      case 'hours': this.cron = `0 ${minute} */${interval} * * *`; break;
      case 'weekdays': this.cron = `${time} * * 1-5`; break;
      case 'weekly': this.cron = `${time} * * ${this.weekday}`; break;
      case 'monthly': this.cron = `${time} ${this.monthDay} * *`; break;
      default: this.cron = `${time} * * *`;
    }
  }

  scheduleSummary(): string {
    const t = (key: string, params?: Record<string, unknown>) => this.transloco.translate(`scheduledJobs.summary.${key}`, params);
    if (this.scheduleType === 'once') return this.runAtLocal ? t('once', { date: this.runAtLocal.replace('T', ' '), timeZone: this.timeZoneId }) : t('chooseDate');
    if (this.advancedSchedule) return t('advanced', { cron: this.cron, timeZone: this.timeZoneId });
    const descriptions: Record<string, string> = {
      minutes: t(this.interval === 1 ? 'minuteSingular' : 'minutePlural', { count: this.interval }),
      hours: t(this.interval === 1 ? 'hourSingular' : 'hourPlural', { count: this.interval, minute: this.minuteOfHour }),
      daily: t('daily', { time: this.timeOfDay }),
      weekdays: t('weekdays', { time: this.timeOfDay }),
      weekly: t('weekly', { day: this.transloco.translate(`scheduledJobs.weekdays.${this.weekday}`), time: this.timeOfDay }),
      monthly: t('monthly', { day: this.monthDay, time: this.timeOfDay })
    };
    return t('withTimeZone', { description: descriptions[this.recurrence], timeZone: this.timeZoneId });
  }

  templateCategory(category: string): string {
    const key = category.toLowerCase();
    const translated = this.transloco.translate(`scheduledJobs.categories.${key}`);
    return translated === `scheduledJobs.categories.${key}` ? category : translated;
  }

  templateText(template: ScheduleTemplate, field: 'name' | 'description'): string {
    const key = template.key.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toLowerCase();
    const translation = this.transloco.translate(`scheduledJobs.templateContent.${key}.${field}`);
    return translation === `scheduledJobs.templateContent.${key}.${field}` ? template[field] : translation;
  }

  actionLabel(actionType: string): string {
    const keys: Record<string, string> = {
      'event.audit': 'auditAction',
      'notification.create': 'notificationAction',
      'workflow.start': 'workflowAction',
      'report.generate': 'reportAction',
      'email.send': 'emailAction',
      'http.request': 'apiAction'
    };
    return this.transloco.translate(`scheduledJobs.editor.${keys[actionType] ?? 'action'}`);
  }

  private inferGuidedSchedule(expression: string): void {
    const fields = expression.trim().split(/\s+/);
    this.advancedSchedule = false;
    if (fields.length !== 6) { this.advancedSchedule = true; return; }
    const minute = Number(fields[1]);
    const hour = Number(fields[2]);
    if (fields[1].startsWith('*/')) {
      this.recurrence = 'minutes'; this.interval = Number(fields[1].slice(2)) || 15;
    } else if (fields[2].startsWith('*/')) {
      this.recurrence = 'hours'; this.interval = Number(fields[2].slice(2)) || 1;
      this.minuteOfHour = Number.isFinite(minute) ? minute : 0;
    } else if (fields[5] === '1-5') {
      this.recurrence = 'weekdays';
    } else if (/^[0-6]$/.test(fields[5])) {
      this.recurrence = 'weekly'; this.weekday = Number(fields[5]);
    } else if (/^([1-9]|[12]\d|3[01])$/.test(fields[3])) {
      this.recurrence = 'monthly'; this.monthDay = Number(fields[3]);
    } else {
      this.recurrence = 'daily';
    }
    if (!fields[2].startsWith('*/'))
      this.timeOfDay = `${String(Number.isFinite(hour) ? hour : 8).padStart(2, '0')}:${String(Number.isFinite(minute) ? minute : 0).padStart(2, '0')}`;
  }

  toggleAdvanced(enabled: boolean): void {
    if (enabled) this.advancedSchedule = true;
    else this.inferGuidedSchedule(this.cron);
  }

  toggle(job: BuilderScheduledJob): void {
    this.api.setScheduledJobEnabled(this.applicationId, job.id, this.tenantId, !job.enabled).subscribe({
      next: () => { this.jobs.update(items => items.map(item => item.id === job.id ? { ...item, enabled: !job.enabled } : item)); this.snackbar.success(job.enabled ? 'scheduledJobs.messages.paused' : 'scheduledJobs.messages.enabled'); },
      error: () => this.snackbar.error('scheduledJobs.messages.updateFailed')
    });
  }

  async delete(job: BuilderScheduledJob): Promise<void> {
    this.openMenuFor.set(null);
    const accepted = await this.confirmation.confirm({
      title: this.transloco.translate('scheduledJobs.confirmDelete.title'),
      message: this.transloco.translate('scheduledJobs.confirmDelete.message', { name: job.key }),
      confirmText: this.transloco.translate('scheduledJobs.confirmDelete.confirm'),
      cancelText: this.transloco.translate('scheduledJobs.editor.cancel'),
      tone: 'danger'
    });
    if (!accepted) return;
    this.api.deleteScheduledJob(this.applicationId, job.id, this.tenantId).subscribe({
      next: () => { this.jobs.update(items => items.filter(item => item.id !== job.id)); this.snackbar.success('scheduledJobs.messages.deleted'); },
      error: () => this.snackbar.error('scheduledJobs.messages.deleteFailed')
    });
  }

  downloadReport(job: BuilderScheduledJob): void {
    this.api.downloadScheduledJobReport(this.applicationId, job.id, this.tenantId).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${job.key}-latest.csv`;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.snackbar.error('scheduledJobs.messages.reportDownloadFailed')
    });
  }

  visibleJobs(): BuilderScheduledJob[] {
    const items = this.jobs();
    const filtered = items.filter(item => `${item.key} ${item.schedule} ${item.actionType}`.toLowerCase().includes(this.search().trim().toLowerCase()));
    return this.tab() === 'recent' ? filtered.slice(0, 6) : filtered;
  }

  canReenable(job: BuilderScheduledJob): boolean {
    return !(job.scheduleType === 'once' && !!job.runAt && Date.parse(job.runAt) <= Date.now());
  }

  formatInTimeZone(value: string | null, timeZoneId: string): string {
    if (!value) return '';
    try { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: timeZoneId }).format(new Date(value)); }
    catch { return new Date(value).toLocaleString(); }
  }

  setActionType(value: string): void {
    this.actionType = value;
    this.eventName = 'scheduled-job';
    this.recipientId = '';
    this.notificationTitle = '';
    this.notificationMessage = '';
    this.workflowId = '';
    this.recordId = '';
    this.reportKey = '';
    this.reportEmailEnabled = false;
    this.reportEmailTo = '';
    this.reportEmailSubject = '';
    this.reportEmailBody = '';
    this.mailTo = '';
    this.mailSubject = '';
    this.mailBody = '';
    this.mailIsHtml = false;
    this.apiMethod = 'GET';
    this.apiUrl = '';
    this.apiBody = '';
  }

  private loadActionFields(type: string, payload: Record<string, unknown>): void {
    this.setActionType(type);
    if (type === 'notification.create') {
      this.recipientId = String(payload['recipientId'] ?? '');
      this.notificationTitle = String(payload['title'] ?? '');
      this.notificationMessage = String(payload['message'] ?? '');
    } else if (type === 'workflow.start') {
      this.workflowId = String(payload['workflowId'] ?? '');
      this.recordId = String(payload['recordId'] ?? '');
    } else if (type === 'report.generate') {
      this.reportKey = String(payload['reportKey'] ?? '');
      const email = payload['email'] as Record<string, unknown> | undefined;
      this.reportEmailEnabled = !!email;
      this.reportEmailTo = String(email?.['to'] ?? '');
      this.reportEmailSubject = String(email?.['subject'] ?? '');
      this.reportEmailBody = String(email?.['body'] ?? '');
    } else if (type === 'email.send') {
      this.mailTo = String(payload['to'] ?? '');
      this.mailSubject = String(payload['subject'] ?? '');
      this.mailBody = String(payload['body'] ?? '');
      this.mailIsHtml = payload['isHtml'] === true;
    } else if (type === 'http.request') {
      this.apiMethod = String(payload['method'] ?? 'GET');
      this.apiUrl = String(payload['url'] ?? '');
      this.apiBody = String(payload['body'] ?? '');
    } else {
      this.eventName = String(payload['event'] ?? 'scheduled-job');
    }
  }

  private buildActionPayload(): Record<string, unknown> {
    if (this.actionType === 'notification.create') return { recipientId: this.recipientId.trim(), title: this.notificationTitle.trim(), message: this.notificationMessage.trim() };
    if (this.actionType === 'workflow.start') return { workflowId: this.workflowId.trim(), recordId: this.recordId.trim() };
    if (this.actionType === 'report.generate') return {
      reportKey: this.reportKey.trim(),
      ...(this.reportEmailEnabled ? { email: {
        to: this.reportEmailTo.trim(),
        subject: this.reportEmailSubject.trim(),
        body: this.reportEmailBody.trim()
      } } : {})
    };
    if (this.actionType === 'email.send') return { to: this.mailTo.trim(), subject: this.mailSubject.trim(), body: this.mailBody, isHtml: this.mailIsHtml };
    if (this.actionType === 'http.request') return { method: this.apiMethod, url: this.apiUrl.trim(), body: this.apiBody || null };
    return { event: this.eventName.trim() || 'scheduled-job' };
  }

  private visual(category: string): Pick<ScheduleTemplate, 'icon' | 'tint'> {
    if (category === 'Monitoring') return { icon: faShieldHalved, tint: 'green' };
    if (category === 'Maintenance') return { icon: faWrench, tint: 'blue' };
    if (category === 'Integration') return { icon: faArrowsRotate, tint: 'purple' };
    if (category === 'Notifications') return { icon: faBell, tint: 'orange' };
    if (category === 'Finance') return { icon: faFileInvoiceDollar, tint: 'yellow' };
    return { icon: faFileLines, tint: 'pink' };
  }

  private categoryOrder(category: string): number {
    return ['Monitoring', 'Maintenance', 'Integration', 'Notifications', 'Reporting', 'Finance'].indexOf(category);
  }
}
