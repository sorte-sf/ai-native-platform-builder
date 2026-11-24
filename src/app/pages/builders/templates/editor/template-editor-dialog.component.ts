import { TranslocoPipe } from '@jsverse/transloco';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { BuilderTemplate } from '@app/core/builders/interfaces/builder-template';

@Component({
  standalone: true,
  templateUrl: './template-editor-dialog.component.html',
  styleUrl: './template-editor-dialog.component.scss',
  imports: [TranslocoPipe, ReactiveFormsModule, MatDialogModule, MatButtonModule],

})
export class TemplateEditorDialogComponent {
  readonly data = inject<BuilderTemplate | null>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<TemplateEditorDialogComponent>);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    name: [this.data?.name ?? '', Validators.required],
    description: [this.data?.description ?? ''],
    htmlContent: [this.data?.htmlContent ?? '', Validators.required],
    scssContent: [this.data?.scssContent ?? ''],
    manifestJson: [this.data?.manifestJson ?? ''],
    themeJson: [this.data?.themeJson ?? '']
  });

  save(): void {
    if (!this.form.valid) return;
    for (const key of ['manifestJson', 'themeJson'] as const) {
      const value = this.form.controls[key].value;
      if (value) {
        try { JSON.parse(value); }
        catch { this.form.controls[key].setErrors({ invalidJson: true }); return; }
      }
    }
    this.ref.close(this.form.getRawValue());
  }

}
