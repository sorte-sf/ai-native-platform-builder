import { Component, computed, effect, inject, input, signal, OnDestroy } from '@angular/core';
import { TranslocoModule, TranslocoPipe } from '@jsverse/transloco';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faStar, faUser, faHouse, faCircleInfo, faGear, faHeart, faEnvelope, faCalendarDays } from '@fortawesome/free-solid-svg-icons';
import type { PageNode } from '@core/builders/page-blocks';
import { AntsoftCalendarComponent } from '@app/shared/sorte-components/calendar/antsoft-calendar.component';
import { DateTimePickerComponent } from '@app/shared/sorte-components/date-time-picker/date-time-picker.component';
import { AntsoftCardComponent } from '@app/shared/sorte-components/flippable-card/flippable-card.component';
import { NgxQrcodeStylingComponent } from 'ngx-qrcode-styling';
import { ComponentDataSourceService } from '@core/builders/component-data-source';
import type { CalendarEvent } from '@app/shared/sorte-components/calendar/antsoft-calendar.component';

@Component({
  selector: 'ant-display-block',
  template: `
    @switch (node().type) {
      @case ('icon') { <fa-icon class="icon" [icon]="icon()" [attr.aria-label]="node().text" /> }
      @case ('calendar') { <app-hotel-calendar [dataSource]="calendarEvents()" [previewSample]="designMode() && !node().objectId" /> }
      @case ('date-time-picker') {
        @if (designMode()) {
          <div class="date-time-picker-preview" aria-label="Date and time picker preview">
            <fa-icon [icon]="calendarIcon" aria-hidden="true" />
            <span>{{ 'elements.dateTimePicker' | transloco }}</span>
            <span class="date-time-picker-placeholder">{{ 'ui.date_time_picker_preview' | transloco }}</span>
          </div>
        } @else {
          <div class="date-time-picker-block"><app-date-time-picker /></div>
        }
      }
      @case ('flippable-card') {
        <antsoft-card class="builder-flippable-card" [flippable]="true" [face]="flippableCardBack() ? 'back' : 'front'">
          <section antsoftCardFront class="builder-flippable-card-face">
            <h3>{{ node().text || ('elements.flippableCard' | transloco) }}</h3>
            <p>{{ 'ui.flippable_card_front_help' | transloco }}</p>
            <button type="button" (click)="flipCard()">{{ 'ui.show_card_back' | transloco }} →</button>
          </section>
          <section antsoftCardBack class="builder-flippable-card-face builder-flippable-card-back">
            <h3>{{ 'ui.flippable_card_back' | transloco }}</h3>
            <p>{{ 'ui.flippable_card_back_help' | transloco }}</p>
            <button type="button" (click)="flipCard()">← {{ 'ui.show_card_front' | transloco }}</button>
          </section>
        </antsoft-card>
      }
      @case ('badge') { <span class="display-badge">{{ node().text }}</span> }
      @case ('barcode-reader') {
        <label class="barcode-reader">{{ 'elements.barcodeReader' | transloco }}
          <input type="text" [disabled]="designMode()" (change)="scanned.set($any($event.target).value)" autocomplete="off">
          <small>{{ scanned() }}</small>
        </label>
      }
      @case ('qr-renderer') { <ngx-qrcode-styling [data]="node().text || ' '" [width]="160" [height]="160" /> }
      @case ('countdown') {
        <div class="timer-block">{{ timerValue() }}s
          <button type="button" (click)="startTimer()" [disabled]="designMode()">▶</button>
          <button type="button" (click)="resetTimer()" [disabled]="designMode()">↺</button>
        </div>
      }
      @case ('countup') {
        <div class="timer-block">{{ timerValue() }}s
          <button type="button" (click)="startTimer()" [disabled]="designMode()">▶</button>
          <button type="button" (click)="stopTimer()" [disabled]="designMode()">Ⅱ</button>
          <button type="button" (click)="resetTimer()" [disabled]="designMode()">↺</button>
        </div>
      }
      @case ('stopwatch') {
        <div class="timer-block">{{ timerValue() }}s
          <button type="button" (click)="startTimer()" [disabled]="designMode()">▶</button>
          <button type="button" (click)="stopTimer()" [disabled]="designMode()">Ⅱ</button>
          <button type="button" (click)="resetTimer()" [disabled]="designMode()">↺</button>
        </div>
      }
      @case ('tooltip') { <span tabindex="0" class="tooltip">ⓘ<span role="tooltip">{{ node().text }}</span></span> }
      @case ('timeline') {
        <ol class="timeline">@for (line of lines(); track $index) { <li>{{ line }}</li> }</ol>
      }
      @case ('markdown') {
        @for (line of lines(); track $index) {
          @if (line.startsWith('### ')) { <h3>{{ line.slice(4) }}</h3> }
          @else if (line.startsWith('## ')) { <h2>{{ line.slice(3) }}</h2> }
          @else if (line.startsWith('# ')) { <h1>{{ line.slice(2) }}</h1> }
          @else { <p>{{ line }}</p> }
        }
      }
    }
  `,
  styles: [`
    :host { display: block; }
    .display-badge { display: inline-block; padding: .25rem .6rem; border-radius: 999px; background: #ede7f6; color: #5b429b; font-weight: 600; }
    .barcode-reader { display: grid; gap: .35rem; max-width: 20rem; }
    .timer-block { display: flex; align-items: center; gap: .5rem; font-variant-numeric: tabular-nums; }
    .timer-block button { border: 1px solid #d6cbea; border-radius: .35rem; padding: .15rem .5rem; color: #5b429b; }
    .icon { font-size: 28px; }
    .date-time-picker-block, .date-time-picker-block app-date-time-picker { display: block; width: 100%; min-width: 0; }
    .date-time-picker-preview { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 48px; box-sizing: border-box; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; color: #344154; font-size: 13px; }
    .date-time-picker-preview fa-icon { color: #5e4fa2; }
    .date-time-picker-placeholder { margin-left: auto; color: #64748b; font-size: 12px; }
    .builder-flippable-card { display: block; width: 100%; min-height: 180px; }
    .builder-flippable-card-face { display: flex; flex: 1; flex-direction: column; justify-content: center; align-items: flex-start; gap: 8px; min-height: 180px; box-sizing: border-box; padding: 22px; border: 1px solid #ded8eb; border-radius: 14px; background: linear-gradient(145deg, #fff, #f6f2fb); color: #1f2937; }
    .builder-flippable-card-face h3, .builder-flippable-card-face p { margin: 0; }
    .builder-flippable-card-face p { color: #56616d; }
    .builder-flippable-card-face button { margin-top: 8px; padding: 8px 12px; border: 0; border-radius: 7px; background: #5e4fa2; color: #fff; cursor: pointer; }
    .builder-flippable-card-back { background: linear-gradient(145deg, #f7f4ff, #fff9e9); }
    .calendar { display: grid; gap: 8px; }
    input { padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; font: inherit; }
    .timeline { list-style: none; border-left: 2px solid #8064b5; padding-left: 20px; }
    .timeline li { padding-block: 12px; }
    .tooltip { position: relative; cursor: help; }
    .tooltip > span { display: none; position: absolute; bottom: 100%; left: 0; min-width: 140px; padding: 8px; border-radius: 6px; background: #263746; color: #fff; z-index: 2; }
    .tooltip:hover > span, .tooltip:focus > span { display: block; }
  `],
  imports: [TranslocoModule, FontAwesomeModule, AntsoftCalendarComponent, DateTimePickerComponent, AntsoftCardComponent, NgxQrcodeStylingComponent],
})
export class DisplayBlockComponent implements OnDestroy {
  readonly node = input.required<PageNode>();
  readonly designMode = input(false);
  readonly tenantId = input('');
  readonly calendarEvents = signal<CalendarEvent[]>([]);
  private readonly componentSources = inject(ComponentDataSourceService);
  readonly icons = { star: faStar, user: faUser, house: faHouse, info: faCircleInfo, gear: faGear, heart: faHeart, envelope: faEnvelope };
  readonly icon = computed(() => this.icons[this.node().text as keyof typeof this.icons] ?? faStar);
  readonly calendarIcon = faCalendarDays;
  readonly lines = computed(() => (this.node().text ?? '').split('\n'));
  readonly scanned = signal('');
  readonly flippableCardBack = signal(false);
  readonly elapsed = signal(0);
  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    effect(cleanup => {
      const node = this.node(), tenantId = this.tenantId();
      this.calendarEvents.set([]);
      if (node.type !== 'calendar' || !node.objectId || this.designMode() || !tenantId) return;
      const subscription = this.componentSources.read({ kind: 'object', objectId: node.objectId }, tenantId).subscribe({
        next: result => this.calendarEvents.set(result.rows.flatMap((row, index) => {
          const start = node.calendarStartField ? row[node.calendarStartField] : undefined;
          if (start == null || start === '' || Number.isNaN(new Date(start as string | number).getTime())) return [];
          const end = node.calendarEndField ? row[node.calendarEndField] : undefined;
          const title = (node.calendarTitleField ? row[node.calendarTitleField] : undefined) ?? row['title'] ?? row['name'] ?? row['subject'] ?? 'Event';
          return [{ id: String(row['id'] ?? index), title: String(title), start: String(start), ...(end != null && end !== '' ? { end: String(end) } : {}) }];
        }))
      });
      cleanup(() => subscription.unsubscribe());
    });
  }

  readonly timerValue = computed(() => this.node().type === 'countdown'
    ? Math.max(0, (Number(this.node().text) || 60) - this.elapsed()) : this.elapsed());
  startTimer(): void {
    if (this.timer || this.designMode()) return;
    this.timer = setInterval(() => {
      this.elapsed.update(value => value + 1);
      if (this.node().type === 'countdown' && this.timerValue() === 0) this.stopTimer();
    }, 1000);
  }

  stopTimer(): void { if (this.timer) clearInterval(this.timer); this.timer = undefined; }

  resetTimer(): void { this.stopTimer(); this.elapsed.set(0); }

  flipCard(): void { this.flippableCardBack.update(back => !back); }

  ngOnDestroy(): void { this.stopTimer(); }
}
