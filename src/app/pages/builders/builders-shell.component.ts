import { TranslocoModule, TranslocoPipe } from '@jsverse/transloco';
import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { LanguageSelectorComponent } from '@app/shared/sorte-components/language-selector/language-selector.component';
import { filter } from 'rxjs';

@Component({
  standalone: true,
  selector: 'ant-builders-shell',
  templateUrl: './builders-shell.component.html',
  styleUrl: './builders-shell.component.scss',
  imports: [
    TranslocoModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    FaIconComponent,
    LanguageSelectorComponent],
})
export class BuildersShellComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly applicationSelected = signal(this.router.url.includes('/applications'));
  readonly darkMode = signal(typeof localStorage === 'undefined' || localStorage.getItem('sorte-builder-theme') !== 'light');
  readonly sidebarCollapsed = signal(typeof localStorage !== 'undefined' && localStorage.getItem('antsoft-builder-sidebar') === 'collapsed');
  readonly accountMenuOpen = signal(false);

  constructor() {
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.applicationSelected.set(event.urlAfterRedirects.includes('/applications')));
  }

  toggleTheme(): void {
    const dark = !this.darkMode();
    this.darkMode.set(dark);
    if (typeof localStorage !== 'undefined') localStorage.setItem('sorte-builder-theme', dark ? 'dark' : 'light');
  }

  toggleSidebar(): void {
    const collapsed = !this.sidebarCollapsed();
    this.sidebarCollapsed.set(collapsed);
    if (typeof localStorage !== 'undefined') localStorage.setItem('antsoft-builder-sidebar', collapsed ? 'collapsed' : 'expanded');
  }

  toggleAccountMenu(): void {
    this.accountMenuOpen.update(open => !open);
  }

}
