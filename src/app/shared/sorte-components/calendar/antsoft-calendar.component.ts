import { Component, computed, input, output, signal } from '@angular/core';

export interface CalendarEvent { id?: string; title: string; start: string | Date; end?: string | Date; color?: string; }
interface CalendarCell { key: string; day: number; outside: boolean; today: boolean; }
interface CalendarSegment { event: CalendarEvent; startColumn: number; span: number; lane: number; begins: boolean; ends: boolean; }
interface CalendarWeek { days: CalendarCell[]; events: CalendarSegment[]; }

@Component({
  selector: 'app-hotel-calendar',
  templateUrl: './antsoft-calendar.component.html',
  styleUrl: './antsoft-calendar.component.scss',
})
export class AntsoftCalendarComponent {
  readonly dataSource = input<CalendarEvent[]>([]);
  readonly previewSample = input(false);
  readonly calendarEventClickData = output<CalendarEvent>();
  readonly calendarDateData = output<{ startDate: string; endDate: string; allDay: boolean }>();
  readonly currentMonth = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  readonly weekdays = computed(() => Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(new Date(2024, 0, index + 1))));
  readonly title = computed(() => this.currentMonth().toLocaleDateString(undefined, { month: 'long', year: 'numeric' }));
  readonly events = computed(() => this.dataSource().length || !this.previewSample() ? this.dataSource() : this.previewEvents());
  readonly weeks = computed<CalendarWeek[]>(() => {
    const month = this.currentMonth();
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const mondayOffset = (first.getDay() + 6) % 7;
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - mondayOffset);
    const cells = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      return { key: this.dateKey(date), day: date.getDate(), outside: date.getMonth() !== month.getMonth(), today: this.sameDay(date, new Date()) };
    });
    const allEvents = this.events().flatMap((event, index) => {
      const startDate = this.dateValue(event.start), endDate = this.dateValue(event.end ?? event.start);
      return startDate && endDate ? [{ event: { ...event, color: event.color || this.eventColors[index % this.eventColors.length] }, start: startDate, end: endDate < startDate ? startDate : endDate }] : [];
    }).sort((left, right) => left.start.getTime() - right.start.getTime());
    return Array.from({ length: 6 }, (_, weekIndex) => {
      const weekStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() + weekIndex * 7);
      const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
      const lanes: Date[] = [];
      const events = allEvents.flatMap(({ event, start: eventStart, end: eventEnd }) => {
        if (eventEnd < weekStart || eventStart > weekEnd) return [];
        const segmentStart = eventStart < weekStart ? weekStart : eventStart;
        const segmentEnd = eventEnd > weekEnd ? weekEnd : eventEnd;
        const lane = lanes.findIndex(laneEnd => laneEnd < segmentStart);
        const laneIndex = lane < 0 ? lanes.length : lane;
        lanes[laneIndex] = segmentEnd;
        if (laneIndex >= 4) return [];
        return [{ event, startColumn: this.dayDistance(weekStart, segmentStart) + 1,
          span: this.dayDistance(segmentStart, segmentEnd) + 1, lane: laneIndex,
          begins: eventStart >= weekStart, ends: eventEnd <= weekEnd }];
      });
      return { days: cells.slice(weekIndex * 7, weekIndex * 7 + 7), events };
    });
  });
  shiftMonth(amount: number): void {
    const month = this.currentMonth();
    this.currentMonth.set(new Date(month.getFullYear(), month.getMonth() + amount, 1));
  }
  selectDay(key: string): void { this.calendarDateData.emit({ startDate: key, endDate: key, allDay: true }); }

  private readonly eventColors = ['#f5b900', '#43a834', '#3984dc', '#a569bd'];
  private previewEvents(): CalendarEvent[] {
    const year = this.currentMonth().getFullYear(), month = this.currentMonth().getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const first = Math.min(23, Math.max(3, lastDay - 8)), second = Math.min(first + 2, lastDay - 1);
    return [
      { id: 'preview-1', title: 'Event 1', start: new Date(year, month, first), end: new Date(year, month, Math.min(first + 4, lastDay)), color: this.eventColors[0] },
      { id: 'preview-2', title: 'Event 2', start: new Date(year, month, second), end: new Date(year, month, Math.min(second + 5, lastDay)), color: this.eventColors[1] }
    ];
  }
  private dateValue(value?: string | Date): Date | null {
    if (value == null || value === '') return null;
    const date = value instanceof Date ? new Date(value.getFullYear(), value.getMonth(), value.getDate())
      : /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10))) : new Date(value);
    return Number.isNaN(date.getTime()) ? null : new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }
  private sameDay(left: Date, right: Date): boolean { return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate(); }
  private dayDistance(start: Date, end: Date): number {
    return (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000;
  }
  private dateKey(date: Date): string { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
}
