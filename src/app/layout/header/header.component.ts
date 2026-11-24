import { CommonModule } from '@angular/common';
import { Component, input, output, signal } from '@angular/core';
import { LanguageSelectorComponent } from '@app/shared/sorte-components/language-selector/language-selector.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBars, faAnglesLeft, faAnglesRight, faGlobe, faMagnifyingGlass, faMoon, faSun, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { TranslocoModule } from '@jsverse/transloco';
import { AntAssistant } from '@app/assistant/assistant.component';

@Component({
  selector: 'ant-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  imports: [
    CommonModule,
    FontAwesomeModule,
    TranslocoModule,
    AntAssistant,
    LanguageSelectorComponent
  ],

})
export class HeaderComponent {
  readonly navigationToggle = output<void>();
  readonly sidenavToggle = output<void>();
  readonly themeToggle = output<void>();
  readonly collapsed = input(false);
  readonly darkMode = input(true);
  readonly title = signal('Builder workspace');

  readonly icons = {
    bars: faBars,
    collapse: faAnglesLeft,
    expand: faAnglesRight,
    globe: faGlobe,
    search: faMagnifyingGlass,
    moon: faMoon,
    sun: faSun,
    signOut: faRightFromBracket
  };

}
