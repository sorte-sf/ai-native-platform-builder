import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { SnackBarService } from '@app/core/services/snackbar.service';
import { PASSWORD_PATTERN } from '@app/core/utils/base-constants';
import { TranslocoModule } from '@jsverse/transloco';
import { RegisterTermsConditionsModalComponent } from '../terms/terms-conditions-modal.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MISSMATCH_VALIDATOR } from '@app/core/utils/custom-validators';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'ant-register-user',
  styleUrl: './register-user.css',
  templateUrl: './register-user.html',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatInputModule,
    MatIconModule,

    MatFormFieldModule,

    TranslocoModule
  ],
})
export class RegisterUser {
  isRequesting = false;
  showPassword = false;

  private dialog = inject(MatDialog);
  private _formBuilder = inject(FormBuilder);
  private snackbarService = inject(SnackBarService);

  signUpForm = this._formBuilder.nonNullable.group({
    fullName: ['', Validators.required],
    company: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
    passwordConfirm: ['', Validators.required],
    isAggrementApproved: [false, Validators.requiredTrue],
    registrationType: [true]
  }, { validators: MISSMATCH_VALIDATOR('password', 'passwordConfirm') });

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  signUp(): void {
    if (this.signUpForm.invalid || this.isRequesting) {
      return;
    }
 
    this.snackbarService.error('Registration is currently unavailable. Please contact your administrator.');

  }

  openTermsAndConditions(): void {
    this.dialog.open(RegisterTermsConditionsModalComponent, {
      data: null,
      autoFocus: false,
      restoreFocus: false,
      panelClass: ['w-[95%]', 'md:w-2/3', 'lg:w-1/3', 'h-[90%]', 'register-terms-conditions-modal']
    });

  }

}
