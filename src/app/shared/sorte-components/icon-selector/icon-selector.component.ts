import { CommonModule } from '@angular/common';
import { Component, EventEmitter, forwardRef, inject, Input, Output } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { UtilityService } from '@core/services/utility.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { FaIconListComponent } from './components/fa-icon-list/fa-icon-list.component';
import { IconModel } from './models/icon-model';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { IconService } from './services/icon.service';

@Component({
  selector: 'ant-icon-selector',
  templateUrl: './icon-selector.component.html',
  styleUrls: ['./icon-selector.component.scss'],
  host: { '[class.compact]': 'compact' },
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => IconSelectorComponent),
      multi: true
    },
  ],
  imports: [
    CommonModule,
    FormsModule,

    MatButtonModule,
    MatInputModule,

    FontAwesomeModule,

    ScrollingModule
  ]
})
export class IconSelectorComponent implements ControlValueAccessor {

  private _value = '';
  isDisabled = false;

  @Input()
  public get value(): string {
    return this._value;
  }

  public set value(val: string) {
    this.setValue(val, false);
  }

  @Output()
  valueChange = new EventEmitter<string>();

  @Input()
  label: string = '[Select Icon]';

  @Input() disabled = false;
  @Input() compact = false;

  _selectedIcon!: IconModel;

  get selectedIcon(): IconModel {
    return this._selectedIcon;
  }

  set selectedIcon(val: IconModel) {
    this.setValue(val.iconString, true);
  }

  onChange: any = () => {
  };
  onTouch: any = () => { };

  public dialog = inject(MatDialog);
  public utilityService = inject(UtilityService);
  private readonly iconService = inject(IconService);

  writeValue(obj: any): void {
    this.setValue(obj, false);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  private setValue(value: string | null | undefined, notify: boolean): void {
    this._value = value ?? '';
    const [prefix, name] = this.utilityService.resolveIcon(this._value, "['fas','circle-question']") as [string, string];
    const selected = this.iconService.list.find(icon => icon.prefix === prefix && icon.name === name)
      ?? this.iconService.list.find(icon => icon.name === 'circle-question')
      ?? this.iconService.list[0];
    this._selectedIcon = selected ?? new IconModel('fas', 'circle-question');
    if (notify) {
      this.onChange(this._value);
      this.onTouch();
      this.valueChange.emit(this._value);
    }
  }

  openDialog(): void {

    const dialogRef = this.dialog.open(FaIconListComponent, {
      width: 'min(96vw, 1100px)',
      maxWidth: '96vw',
      maxHeight: '90vh',
      panelClass: 'icon-selector-dialog',
      autoFocus: 'first-tabbable',
      data: this.selectedIcon,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) { return; }
      this.selectedIcon = result;
    });

  }

}
