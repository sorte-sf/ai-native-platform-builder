import { TranslocoPipe } from '@jsverse/transloco';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import { chartWidgetStyles } from '../dashboard-chart.styles';
@Component({
    selector: 'app-dashboard-stacked-line-chart',
    template: `
     <section class="widget"><header><h2>{{ 'ui.traffic_by_channel' | transloco }}</h2><span>{{ 'ui.weekly' | transloco }}</span></header><div class="chart" echarts [options]="option" role="img" [attr.aria-label]="'ui.stacked_line_chart_showing_traffic_by_channel' | transloco"></div></section>`,
    styles: [chartWidgetStyles],
    imports: [TranslocoPipe, NgxEchartsDirective],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardStackedLineChartComponent {
        readonly option: EChartsOption = { tooltip: { trigger: 'axis' }, legend: { bottom: 0, textStyle: { fontSize: 10 } }, grid: { left: 32, right: 12, top: 16, bottom: 32 }, xAxis: { type: 'category', boundaryGap: false, data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }, yAxis: { type: 'value' }, series: [{ name: 'Direct', type: 'line', stack: 'total', areaStyle: {}, smooth: true, data: [30, 42, 38, 46, 52, 44, 58] }, { name: 'Search', type: 'line', stack: 'total', areaStyle: {}, smooth: true, data: [18, 22, 26, 24, 31, 28, 34] }, { name: 'Referral', type: 'line', stack: 'total', areaStyle: {}, smooth: true, data: [10, 12, 11, 15, 14, 18, 16] }] };
}
