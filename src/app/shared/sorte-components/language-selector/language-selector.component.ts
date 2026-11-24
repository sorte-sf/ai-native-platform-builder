import { Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LanguageService } from '@core/services/language.service';

@Component({
  selector: 'ant-language-selector',
  standalone: true,
  styleUrl: './language-selector.component.scss',
  imports: [TranslocoPipe],
  templateUrl: './language-selector.component.html',
  inputs: ['id'],
})
export class LanguageSelectorComponent {
  readonly language = inject(LanguageService);
  id = 'language-selector';
}
