import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

export type ConfirmationTone = 'default' | 'danger' | 'warning';

export type ConfirmationDialogOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmationTone;
};

@Injectable({ providedIn: 'root' })
export class ConfirmationService {
  private readonly dialog = inject(MatDialog);

  async confirm(options: ConfirmationDialogOptions): Promise<boolean> {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: options,
      autoFocus: false,
      restoreFocus: false,
      disableClose: true,
      width: 'min(28rem, calc(100vw - 2rem))',
      maxWidth: 'calc(100vw - 2rem)',
      panelClass: 'hotel-confirmation-overlay'
    });
    return (await firstValueFrom(dialogRef.afterClosed())) === true;
  }
}
