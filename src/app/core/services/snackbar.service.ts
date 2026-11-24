import { inject, Injectable } from '@angular/core';
import {
    MatSnackBar,
    MatSnackBarConfig,
    MatSnackBarHorizontalPosition,
    MatSnackBarRef,
    MatSnackBarVerticalPosition,
    TextOnlySnackBar
} from '@angular/material/snack-bar';

import { TranslocoService } from '@jsverse/transloco';

import { SnackBarDialogComponent } from '@shared/snackbar-dialog/snackbar-dialog.component';

@Injectable({ providedIn: 'root' })
export class SnackBarService {

    snackBarConfig: any;
    snackBarRef: any;
    dismissed: any;
    horizontalPosition: MatSnackBarHorizontalPosition = 'right';
    verticalPosition: MatSnackBarVerticalPosition = 'top';
    snackBarAutoHide = 8000;
    panelClass: any = 'err-snackbar';

    private snackBar = inject(MatSnackBar);
    private translocoService = inject(TranslocoService);

    public success(message: string, translate: boolean = true): MatSnackBarRef<any> {
        this.panelClass = 'success-snackbar';
        this.openSnackBar(message, translate);
        return this.snackBarRef;
    }

    public error(message: string, translate: boolean = true): MatSnackBarRef<any> {
        this.panelClass = 'err-snackbar';
        this.openSnackBar(message, translate);
        return this.snackBarRef;
    }

    public warning(message: string, translate: boolean = true): MatSnackBarRef<any> {
        this.panelClass = 'default-snackbar';
        this.openSnackBar(message, translate);
        return this.snackBarRef;
    }

    public info(message: string, translate: boolean = true): MatSnackBarRef<any> {
        this.panelClass = 'info-snackbar';
        this.openSnackBar(message, translate);
        return this.snackBarRef;
    }

    pushNotification(message: string, translate: boolean = true): MatSnackBarRef<TextOnlySnackBar> {
        this.panelClass = 'info-snackbar';
        this.openSnackBar(message, translate);
        return this.snackBarRef;
    }

    private openSnackBar(message: string, transloo: boolean = false): MatSnackBarRef<any> {
        this.snackBarConfig = new MatSnackBarConfig();
        this.snackBarConfig.horizontalPosition = this.horizontalPosition;
        this.snackBarConfig.verticalPosition = this.verticalPosition;
        this.snackBarConfig.duration = this.snackBarAutoHide;
        this.snackBarConfig.panelClass = this.panelClass;

        message = transloo ? this.translocoService.translate(message) : message;

        this.snackBarRef = this.snackBar.openFromComponent(SnackBarDialogComponent,
            {
                horizontalPosition: this.horizontalPosition,
                verticalPosition: this.verticalPosition,
                duration: this.snackBarAutoHide,
                panelClass: this.panelClass,
                data: { message, type: this.panelClass, ref: this.snackBar },
            }
        );
        return this.snackBarRef;
    }

}
