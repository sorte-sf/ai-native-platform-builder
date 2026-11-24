import { Component, afterEveryRender, inject, ElementRef, Renderer2, RendererStyleFlags2, input, output } from '@angular/core';
import { fieldStyleClass, sanitizeElementStyle } from '@core/builders/element-styling';
import { DynamicForm, type FormConfig } from '@ng-forge/dynamic-forms';

@Component({
  selector: 'ant-platform-dynamic-form',
  templateUrl: 'platform-dynamic-form.component.html',
  imports: [DynamicForm],
})
export class PlatformDynamicFormComponent {

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly applied = new WeakMap<HTMLElement, string[]>();

  constructor() {
    afterEveryRender(() => {
      const config = this.config() as FormConfig & { designerFieldStyles?: Record<string, unknown> };
      for (const [key, value] of Object.entries(config.designerFieldStyles ?? {})) {
        const style = sanitizeElementStyle(value);
        const element = this.host.nativeElement.querySelector<HTMLElement>(`.${fieldStyleClass(key)}`);
        if (!element) continue;
        this.applyStyle(element, style);
        const text = Object.fromEntries(Object.entries(style).filter(([key]) => key.startsWith('font-') || key.startsWith('text-') || ['color', 'letter-spacing', 'line-height'].includes(key)));
        element.querySelectorAll<HTMLElement>('label,input,textarea,select').forEach(child => this.applyStyle(child, text));
      }
    });
  }

  private applyStyle(element: HTMLElement, style: Record<string, string>): void {
    for (const key of this.applied.get(element) ?? []) if (!(key in style)) this.renderer.removeStyle(element, key, RendererStyleFlags2.DashCase);
    for (const [key, value] of Object.entries(style)) this.renderer.setStyle(element, key, value, RendererStyleFlags2.DashCase);
    this.applied.set(element, Object.keys(style));
  }

  readonly config = input.required<FormConfig>();
  readonly submitted = output<unknown>();

}
