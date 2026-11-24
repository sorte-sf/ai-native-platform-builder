import { CommonModule } from '@angular/common';
import { Component, inject, Inject, OnInit } from '@angular/core';
import { MatSnackBarRef, MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';

@Component({
    standalone: true,
    selector: 'ant-snackbar-dialog',
    templateUrl: './snackbar-dialog.component.html',
    styleUrls: ['./snackbar-dialog.component.scss'],
    imports: [
        CommonModule,
        TranslocoModule,
    ]
})
export class SnackBarDialogComponent {

    public type: string;
    public message: string;
    public snackbarRef: MatSnackBarRef<any>;

    private translocoService = inject(TranslocoService);

    constructor(
        @Inject(MAT_SNACK_BAR_DATA) public data: any,
    ) {
        this.type = this.getType(data.type);
        this.message = data.message;
        this.snackbarRef = data.ref;
    }

    public getType(type: string): string {
        switch (type) {
            case 'err-snackbar': {
                return this.translocoService.translate('notification.error.title');
            }
            case 'success-snackbar': {
                return this.translocoService.translate('snackbar.success');
            }

            default: {
                return this.translocoService.translate('snackbar.info');
            }
        }
    }

    public closeSnackBar(): void {
        this.snackbarRef.dismiss();
    }

}
