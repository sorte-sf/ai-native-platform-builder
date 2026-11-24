import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { AuthService } from '@app/core/services/auth/auth.service';
import { TranslocoModule } from '@jsverse/transloco';
import { finalize } from 'rxjs';

@Component({
  selector: 'ant-reset-password',
  styleUrl: './reset-password.css',
  templateUrl: './reset-password.html',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    
    TranslocoModule
  ],
})
export class ResetPassword {

  forgotForm!: FormGroup;
  isRequesting = false;

  private router = inject(Router);
  private _authService = inject(AuthService);
  private _formBuilder = inject(FormBuilder);

  ngOnInit(): void {
    this.forgotForm = this._formBuilder.nonNullable.group({
      forgotEmail: new FormControl<string>('', [Validators.required, Validators.email]),
    });
  }
 
  sendForgotPassword(): void {
    this.isRequesting = true;
    this._authService.sendForgetPassword(this.forgotForm.controls['forgotEmail'].value)
      .pipe(finalize(() => this.isRequesting = false))
      .subscribe(() => {
        this.router.navigate(['/reset-password-confirmation']);
      });
  }

}
