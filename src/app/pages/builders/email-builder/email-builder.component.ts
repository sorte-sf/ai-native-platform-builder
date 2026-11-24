import { Component, computed, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoModule, TranslocoPipe } from '@jsverse/transloco';
import { BuildersApiService, BuilderEmailTemplate, SaveBuilderEmailTemplate } from '@core/builders/builders-api.service';
import { AuthService } from '@core/services/auth/auth.service';
import { PlatformFormService } from '@core/plugins/platform-form.service';
import { PlatformDynamicFormComponent } from '@shared/dynamic-form/platform-dynamic-form.component';
import { CommonModule } from '@angular/common';
import { QuillViewComponent } from 'ngx-quill';
import { EmailParagraphEditorComponent } from './paragraph-editor/email-paragraph-editor.component';
import { DomSanitizer } from '@angular/platform-browser';
import { sanitizeEmailBlocks, type EmailBlock } from './email-template-sanitizer';
import { ConfirmationService } from '@shared/confirmation/confirmation.service';
import { createClientId } from '@core/builders/client-id';

type EmailDefinition = { schemaVersion: 1; blocks: EmailBlock[] };
type EmailDetails = { name: string; key: string; subject: string; language: string; templateType: string };
type StarterEmailName = 'Reset Password' | 'Set Password' | 'Task Notification' | 'Email Verification' | 'Event Invitation' | 'Appointment Reminder';
type StarterEmailCategory = 'all' | 'account' | 'notifications' | 'events';

@Component({
  selector: 'ant-email-builder',
  templateUrl: './email-builder.component.html',
  styleUrl: './email-builder.component.scss',
  imports: [
    CommonModule,
    EmailParagraphEditorComponent,
    QuillViewComponent,
    RouterLink,
    TranslocoModule,
    PlatformDynamicFormComponent],
})
export class EmailBuilderComponent {
  readonly paragraphFormats = [
    'bold',
    'italic',
    'underline',
    'strike',
    'blockquote',
    'code-block',
    'header',
    'list',
    'script',
    'indent',
    'direction',
    'size',
    'color',
    'background',
    'font',
    'align',
    'link'
  ];
  private readonly api = inject(BuildersApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly forms = inject(PlatformFormService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly confirmation = inject(ConfirmationService);
  readonly applicationId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly tenantId = this.route.snapshot.queryParamMap.get('tenantId') ?? this.auth.tenantId() ?? '';
  readonly items = signal<BuilderEmailTemplate[]>([]);
  readonly selected = signal<BuilderEmailTemplate | null>(null);
  readonly editorOpen = signal(false);
  readonly details = signal<EmailDetails>({ name: '', key: '', subject: '', language: 'en', templateType: 'Custom' });
  readonly blocks = signal<EmailBlock[]>([]);
  readonly hasParagraph = computed(() => this.blocks().some(block => block.type === 'paragraph'));
  readonly search = signal('');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly tab = signal<'all' | 'emails' | 'templates'>('all');
  readonly previewDialog = viewChild<ElementRef<HTMLDialogElement>>('previewDialog');

  openPreview(): void { this.previewDialog()?.nativeElement.showModal(); }

  closePreview(): void { this.previewDialog()?.nativeElement.close(); }

  readonly showTemplateGallery = signal(false);
  readonly templateCategory = signal<StarterEmailCategory>('all');
  readonly templateSearch = signal('');

  readonly starterTemplates: {
    name: StarterEmailName;
    label: string;
    category: Exclude<StarterEmailCategory, 'all'>;
    theme: string; icon: string
  }[] = [
      { name: 'Reset Password', label: 'resetPassword', category: 'account', theme: 'violet', icon: '✳' },
      { name: 'Set Password', label: 'setPassword', category: 'account', theme: 'blue', icon: '◈' },
      { name: 'Email Verification', label: 'emailVerification', category: 'account', theme: 'teal', icon: '✓' },
      { name: 'Task Notification', label: 'taskNotification', category: 'notifications', theme: 'amber', icon: '☑' },
      { name: 'Event Invitation', label: 'eventInvitation', category: 'events', theme: 'rose', icon: '✉' },
      { name: 'Appointment Reminder', label: 'appointmentReminder', category: 'events', theme: 'indigo', icon: '◷' },
    ];

  readonly visibleStarterTemplates = computed(() => this.starterTemplates.filter(template =>
    (this.templateCategory() === 'all' || template.category === this.templateCategory()) &&
    (!this.templateSearch() || template.name.toLocaleLowerCase().includes(this.templateSearch().toLocaleLowerCase())))
  );

  readonly filtered = computed(() => this.items().filter(item =>
    (!this.search() || `${item.name} ${item.subject} ${item.key}`.toLocaleLowerCase().includes(this.search().toLocaleLowerCase())) &&
    (this.tab() !== 'templates' || item.templateType !== 'Custom') &&
    (this.tab() !== 'emails' || item.templateType === 'Custom'))
  );

  readonly config = computed(() => this.forms.toDynamicFormConfig({
    fields: [
      { key: 'name', type: 'text', label: 'Name', value: this.details().name, required: true },
      { key: 'key', type: 'text', label: 'Key', value: this.details().key, required: true },
      { key: 'subject', type: 'text', label: 'Subject', value: this.details().subject, required: true },
      { key: 'language', type: 'text', label: 'Language', value: this.details().language, required: true },
      { key: 'templateType', type: 'text', label: 'Type', value: this.details().templateType, required: true },
    ]
  })
  );

  constructor() { this.load(); }

  load(): void {
    if (!this.tenantId || !this.applicationId) {
      this.error.set('emailBuilder.missingContext');
      return;
    }

    this.api.emailTemplates(this.tenantId, this.applicationId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: items => this.items.set(items), error: () => this.error.set('emailBuilder.loadError')
    });

  }

  blank(): void {
    this.selected.set(null);
    this.details.set({ name: '', key: '', subject: '', language: 'en', templateType: 'Custom' });
    this.blocks.set([{ id: createClientId(), type: 'heading', text: 'Your heading' },
    { id: createClientId(), type: 'paragraph', text: 'Write your message here.' }]);
    this.editorOpen.set(true); this.error.set('');
  }

  preset(kind: StarterEmailName): void {
    const key = kind.toLowerCase().replace(/\s+/g, '-');
    const copy: Record<StarterEmailName, { message: string; action: string }> = {
      'Reset Password': { message: 'Hello {{name}},\n\nWe received a request to reset your password. Use the button below to choose a new one. If this was not you, you can ignore this email.', action: 'Reset password' },
      'Set Password': { message: 'Hello {{name}},\n\nYour account is ready. Set your password to finish getting started.', action: 'Set password' },
      'Email Verification': { message: 'Hello {{name}},\n\nPlease verify your email address to activate your account.', action: 'Verify email' },
      'Task Notification': { message: 'Hello {{name}},\n\nA task has been assigned to you. Open the application to review its details.', action: 'View task' },
      'Event Invitation': { message: 'Hello {{name}},\n\nYou are invited to our upcoming event. We would be delighted to see you there.', action: 'View invitation' },
      'Appointment Reminder': { message: 'Hello {{name}},\n\nThis is a reminder about your upcoming appointment. Please review the details and confirm your attendance.', action: 'View appointment' },
    };
    this.selected.set(null);
    this.details.set({ name: kind, key, subject: kind, language: 'en', templateType: kind });
    this.blocks.set([
      { id: createClientId(), type: 'heading', text: kind },
      { id: createClientId(), type: 'paragraph', text: copy[kind].message },
      { id: createClientId(), type: 'button', text: copy[kind].action, url: 'https://antsoft.com.tr' },
    ]);
    this.showTemplateGallery.set(false);
    this.editorOpen.set(true); this.error.set('');
  }

  open(item: BuilderEmailTemplate): void {
    this.selected.set(item);
    this.details.set({ name: item.name, key: item.key, subject: item.subject, language: item.language, templateType: item.templateType });
    try {
      const parsed = JSON.parse(item.definitionJson) as EmailDefinition;
      this.blocks.set(parsed.schemaVersion === 1 && Array.isArray(parsed.blocks) ? parsed.blocks : []);
    } catch { this.blocks.set([]); }
    this.editorOpen.set(true); this.error.set('');
  }

  addBlock(type: EmailBlock['type']): void {
    if (type === 'paragraph' && this.blocks().some(block => block.type === 'paragraph')) return;
    this.blocks.update(items => [...items, { id: createClientId(), type, text: type === 'button' ? 'Button' : '' }]);
  }
  setBlock(id: string, key: 'text' | 'url', value: string): void {
    this.blocks.update(items => items.map(item => item.id === id ? { ...item, [key]: value } : item));
  }
  paragraphDelta(block: EmailBlock): string {
    return block.richText ?? JSON.stringify({ ops: [{ insert: `${block.text.replace(/\r?\n/g, '\n')}\n` }] });
  }
  setParagraphDelta(id: string, value: string | null): void {
    this.blocks.update(items => items.map(item => item.id === id && item.type === 'paragraph'
      ? { ...item, richText: value || JSON.stringify({ ops: [{ insert: '\n' }] }) }
      : item));
  }

  removeBlock(id: string): void { this.blocks.update(items => items.filter(item => item.id !== id)); }

  moveBlock(id: string, offset: number): void {
    const items = [...this.blocks()], index = items.findIndex(item => item.id === id), target = index + offset;
    if (index < 0 || target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]]; this.blocks.set(items);
  }

  safeUrl(url?: string): string | null {
    try { const parsed = new URL(url ?? ''); return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : null; }
    catch { return null; }
  }

  save(value: unknown): void {
    if (this.busy() || !value || typeof value !== 'object') return;
    const fields = value as Partial<EmailDetails>;
    const name = fields.name?.trim() ?? '', key = fields.key?.trim() ?? '', subject = fields.subject?.trim() ?? '';
    const language = fields.language?.trim() ?? '', templateType = fields.templateType?.trim() ?? '';
    const safeBlocks = sanitizeEmailBlocks(this.blocks(), this.sanitizer);
    if (!name || !subject || !/^[a-z][a-z0-9-]{0,79}$/.test(key) || !language || !templateType ||
      !safeBlocks) {
      this.error.set('emailBuilder.validationError'); return;
    }
    const request: SaveBuilderEmailTemplate = {
      tenantId: this.tenantId, name, key, subject, language, templateType,
      definitionJson: JSON.stringify({ schemaVersion: 1, blocks: safeBlocks })
    };
    this.busy.set(true); this.error.set('');
    const operation = this.selected()
      ? this.api.updateEmailTemplate(this.applicationId, this.selected()!.id, request)
      : this.api.createEmailTemplate(this.applicationId, request);
    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: saved => {
        this.busy.set(false); this.selected.set(saved);
        this.details.set({ name, key, subject, language, templateType });
        this.notice.set('emailBuilder.saved');
        this.load();
      },
      error: () => { this.busy.set(false); this.error.set('emailBuilder.saveError'); }
    });
  }

  async deleteSelected(): Promise<void> {
    const item = this.selected(); if (!item || this.busy()) return;
    const accepted = await this.confirmation.confirm({ title: 'Delete email template?', message: `Delete “${item.name}”? This action cannot be undone.`, confirmText: 'Delete template', cancelText: 'Cancel', tone: 'danger' });
    if (!accepted) return;
    this.busy.set(true);
    this.api.deleteEmailTemplate(this.applicationId, item.id, this.tenantId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => { this.busy.set(false); this.editorOpen.set(false); this.selected.set(null); this.load(); },
      error: () => { this.busy.set(false); this.error.set('emailBuilder.deleteError'); }
    });
  }

}
