import { Component, EventEmitter, HostListener, Input, Output, signal } from '@angular/core';
import { ColorEvent } from 'ngx-color';
import { ColorSketchModule } from 'ngx-color/sketch';

@Component({
  selector: 'ant-brand-color-picker',
  standalone: true,
  templateUrl: './brand-color-picker.component.html',
  styleUrl: './brand-color-picker.component.scss',
  imports: [ColorSketchModule],
})
export class BrandColorPickerComponent {
  @Input() label = 'Color';
  @Input() color = '#5e4fa2';
  @Input() disabled = false;
  @Output() colorChange = new EventEmitter<string>();
  readonly open = signal(false);
  readonly brandPalette = ['#5e4fa2', '#ee378a', '#faa61a', '#a065aa', '#1f2937', '#56616d', '#f2f2f2', '#f7edf7', '#dcdee2', '#ffffff', '#000000'];

  choose(event: ColorEvent): void {
    const hex = event.color.hex;
    if (/^#[0-9a-f]{6}$/i.test(hex)) this.colorChange.emit(hex.toLowerCase());
  }

  @HostListener('document:click')
  closeOnOutsideClick(): void { this.open.set(false); }
}
