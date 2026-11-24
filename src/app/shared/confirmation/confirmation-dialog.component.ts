import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslocoPipe } from '@jsverse/transloco';
import type { ConfirmationDialogOptions } from './confirmation.service';

@Component({
  standalone: true,
  selector: 'ant-confirmation-dialog',
  imports: [CommonModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirmation-dialog.component.html',
})
export class ConfirmationDialogComponent {
  readonly dialog = inject<ConfirmationDialogOptions>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ConfirmationDialogComponent, boolean>);

  accept(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
