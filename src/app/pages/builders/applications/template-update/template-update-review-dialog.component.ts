import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslocoPipe } from '@jsverse/transloco';
import { BuildersApiService, TemplateUpdateReview } from '@app/core/builders/builders-api.service';
import { BuilderApplication } from '@app/core/builders/interfaces/builder-application';

export interface TemplateUpdateReviewDialogData { app: BuilderApplication; review: TemplateUpdateReview; }

@Component({
  standalone: true,
  selector: 'ant-template-update-review-dialog',
  templateUrl: './template-update-review-dialog.component.html',
  styleUrls: ['./template-update-review-dialog.component.scss'],
  imports: [CommonModule, MatDialogModule, TranslocoPipe],  
})
export class TemplateUpdateReviewDialogComponent {
  readonly data = inject<TemplateUpdateReviewDialogData>(MAT_DIALOG_DATA);
  private readonly api = inject(BuildersApiService);
  private readonly dialog = inject<MatDialogRef<TemplateUpdateReviewDialogComponent, { applied: boolean; added: number; version: string; error?: boolean }>>(MatDialogRef);
  readonly applying = signal(false);

  actionLabel(action: string): string {
    return action === 'add' || action === 'included-with-object' || action === 'add-if-missing'
      ? 'workspace.templateUpdateAdd'
      : action === 'update-if-unchanged' ? 'workspace.templateUpdateConditional' : 'workspace.templateUpdatePreserve';
  }

  apply(): void {
    const releaseId = this.data.review.releaseId;
    if (!releaseId || !this.data.review.canApply || this.applying()) return;
    this.applying.set(true);
    this.api.applyTemplateUpdate(this.data.app.id, this.data.app.tenantId, releaseId).subscribe({
      next: result => this.dialog.close({ applied: result.applied, added: result.added, version: result.version }),
      error: error => { this.applying.set(false); this.dialog.close({ applied: false, added: 0, version: error?.error?.message ?? '', error: true }); }
    });
  }
}
