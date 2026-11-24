import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
    selector: '[imageHoverPreview]',
    standalone: true
})
export class ImageHoverPreviewDirective {

    @Input() imageId: string='';
    private imagePreviewPopup: HTMLDivElement | null = null;

    constructor(private el: ElementRef) {}

    @HostListener('mouseenter', ['$event'])
    onMouseEnter(event: MouseEvent): void {
        const img = this.el.nativeElement as HTMLImageElement;
        const rect = img.getBoundingClientRect();

        this.hidePreview();

        const preview = document.createElement('div');
        preview.className = 'fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-2';
        preview.style.left = `${rect.right + 10}px`;
        preview.style.top = `${rect.top}px`;

        const image = document.createElement('img');
        image.className = 'max-w-[300px] max-h-[300px] object-contain';
        image.onerror = () => {
            image.src = 'images/placeholders/placeholder-small.png';
        };
        
        image.src = this.getPhotoLink(this.imageId);
        preview.appendChild(image);

        document.body.appendChild(preview);
        this.imagePreviewPopup = preview;
    }

    @HostListener('mouseleave')
    onMouseLeave(): void {
        this.hidePreview();
    }

    private hidePreview(): void {
        if (this.imagePreviewPopup) {
            this.imagePreviewPopup.remove();
            this.imagePreviewPopup = null;
        }
    }

    private getPhotoLink(id: string): string {
        return `${location.origin}/photos/${id}.jpg`;
    }

}
