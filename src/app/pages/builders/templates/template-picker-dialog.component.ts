import { Component, inject, signal } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { TranslocoPipe } from '@jsverse/transloco';
import type { BuilderTemplate } from '@core/builders/interfaces/builder-template';
import { TemplatePreviewDialogComponent } from './preview/template-preview-dialog.component';
@Component({
  selector: 'ant-template-picker',
  templateUrl: './template-picker-dialog.component.html',
  styleUrl: './template-picker-dialog.component.scss',
  imports: [MatDialogModule, TranslocoPipe],
})
export class TemplatePickerDialogComponent {
  readonly templates = inject<BuilderTemplate[]>(MAT_DIALOG_DATA);
  readonly dialog = inject<MatDialogRef<TemplatePickerDialogComponent, string>>(MatDialogRef);
  private readonly modal = inject(MatDialog);
  readonly search = signal(''); readonly category = signal('');
  readonly categories = [...new Set(this.templates.map(template => template.category || 'General'))];

  isStudioTemplate(template: BuilderTemplate): boolean {
    return template.key?.startsWith('designer-studio:') ?? false;
  }

  grouped(): Array<{ key: 'prebuilt' | 'studio'; title: string; templates: BuilderTemplate[] }> {
    const templates = this.filtered();
    const groups: Array<{ key: 'prebuilt' | 'studio'; title: string; templates: BuilderTemplate[] }> = [
      { key: 'prebuilt', title: 'templatePicker.prebuilt', templates: templates.filter(template => !this.isStudioTemplate(template)) },
      { key: 'studio', title: 'templatePicker.studio', templates: templates.filter(template => this.isStudioTemplate(template)) }
    ];
    return groups.filter(group => group.templates.length > 0);
  }

  filtered() {
    const term = this.search().trim().toLocaleLowerCase();
    return this.templates.filter(template => (!this.category() || (template.category || 'General') === this.category()) && `${template.name} ${template.description ?? ''}`.toLocaleLowerCase().includes(term));
  }

  preview(template: BuilderTemplate): void {
    this.modal.open(TemplatePreviewDialogComponent, {
      data: template,
      width: 'min(96vw, 1440px)',
      maxWidth: '96vw',
      maxHeight: '94vh',
      autoFocus: false,
      ariaLabel: `Preview ${template.name}`
    });
  }

}
