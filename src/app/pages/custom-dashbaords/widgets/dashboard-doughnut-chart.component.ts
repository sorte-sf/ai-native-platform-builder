import { TranslocoPipe } from '@jsverse/transloco';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import { chartWidgetStyles } from '../dashboard-chart.styles';
@Component({
    selector: 'app-dashboard-doughnut-chart',
    template: `<section class="widget"><header><h2>{{ 'ui.storage_allocation' | transloco }}</h2><span>4.8 TB total</span></header><div class="chart" echarts [options]="option" role="img" [attr.aria-label]="'ui.doughnut_chart_showing_storage_allocation' | transloco"></div></section>`,
    styles: [chartWidgetStyles],
    imports: [TranslocoPipe, NgxEchartsDirective],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardDoughnutChartComponent {
    readonly option: EChartsOption = {
        tooltip: { trigger: 'item' }, legend: { bottom: 0, textStyle: { fontSize: 10 } }, series: [{ type: 'pie', radius: ['42%', '68%'], data: [{ value: 2.1, name: 'Documents' }, { value: 1.4, name: 'Media' }, { value: .8, name: 'Backups' }, { value: .5, name: 'Other' }], label: { fontSize: 10 } }]
    };
}
