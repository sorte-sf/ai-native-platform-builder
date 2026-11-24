import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
 
import { AuthService } from '@core/services/auth/auth.service';

@Component({
  selector: 'ant-logo-widget',
  templateUrl: './logo-widget.component.html',
  styleUrl: './logo-widget.component.scss',
  standalone: true,
  imports: [
    CommonModule
  ],
})
export class LogoWidgetComponent {

  @Input() variant: 'icon' | 'wordmark' = 'icon';
  hasLogoError = false;

  private readonly authService = inject(AuthService);

  get logo(): string {
    if (this.hasLogoError) return this.variant === 'wordmark' ? '/images/logo/logo.png' : '/images/logo/sm-logo.png';
    if (this.variant === 'wordmark') return '/images/logo/logo.png';
    const companyId = this.authService.getCompanyIdFromToken();
    return companyId
      ? `/images/logo/company-logo/${encodeURIComponent(companyId)}.jpg`
      : '/images/logo/sm-logo.png';
  }

  onLogoError(): void { this.hasLogoError = true; }

}
