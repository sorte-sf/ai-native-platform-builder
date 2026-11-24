import { Component, input, signal } from '@angular/core';
import { TranslocoModule, TranslocoPipe } from '@jsverse/transloco';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import type { PageNode } from '@core/builders/page-blocks';

@Component({
  selector: 'ant-section-block',
  templateUrl: './section-block.component.html',
  styleUrl: './section-block.component.scss',
  imports: [CommonModule, TranslocoModule, NgTemplateOutlet],
})
export class SectionBlockComponent {
  readonly node = input.required<PageNode>();
  readonly active = signal(0);
  readonly designMode = input(false);
  select(index: number): void { this.active.set(index); }
}
