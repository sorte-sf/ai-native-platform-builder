import { TranslocoPipe } from '@jsverse/transloco';

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import { chartWidgetStyles } from '../dashboard-chart.styles';

@Component({
    selector: 'app-dashboard-pie-chart',
    template: `
    <section class="widget">
        <header><h2>{{ 'ui.users_by_plan' | transloco }}</h2><span>{{ 'ui.mock_data' | transloco }}</span></header>
        <div class="chart" echarts [options]="option" role="img" [attr.aria-label]="'ui.pie_chart_showing_users_by_plan' | transloco"></div></section>`,
    styles: [chartWidgetStyles],
    imports: [TranslocoPipe, NgxEchartsDirective],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPieChartComponent {
    readonly option: EChartsOption = {
        tooltip: { trigger: 'item' },
        legend: { bottom: 0, textStyle: { fontSize: 10 } },
        series: [{ type: 'pie', radius: '58%', data: [{ value: 1284, name: 'Enterprise' }, { value: 850, name: 'Growth' }, { value: 377, name: 'Starter' }], label: { fontSize: 10 } }]
    };

}
