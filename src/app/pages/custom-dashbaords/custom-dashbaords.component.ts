import { TranslocoModule, TranslocoPipe } from '@jsverse/transloco';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '@core/services/auth/auth.service';
import { Gridster, GridsterConfig, GridsterItem } from 'angular-gridster2';
import { DashboardTableComponent } from './widgets/dashboard-table.component';
import { DashboardPieChartComponent } from './widgets/dashboard-pie-chart.component';
import { DashboardDoughnutChartComponent } from './widgets/dashboard-doughnut-chart.component';
import { DashboardBarChartComponent } from './dashboard-bar-chart.component';
import { DashboardStackedLineChartComponent } from './widgets/dashboard-stacked-line-chart.component';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { MatDialog } from '@angular/material/dialog';

export type DashboardWidgetType = 'table' | 'pie' | 'doughnut' | 'bar' | 'stacked-line';
export type DashboardWidget = { id: string; type: DashboardWidgetType; x: number; y: number; cols: number; rows: number };

@Component({
  selector: 'app-custom-dashbaords',
  templateUrl: './custom-dashbaords.component.html',
  styleUrl: './custom-dashbaords.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TranslocoModule,
    MatInputModule,

    FontAwesomeModule,
    Gridster,
    GridsterItem,
    DashboardTableComponent,
    DashboardPieChartComponent,
    DashboardDoughnutChartComponent,
    DashboardBarChartComponent,
    DashboardStackedLineChartComponent]

})
export class CustomDashbaordsComponent {
  backgroundColor = signal('#1f2937');
  foregroundColor = signal('#f9fafb');

  private readonly auth = inject(AuthService); private sequence = 0;
  readonly widgets = signal<DashboardWidget[]>(this.loadLayout());
  readonly available: Array<{ type: DashboardWidgetType; label: string }> = [{ type: 'table', label: 'Table' }, { type: 'pie', label: 'Pie chart' }, { type: 'doughnut', label: 'Doughnut chart' }, { type: 'bar', label: 'Bar chart' }, { type: 'stacked-line', label: 'Stacked line chart' }];
  readonly options: GridsterConfig = { margin: 12, outerMargin: true, minCols: 4, maxCols: 12, minRows: 6, fixedColWidth: 100, fixedRowHeight: 90, mobileBreakpoint: 700, pushItems: true, draggable: { enabled: true, stop: () => this.saveLayout() }, resizable: { enabled: true, stop: () => this.saveLayout() }, enableEmptyCellDrop: true };

  add(type: DashboardWidgetType): void { this.widgets.update(items => [...items, { id: `${type}-${Date.now()}-${this.sequence++}`, type, x: 0, y: 0, cols: type === 'table' ? 8 : 4, rows: 3 }]); this.saveLayout(); }

  remove(id: string): void { this.widgets.update(items => items.filter(item => item.id !== id)); this.saveLayout(); }

  dragStart(event: DragEvent, type: DashboardWidgetType): void { event.dataTransfer?.setData('text/dashboard-widget', type); if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'; }

  drop(event: DragEvent): void { event.preventDefault(); const type = event.dataTransfer?.getData('text/dashboard-widget') as DashboardWidgetType; if (this.available.some(item => item.type === type)) this.add(type); }

  allowDrop(event: DragEvent): void { event.preventDefault(); }

  saveLayout(): void { if (typeof localStorage === 'undefined') return; const userId = this.auth.userId() ?? 'anonymous'; localStorage.setItem(this.storageKey(userId), JSON.stringify(this.widgets())); }
 
  private loadLayout(): DashboardWidget[] { if (typeof localStorage === 'undefined') return this.defaults(); const userId = this.auth.userId() ?? 'anonymous'; try { const value = JSON.parse(localStorage.getItem(this.storageKey(userId)) ?? 'null') as unknown; return Array.isArray(value) ? value.filter(this.isWidget) : this.defaults(); } catch { return this.defaults(); } }

  private storageKey(userId: string): string { return `custom-dashboard:${userId}`; }

  private defaults(): DashboardWidget[] { return [{ id: 'table-default', type: 'table', x: 0, y: 0, cols: 8, rows: 3 }, { id: 'pie-default', type: 'pie', x: 8, y: 0, cols: 4, rows: 3 }, { id: 'doughnut-default', type: 'doughnut', x: 0, y: 3, cols: 4, rows: 3 }, { id: 'bar-default', type: 'bar', x: 4, y: 3, cols: 4, rows: 3 }, { id: 'line-default', type: 'stacked-line', x: 8, y: 3, cols: 4, rows: 3 }]; }

  private isWidget(value: unknown): value is DashboardWidget { if (!value || typeof value !== 'object') return false; const item = value as Partial<DashboardWidget>; return typeof item.id === 'string' && ['table', 'pie', 'doughnut', 'bar', 'stacked-line'].includes(item.type ?? '') && [item.x, item.y, item.cols, item.rows].every(number => typeof number === 'number'); }


}
