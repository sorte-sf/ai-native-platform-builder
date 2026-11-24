import { Component, input } from '@angular/core';

export type SortFlowVariant = 'primary' | 'secondary' | 'danger';

@Component({
  selector: 'sorte-flow',
  template: '<button [class]="buttonClass()" [type]="type()" [disabled]="disabled()"><ng-content /></button>',
  styles: `
    :host { display: inline-block; }
    button {
      min-height: 2.5rem;
      padding: 0.5rem 1rem;
      border: 2px solid transparent;
      border-radius: 0.375rem;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    button:focus-visible { outline: 3px solid #1d4ed8; outline-offset: 2px; }
    button:disabled { cursor: not-allowed; opacity: 0.6; }
    .primary { color: #fff; background: #174ea6; }
    .secondary { color: #172033; background: #f3f4f6; border-color: #64748b; }
    .danger { color: #fff; background: #a51d2d; }
  `,
})
export class SorteFlowComponent {
  readonly variant = input<SortFlowVariant>('primary');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);

  protected buttonClass(): string {
    return this.variant();
  }
}
