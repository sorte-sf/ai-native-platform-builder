import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslocoPipe } from '@jsverse/transloco';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowLeft, faEye, faFilePdf, faRotate } from '@fortawesome/free-solid-svg-icons';
import { AuthService } from '@core/services/auth/auth.service';
import { BuilderApplicationDocument, BuildersApiService } from '@core/builders/builders-api.service';

@Component({
  standalone: true,
  selector: 'ant-application-documents',
  imports: [CommonModule, RouterLink, TranslocoPipe, FontAwesomeModule],
  templateUrl: './application-documents.component.html',
  styleUrl: './application-documents.component.scss'
})
export class ApplicationDocumentsComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly api = inject(BuildersApiService);
  private readonly destroyRef = inject(DestroyRef);
  readonly applicationId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly tenantId = this.route.snapshot.queryParamMap.get('tenantId') ?? this.auth.tenantId() ?? '';
  readonly icons = { back: faArrowLeft, preview: faEye, pdf: faFilePdf, reload: faRotate };
  readonly documents = signal<BuilderApplicationDocument[]>([]);
  readonly busy = signal(false);
  readonly uploading = signal(false);
  readonly previewingId = signal<string | null>(null);
  readonly error = signal('');
  readonly notice = signal('');

  constructor() { this.load(); }

  load(): void {
    if (!this.applicationId || !this.tenantId) { this.error.set('Could not identify the application or tenant.'); return; }
    this.busy.set(true); this.error.set('');
    this.api.applicationSolutionDocuments(this.applicationId, this.tenantId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: documents => { this.documents.set(documents); this.busy.set(false); },
        error: () => { this.busy.set(false); this.error.set('Could not load application documents. Check your access and try again.'); }
      });
  }

  upload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0]; input.value = '';
    if (!file || this.uploading()) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      this.error.set('Choose a PDF document.'); return;
    }
    if (file.size <= 0 || file.size > 5_000_000) {
      this.error.set('PDF files must be no larger than 5 MB.'); return;
    }
    this.uploading.set(true); this.error.set(''); this.notice.set('');
    this.api.uploadApplicationSolution(this.applicationId, this.tenantId, file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          this.uploading.set(false);
          this.notice.set(result.indexStatus === 'indexed'
            ? `${result.title} uploaded and indexed (${result.chunksIndexed} sections).`
            : `${result.title} uploaded. Search indexing is still processing.`);
          this.load();
        },
        error: response => {
          this.uploading.set(false);
          this.error.set(response?.error?.detail ?? response?.error?.title ?? 'The PDF could not be uploaded.');
        }
      });
  }

  preview(document: BuilderApplicationDocument): void {
    if (!document.fileId || this.previewingId()) return;
    const previewWindow = window.open('about:blank', '_blank');
    if (!previewWindow) { this.error.set('Allow pop-ups to preview this PDF.'); return; }
    previewWindow.opener = null;
    previewWindow.document.title = document.fileName;
    previewWindow.document.body.textContent = 'Opening PDF preview…';
    this.previewingId.set(document.id); this.error.set('');
    this.api.applicationSolutionFile(this.applicationId, this.tenantId, document.fileId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: file => {
          this.previewingId.set(null);
          const url = URL.createObjectURL(file);
          previewWindow.location.replace(url);
          window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
        },
        error: () => {
          this.previewingId.set(null); previewWindow.close();
          this.error.set(`Could not open ${document.fileName}.`);
        }
      });
  }

  formatSize(size: number | null): string {
    if (size === null) return '—';
    return size < 1_000_000 ? `${Math.max(1, Math.round(size / 1000))} KB` : `${(size / 1_000_000).toFixed(1)} MB`;
  }
}
