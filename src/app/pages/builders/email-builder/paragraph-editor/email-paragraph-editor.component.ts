import { Component, effect, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { QuillEditorComponent } from 'ngx-quill';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ant-email-paragraph-editor',
  templateUrl: 'email-paragraph-editor.component.html',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    QuillEditorComponent
  ],
})
export class EmailParagraphEditorComponent {
  readonly value = input.required<string>();
  readonly placeholder = input('');
  readonly valueChange = output<string>();
  readonly control = new FormControl('', { nonNullable: true });
  
  readonly formats = [
    'bold',
    'italic',
    'underline',
    'strike',
    'blockquote',
    'code-block',
    'header',
    'list',
    'script',
    'indent',
    'direction',
    'size',
    'color',
    'background',
    'font',
    'align',
    'link'
  ];

   readonly  toolbars = [
    ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
    ['blockquote', 'code-block'],
    [{ 'header': 1 }, { 'header': 2 }],               // custom button values
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
    [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
    [{ 'direction': 'rtl' }],                         // text direction
    [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
    [{ 'font': [] }],
    [{ 'align': [] }],
    ['clean'],                                         // remove formatting button
    ['link', 'image', 'video']                         // link and image, video
  ]

  readonly modules = { toolbar: this.toolbars };

  constructor() {
    effect(() => {
      if (this.value() !== this.control.value) this.control.setValue(this.value(), { emitEvent: false });
    });

    this.control.valueChanges.pipe(takeUntilDestroyed())
      .subscribe(value => this.valueChange.emit(value || JSON.stringify({ ops: [{ insert: '\n' }] }))
      );

  }

}
