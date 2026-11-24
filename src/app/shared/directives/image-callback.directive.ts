import { Directive, ElementRef, HostListener, inject, input } from '@angular/core';
import { FALLBACK_IMAGE } from '@core/utils/base-constants';

@Directive({
  selector: 'img[imgCallback]',
  standalone: true
})
export class ImageCallbackDirective {

  imgCallback = input<string>();

  private readonly el = inject(ElementRef);

  @HostListener('error')
  onError(): void {
    const el = this.el.nativeElement as HTMLImageElement;
    if (el.dataset['fallbackApplied'] === 'true') return;
    el.dataset['fallbackApplied'] = 'true';
    el.className = 'flex item-center z-50 bg-gray-200 dark:bg-transparent rounded-full p-2 opacity-20';
    el.src = this.imgCallback() || FALLBACK_IMAGE;
  }

}
