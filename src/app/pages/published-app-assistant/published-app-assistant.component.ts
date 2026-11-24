import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { BuildersApiService, PublishedUiResult, UserFavouriteLink } from '@core/builders/builders-api.service';
import { PublishedApplicationSessionService } from '@core/services/auth/published-application-session.service';

@Component({
  selector: 'ant-published-app-assistant', standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './published-app-assistant.component.html',
  styleUrl: './published-app-assistant.component.scss'
})
export class PublishedAppAssistantComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(BuildersApiService);
  readonly userSession = inject(PublishedApplicationSessionService);
  readonly tenantId = this.route.snapshot.paramMap.get('tenantId') ?? '';
  readonly applicationId = this.route.snapshot.paramMap.get('applicationId') ?? '';
  readonly signedIn = computed(() => {
    const current = this.userSession.session();
    return !!current && current.applicationId === this.applicationId && current.tenantId === this.tenantId &&
      !current.mustChangePassword && new Date(current.expiresAt).getTime() > Date.now();
  });

  email = '';
  password = '';
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  readonly prompt = signal('');
  readonly favouriteName = signal('');
  readonly result = signal<PublishedUiResult | null>(null);
  readonly favourites = signal<UserFavouriteLink[]>([]);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  constructor() {
    const current = this.userSession.session();
    if (current?.applicationId !== this.applicationId || current?.tenantId !== this.tenantId) this.userSession.logout();
    else if (current && new Date(current.expiresAt).getTime() > Date.now() && !current.mustChangePassword) this.loadFavourites();
  }

  login(): void {
    if (this.busy() || !this.tenantId || !this.applicationId || !this.email.trim() || !this.password) return;
    this.busy.set(true); this.error.set(''); this.notice.set('');
    this.api.loginPublishedApplicationUser(this.tenantId, this.applicationId, this.email.trim(), this.password).subscribe({
      next: response => {
        this.userSession.set({ ...response, tenantId: this.tenantId, applicationId: this.applicationId });
        this.password = ''; this.busy.set(false);
        if (response.mustChangePassword) this.notice.set('Change your temporary password to continue.');
        else this.loadFavourites();
      },
      error: () => { this.error.set('Unable to sign in. Check your credentials and access to this application.'); this.busy.set(false); }
    });
  }

  changePassword(): void {
    if (this.busy() || !this.currentPassword || this.newPassword.length < 12 || this.newPassword !== this.confirmPassword) return;
    this.busy.set(true); this.error.set('');
    this.api.changePublishedApplicationPassword(this.currentPassword, this.newPassword, this.confirmPassword).subscribe({
      next: () => {
        this.userSession.logout(); this.currentPassword = ''; this.newPassword = ''; this.confirmPassword = '';
        this.notice.set('Password changed. Sign in with your new password.'); this.busy.set(false);
      },
      error: response => { this.error.set(response?.error?.message ?? 'Password could not be changed.'); this.busy.set(false); }
    });
  }

  generate(): void {
    if (this.busy() || !this.prompt().trim()) return;
    this.busy.set(true); this.error.set(''); this.notice.set(''); this.result.set(null);
    this.api.generatePublishedUi(this.applicationId, this.prompt().trim()).subscribe({
      next: value => { this.result.set(value); this.favouriteName.set(value.answer.slice(0, 80) || 'My view'); this.busy.set(false); },
      error: response => { this.error.set(response?.error?.message ?? response?.error?.detail ?? 'Could not generate a view. Check your application access and AI configuration.'); this.busy.set(false); }
    });
  }

  loadFavourites(): void {
    this.api.userFavouriteLinks(this.applicationId).subscribe({
      next: links => this.favourites.set(links),
      error: response => this.error.set(response?.error?.message ?? 'Saved views could not be loaded.')
    });
  }

  saveFavourite(): void {
    const result = this.result();
    if (!result || !this.favouriteName().trim() || this.busy()) return;
    this.busy.set(true); this.error.set('');
    this.api.saveUserFavourite(this.applicationId, this.favouriteName().trim(), result.specification, result.id).subscribe({
      next: saved => {
        this.result.update(value => value ? { ...value, id: saved.id, name: saved.name } : value);
        this.notice.set('View saved to your favourites.'); this.loadFavourites(); this.busy.set(false);
      },
      error: response => { this.error.set(response?.error?.message ?? 'Could not save this view.'); this.busy.set(false); }
    });
  }

  openFavourite(item: UserFavouriteLink): void {
    this.busy.set(true); this.error.set(''); this.notice.set('');
    this.api.openUserFavourite(this.applicationId, item.id).subscribe({
      next: value => { this.result.set(value); this.favouriteName.set(item.name); if (value.versionChanged) this.notice.set('This view was checked against the latest published version and your current access.'); this.busy.set(false); },
      error: response => { this.error.set(response?.error?.message ?? 'This saved view is no longer available with your current access.'); this.busy.set(false); this.loadFavourites(); }
    });
  }

  deleteFavourite(item: UserFavouriteLink): void {
    this.api.deleteUserFavourite(this.applicationId, item.id).subscribe({
      next: () => { this.favourites.update(items => items.filter(value => value.id !== item.id)); if (this.result()?.id === item.id) this.result.set(null); },
      error: () => this.error.set('Could not remove this saved view.')
    });
  }

  logout(): void { this.userSession.logout(); this.result.set(null); this.favourites.set([]); this.error.set(''); this.notice.set(''); }
  chartWidth(value: number, groups?: Array<{ value: number }>): number {
    const max = Math.max(1, ...(groups ?? []).map(group => group.value));
    return Math.max(3, Math.round(value / max * 100));
  }
}
