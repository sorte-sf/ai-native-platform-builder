import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';

@Component({
  standalone: true,
  selector: 'app-language-selector',
  templateUrl: './language-selector.html',
  styleUrls: ['./language-selector.css'],
  imports: [FontAwesomeModule, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LanguageSelectorComponent {
  private readonly translocoService = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  readonly availableLangs = ['en', 'tr'];
  readonly activeLang = signal((typeof localStorage !== 'undefined' ? localStorage.getItem('hotel.language') : null) ?? this.translocoService.getActiveLang() ?? 'en');
  readonly icons = {
    open: faChevronDown
  };

  constructor() {
    this.translocoService.langChanges$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(lang => this.activeLang.set(lang));
  }

  changeLang(lang: string) {
    if (typeof localStorage !== 'undefined') localStorage.setItem('hotel.language', lang);
    this.translocoService.setActiveLang(lang);
    this.activeLang.set(lang);
  }

}
