import { TranslocoPipe } from '@jsverse/transloco';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { TemplateEditorDialogComponent } from './editor/template-editor-dialog.component';
import { TemplatePreviewDialogComponent } from './preview/template-preview-dialog.component';
import { BuildersApiService } from '@app/core/builders/builders-api.service';
import { BuilderTemplate } from '@app/core/builders/interfaces/builder-template';
import { ConfirmationService } from '@shared/confirmation/confirmation.service';

@Component({
  standalone: true,
  selector: 'antsoft-templates',
  styleUrl: './templates.component.scss',
  templateUrl: './templates.component.html',
  imports: [TranslocoPipe, MatCardModule, MatButtonModule, MatDialogModule],
})
export class TemplatesComponent implements OnInit {

  private readonly api = inject(BuildersApiService);
  private readonly dialog = inject(MatDialog);
  private readonly confirmation = inject(ConfirmationService);
  readonly templates = signal<BuilderTemplate[]>([]);
  readonly error = signal<string | null>(null);

  ngOnInit(): void { this.load(); }

  preview(template: BuilderTemplate): void {
    this.dialog.open(TemplatePreviewDialogComponent, {
      data: template, width: 'min(96vw, 1440px)', maxWidth: '96vw', maxHeight: '94vh', autoFocus: false
    });
  }

  load(): void {
    this.api.templates().subscribe({
      next: x => this.templates.set(x),
      error: err => this.error.set(err?.error?.detail ?? `Templates could not be loaded (${err.status}).`)
    });

  }

  edit(template: BuilderTemplate | null): void {
    if (template?.isBuiltIn) { this.error.set('Built-in templates are read-only. Create a new template to customize the blueprint.'); return; }
    const ref = this.dialog.open(TemplateEditorDialogComponent, {
      data: template, width: '680px', maxWidth: '95vw'
    });

    ref.afterClosed().subscribe(value => {
      if (!value) return;
      this.error.set(null);
      const call = template ? this.api.updateTemplate(template.id, value) : this.api.createTemplate(value);
      call.subscribe({ next: () => this.load(), error: err => this.error.set(err?.error?.detail ?? `Template could not be saved (${err.status}).`) });
    });

  }

  async remove(template: BuilderTemplate): Promise<void> {
    if (template.isBuiltIn) { this.error.set('Built-in templates cannot be deleted.'); return; }
    const accepted = await this.confirmation.confirm({ title: 'Delete template?', message: `Delete “${template.name}”? This action cannot be undone.`, confirmText: 'Delete template', cancelText: 'Cancel', tone: 'danger' });
    if (!accepted) return;
    this.api.deleteTemplate(template.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Template could not be deleted.')
    });
  }

}
