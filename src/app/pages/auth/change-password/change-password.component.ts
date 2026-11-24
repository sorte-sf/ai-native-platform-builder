import { TranslocoPipe } from '@jsverse/transloco';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  standalone: true,
  selector: 'ant-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss'],
  imports: [TranslocoPipe, ReactiveFormsModule],

})
export class ChangePasswordComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly dialogRef = inject(MatDialogRef<ChangePasswordComponent>, { optional: true });
  loading = false;
  error = '';
  readonly form = new FormGroup(
    {
      currentPassword: new FormControl('', { nonNullable: true }),
      newPassword: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
      confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] })
    });

  submit(): void {
    if (this.form.invalid || this.form.value.newPassword !== this.form.value.confirmPassword ||
        this.auth.isBuilderWorkspaceUser() && !this.form.controls.currentPassword.value) {
      this.error = 'ui.password_mismatch';
      return;
    }

    this.loading = true;
    this.error = '';
    this.auth.changePassword(this.form.getRawValue())
      .subscribe({
        next: () => {
          if (this.dialogRef) this.dialogRef.close(true);
          else void this.router.navigateByUrl('/builder');
        },
        error: () => { this.error = 'ui.password_update_failed'; this.loading = false; }
      });
  }
}
