import { TranslocoModule, TranslocoPipe } from '@jsverse/transloco';
import { AfterViewInit, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { BuilderTemplate } from '@app/core/builders/interfaces/builder-template';
import { CommonModule } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

type PreviewMode = 'web' | 'tablet' | 'mobile';

@Component({
  standalone: true,
  selector: 'antsoft-template-preview-dialog',
  templateUrl: 'template-preview-dialog.component.html',
  styleUrl: 'template-preview-dialog.component.scss',
  imports:[
    CommonModule,
    FontAwesomeModule,
    TranslocoModule
  ]

})
export class TemplatePreviewDialogComponent implements AfterViewInit {
  readonly template = inject<BuilderTemplate>(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<TemplatePreviewDialogComponent>);
  readonly mode = signal<PreviewMode>('web');
  @ViewChild('frame', { static: true }) private frame!: ElementRef<HTMLIFrameElement>;

  ngAfterViewInit(): void {
    // The empty sandbox keeps template markup and styles isolated from the Builder app.
    const css = (this.template.scssContent ?? '').replace(/<\/style/gi, '<\\/style');
    this.frame.nativeElement.srcdoc = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;font-family:system-ui,sans-serif}</style><style>${css}</style></head><body>${this.template.htmlContent ?? ''}</body></html>`;
  }

}
