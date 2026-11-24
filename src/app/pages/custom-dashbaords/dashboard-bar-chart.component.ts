import { TranslocoPipe } from '@jsverse/transloco';
import { ChangeDetectionStrategy, Component } from '@angular/core'; import { NgxEchartsDirective } from 'ngx-echarts'; import type { EChartsOption } from 'echarts'; import { chartWidgetStyles } from './dashboard-chart.styles';
@Component({
    selector: 'app-dashboard-bar-chart',
    templateUrl: './dashboard-bar-chart.component.html',
    styles: [chartWidgetStyles],
    imports: [TranslocoPipe, NgxEchartsDirective],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardBarChartComponent {
    readonly option: EChartsOption = {
        tooltip: { trigger: 'axis' },
        grid: { left: 36, right: 12, top: 16, bottom: 28 },
        xAxis: { type: 'category', data: ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'] },
        yAxis: { type: 'value' },
        series: [{ type: 'bar', data: [84, 112, 98, 146, 173, 192], barMaxWidth: 24, itemStyle: { color: '#5e4fa2', borderRadius: [4, 4, 0, 0] } }]
    };
}
