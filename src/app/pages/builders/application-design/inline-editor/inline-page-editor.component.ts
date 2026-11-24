import { TranslocoPipe } from '@jsverse/transloco';
import { Component, ElementRef, afterNextRender, input, output, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'ant-inline-page-editor',
  templateUrl: './inline-page-editor.component.html',
  imports: [TranslocoPipe, ReactiveFormsModule],

})
export class InlinePageEditorComponent {
  readonly busy = input(false);
  readonly error = input('');
  readonly createPage = output<string>();
  readonly cancelled = output<void>();
  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)] })
  });

  private readonly titleInput = viewChild<ElementRef<HTMLInputElement>>('titleInput');

  constructor() { afterNextRender(() => this.titleInput()?.nativeElement.focus()); }

  invalid(): boolean { return this.form.controls.title.touched && this.form.controls.title.invalid; }
  create(): void {
    if (this.busy()) return;
    this.form.markAllAsTouched();
    if (this.form.valid) this.createPage.emit(this.form.controls.title.value.trim());
  }
  cancel(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (!this.busy()) this.cancelled.emit();
  }

}
