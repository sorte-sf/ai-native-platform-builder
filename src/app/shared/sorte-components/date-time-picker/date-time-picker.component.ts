/* eslint-disable arrow-body-style */
import { Component, ElementRef, EventEmitter, inject, Input, Output, ViewChild } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { MatDateRangePicker, MatDatepicker, MatDatepickerModule } from '@angular/material/datepicker';
import { RangeDateTimePickerData, DateTimePickerData } from './models/date-time-picker-event';
import { MAT_DATE_FORMATS } from '@angular/material/core';

//import { OverlayModule } from '@angular/cdk/overlay';

import { OverlayOutsideClickDispatcher } from '@angular/cdk/overlay';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslocoModule } from '@jsverse/transloco';

import { take } from 'rxjs';
import { Moment } from 'moment';
import moment from 'moment';
import { CustomDateFormat } from '@app/core/utils/custom-date-format-util'; 
import { DAY_MONTH_YEAR_FORMATS } from '@app/core/utils/base-constants';
 
@Component({

  selector: 'app-date-time-picker',
  templateUrl: './date-time-picker.component.html',
  styleUrls: ['./date-time-picker.component.scss'],
  imports: [
    FormsModule,
    ReactiveFormsModule,

    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,

    TranslocoModule
  ],
  providers: [
    { provide: NG_VALUE_ACCESSOR, multi: true, useExisting: DateTimePickerComponent },
    { provide: MAT_DATE_FORMATS, useValue: DAY_MONTH_YEAR_FORMATS },
  ]

})
export class DateTimePickerComponent implements ControlValueAccessor {

  @ViewChild('rangePicker') rangePicker?: MatDateRangePicker<Moment>;
  @ViewChild('datepicker') datepicker?: MatDatepicker<Moment>;
  @ViewChild('rangePickerActions') rangePickerActions?: ElementRef<HTMLDivElement>;

  @Input() range: boolean = false;
  @Input() date: Date | Moment | null = null;
  @Input() startDate: Date | Moment | null = null;
  @Input() endDate: Date | Moment | null = null;
  @Input() rangeStartPlaceholderText: string = 'action.startdate';
  @Input() rangeEndPlaceholderText: string = 'action.enddate';
  @Input() datePlaceholderText: string = 'action.pickdate';
  @Input() rangeDatePlaceholderText: string = 'action.pickdaterange';
  @Input() rangeMaxDayDiff: number | null = null;

  @Output() dateChanged = new EventEmitter<RangeDateTimePickerData | DateTimePickerData>();

  _showTime: boolean = true;

  hours = [...Array(24).keys()].map((i) => { return { value: i, text: i.toString().padStart(2, '0') }; });
  mins = [...Array(60).keys()].map((i) => { return { value: i, text: i.toString().padStart(2, '0') }; });

  fromHour: number = 0;
  fromMin: number = 0;
  toHour: number = 23;
  toMin: number = 59;

  touched = false;
  disabled = false;

  //need this to prevent auto closing after endDate Selection
  private rangePickerSelfClose?: () => void;

  public readonly dateFormatConfig = inject<CustomDateFormat>(MAT_DATE_FORMATS);
  private readonly cdkConnectedOverlay = inject(OverlayOutsideClickDispatcher);

  get maxRangeEndDate(): Moment | null {
    const maxDays = this.rangeMaxDayDiff;
    return this.startDate && maxDays != null && maxDays > 0
      ? moment(this.startDate).add(maxDays, 'days')
      : null;
  }

  @Input() set showTime(val: boolean) {
    this._showTime = val;
    if (!this._showTime) {
      this.fromHour = 0;
      this.fromMin = 0;
      this.toHour = 23;
      this.toMin = 59;
    }
    this.dateFormatConfig.showTime = this._showTime; // need this so date picker label will show/hide time
    this.dateChange();
  }



  rangePickerOpened(): void {
    if (!this.rangePicker || !this.rangePickerActions) {
      return;
    }

    if (!this.rangePickerSelfClose) {
      this.rangePickerSelfClose = this.rangePicker.close;
    }

    // rewrite autoclose after date is chosen
    this.rangePicker.close = (): void => { };

    this.cdkConnectedOverlay._attachedOverlays[0]?.outsidePointerEvents().pipe(take(1)).subscribe(() => {
      // restore saved close method
      this.restoreRangePickerCloseMethod();
    });

    const container = document.getElementsByClassName('mat-datepicker-content-container');
    if (!container || !container.length) {
      return;
    }

    const containerEl = container.item(0) as HTMLDivElement;
    containerEl.appendChild(this.rangePickerActions.nativeElement);
  }

  rangeStartDateChange(): void {
  }

  rangeEndDateChange(): void {
    this.dateChange(false);
  }

  onChange: (date: RangeDateTimePickerData | Date | null) => void = () => {};
  onTouched: () => void = () => {};
  writeValue(date: RangeDateTimePickerData | Date | null): void {
    if (!date) {
      this.startDate = null;
      this.endDate = null;
      this.fromHour = 0;
      this.fromMin = 0;
      this.toHour = 23;
      this.toMin = 59;
      return;
    }

    const offset = new Date().getTimezoneOffset() * -1;
    if (this.range) {
      const _startDate = (date as RangeDateTimePickerData).startDate;
      const _endDate = (date as RangeDateTimePickerData).endDate;

      this.startDate = _startDate ? moment(_startDate).subtract(offset, 'minutes') : null;
      this.endDate = _endDate ? moment(_endDate).subtract(offset, 'minutes') : null;
      this.fromHour = (this.startDate ? moment(this.startDate).hours() : 0);
      this.fromMin = (this.startDate ? moment(this.startDate).minutes() : 0);
      this.toHour = (this.endDate ? moment(this.endDate).hours() : 23);
      this.toMin = (this.endDate ? moment(this.endDate).minutes() : 59);

    } else {
      this.startDate = moment((date as Date)).subtract(offset, 'minutes');
    }
  }

  registerOnChange(onChange: (date: RangeDateTimePickerData | Date | null) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: () => void): void {
    this.onTouched = onTouched;
  }

  markAsTouched(): void {
    if (!this.touched) {
      this.onTouched();
      this.touched = true;
    }
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
  }

  dateChange(autoClose: boolean = true): void {
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    if (this.startDate) {
      this.startDate = moment(this.startDate);
      this.startDate.hour(this.fromHour || 0);
      this.startDate.minute(this.fromMin || 0);
      startDate = this.startDate.isValid() ? this.startDate.toDate() : null;
    }
    if (this.endDate) {
      this.endDate = moment(this.endDate);
      this.endDate.hour(this.toHour || 0);
      this.endDate.minute(this.toMin || 0);
      endDate = this.endDate.isValid() ? this.endDate.toDate() : null;
    }

    const data = this.range ?
      { startDate, endDate } as RangeDateTimePickerData :
      { date: startDate } as DateTimePickerData;



    this.dateChanged.emit(data);

    if (this.range) {
      const pickerData = (data as RangeDateTimePickerData);
      this.onChange(pickerData.endDate && pickerData.startDate ? pickerData : null);
    } else {
      const pickerData = (data as DateTimePickerData);
      this.onChange(pickerData.date ? pickerData.date : null);
    }

    if (autoClose) {
      this.restoreRangePickerCloseMethod();
    }
  }

  selectToday(): void {
    const start = moment().utc(true);
    const end = moment().utc(true);
    this.setAutoDates(start, end);
  }

  selectYesterday(): void {
    const start = moment().utc(true).subtract(1, 'days');
    const end = moment().utc(true).subtract(1, 'days');
    this.setAutoDates(start, end);
  }

  selectThreeDaysAgo(): void {
    const start = moment().utc(true).subtract(3, 'days');
    const end = moment().utc(true).subtract(3, 'days');
    this.setAutoDates(start, end);
  }

  selectLastWeek(): void {
    const start = moment().utc(true).subtract(1, 'weeks').startOf('isoWeek');
    const end = moment().utc(true).subtract(1, 'weeks').endOf('isoWeek');
    this.setAutoDates(start, end);
  }

  selectThisWeek(): void {
    const start = moment().utc(true).startOf('isoWeek');
    const end = moment().utc(true);
    this.setAutoDates(start, end);
  }

  selectThisMonth(): void {
    const start = moment().utc(true).startOf('month');
    const end = moment().utc(true);
    this.setAutoDates(start, end);
  }

  selectLastMonth(): void {
    const start = moment().utc(true).subtract(1, 'months').startOf('month');
    const end = moment().utc(true).subtract(1, 'months').endOf('month');
    this.setAutoDates(start, end);
  }

  clearDates(): void {
    this.setAutoDates(null, null);
  }

  private setAutoDates(start: Moment | null, end: Moment | null): void {
    this.fromHour = 0;
    this.fromMin = 0;
    this.toHour = 23;
    this.toMin = 59;
    this.startDate = start ? start.set('seconds', 0).set('milliseconds', 0) : null;
    this.endDate = end ? end.set('seconds', 0).set('milliseconds', 0) : null;
    this.rangePicker?.close();
    this.datepicker?.close();
    this.dateChange();
  }

  private restoreRangePickerCloseMethod(): void {
    if (!this.rangePicker || !this.rangePickerSelfClose) {
      return;
    }
    this.rangePicker.close = this.rangePickerSelfClose;
    this.rangePickerSelfClose = undefined;
    this.rangePicker.close();
  }
}



