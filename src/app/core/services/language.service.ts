import { effect, Injectable, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { UserProfileStateService } from './user-profile-state.service';

export type SupportedLanguage = 'en' | 'tr';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly transloco = inject(TranslocoService);
  private readonly profileState = inject(UserProfileStateService);
  readonly active = signal<SupportedLanguage>(this.initialLanguage());

  constructor() {
    this.transloco.setActiveLang(this.active());
    effect(() => {
      if (!this.profileState.loaded()) return;
      const language = this.profileState.appState().appearance?.language;
      if (language === 'en' || language === 'tr') this.apply(language);
    });
  }

  use(language: SupportedLanguage): void {
    this.apply(language);
    this.profileState.setLanguage(language);
  }

  private apply(language: SupportedLanguage): void {
    this.active.set(language);
    this.transloco.setActiveLang(language);
    if (typeof localStorage !== 'undefined') localStorage.setItem('antsoft-builder-language', language);
    document.documentElement.lang = language;
  }

  toggle(): void { this.use(this.active() === 'en' ? 'tr' : 'en'); }

  private initialLanguage(): SupportedLanguage {
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('antsoft-builder-language') : null;
    if (stored === 'en' || stored === 'tr') return stored;
    return navigator.language.toLowerCase().startsWith('tr') ? 'tr' : 'en';
  }
}
