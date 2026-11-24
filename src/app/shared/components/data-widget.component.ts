import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { ComponentDataSourceService, sourceForNode } from '@core/builders/component-data-source';
import type { PageNode } from '@core/builders/page-blocks';
import { groupedValues, timeSeriesValues } from '@core/builders/business-data';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart, FunnelChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent, AriaComponent, DataZoomComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
echarts.use([BarChart, LineChart, PieChart, FunnelChart, GridComponent, TooltipComponent, LegendComponent, AriaComponent, DataZoomComponent, CanvasRenderer]);

@Component({
  selector: 'ant-data-widget',
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './data-widget.component.html',
  styleUrl: './data-widget.component.scss',
  imports: [TranslocoModule, NgxEchartsDirective],
})
export class DataWidgetComponent {
  readonly node = input.required<PageNode>();
  readonly tenantId = input('');
  readonly designMode = input(false);
  readonly total = signal<number | null>(null);
  readonly rows = signal<Record<string, unknown>[]>([]);
  readonly loading = signal(false);
  readonly failed = signal(false);
  private readonly sources = inject(ComponentDataSourceService);
  readonly chartData = computed(() => this.designMode() ? [
    { name: 'A', value: 12 }, 
    { name: 'B', value: 8 }, 
    { name: 'C', value: 5 }
  ] : groupedValues(this.rows(), this.node()));
  
  readonly timeData = computed(() => this.designMode() ? Array.from({ length: 30 }, (_, index) => [Date.UTC(2024, 0, index + 1), Math.round(55 + Math.sin(index / 3) * 24 + index * 1.5)] as [number, number]) : timeSeriesValues(this.rows(), this.node()));
  
  readonly secondaryData = computed(() => {
    const node = this.node(), field = node.columns?.[0]; if (!field) return [];
    const sums = new Map<string, number>();
    for (const row of this.rows()) {
      const label = row[field]; if (label == null) continue;
      const value = node.secondaryValueField ? row[node.secondaryValueField] : 1;
      if (typeof value === 'number' && Number.isFinite(value)) sums.set(String(label), (sums.get(String(label)) ?? 0) + value);
    }
    return this.chartData().map(item => sums.get(item.name) ?? 0);
  });
  
  readonly options = computed<echarts.EChartsCoreOption>(() => {
    const node = this.node();
    const kind = node.chartKind ?? 'bar', data = this.chartData();
    const legendPosition = node.legendPosition;
    const legend = legendPosition ? {
      show: true,
      orient: legendPosition === 'left' || legendPosition === 'right' ? 'vertical' as const : 'horizontal' as const,
      ...(legendPosition === 'top' ? { top: 0 } : {}),
      ...(legendPosition === 'bottom' ? { bottom: 0 } : {}),
      ...(legendPosition === 'left' ? { left: 0 } : {}),
      ...(legendPosition === 'right' ? { right: 0 } : {})
    } : undefined;
    const labels = node.showDataLabels ? { show: true, position: 'top' as const } : undefined;
    if (kind === 'time-area') {
      const points = this.timeData();
      return {
        aria: { enabled: true }, color: ['#2447a8'],
        tooltip: { trigger: 'axis', renderMode: 'richText', valueFormatter: (value: unknown) => String(value) },
        grid: { left: 52, right: 20, top: 24, bottom: 56, containLabel: true },
        xAxis: {
          type: 'category', boundaryGap: false,
          data: points.map(([timestamp]) => new Date(timestamp).toISOString().slice(0, 10)),
          axisLabel: { hideOverlap: true }
        },
        yAxis: { type: 'value', min: 'dataMin', splitLine: { lineStyle: { color: '#e8e5ef' } } },
        dataZoom: [{ type: 'inside' }],
        ...(legend ? { legend } : {}),
        series: [{ name: node.text || 'Daily total', type: 'line', smooth: false, showSymbol: false,
          lineStyle: { width: 2 }, areaStyle: { opacity: 0.28 }, ...(labels ? { label: labels } : {}), data: points.map(([, value]) => value) }]
      };
    }
    if (kind === 'bar-line') return {
      aria: { enabled: true }, color: ['#2447a8', '#10b981'],
      tooltip: { trigger: 'axis', renderMode: 'richText' }, legend: legend ?? { bottom: 0 }, grid: { left: 52, right: 52, top: 24, bottom: 56 },
      xAxis: { type: 'category', data: data.map(item => item.name) }, yAxis: [{ type: 'value' }, { type: 'value' }],
      series: [{ name: 'Bar', type: 'bar', ...(labels ? { label: labels } : {}), data: data.map(item => item.value) },
      { name: 'Line', type: 'line', yAxisIndex: 1, smooth: true, ...(labels ? { label: labels } : {}), data: this.designMode() ? [8, 14, 10] : this.secondaryData() }]
    };
    if (kind === 'stacked-column') return {
      aria: { enabled: true }, color: ['#2447a8', '#12a7dd'],
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, renderMode: 'richText' },
      legend: legend ?? { bottom: 0 }, grid: { left: 52, right: 20, top: 24, bottom: 56 },
      xAxis: { type: 'category', data: data.map(item => item.name) }, yAxis: { type: 'value' },
      series: [
        { name: node.text || 'Value', type: 'bar', stack: 'total', ...(labels ? { label: labels } : {}), data: data.map(item => item.value) },
        { name: 'Second value', type: 'bar', stack: 'total', ...(labels ? { label: labels } : {}), data: this.designMode() ? [8, 14, 10] : this.secondaryData() }
      ]
    };
    const circular = kind === 'pie' || kind === 'doughnut' || kind === 'funnel';
    return {
      aria: { enabled: true }, color: ['#2447a8', '#12a7dd', '#10b981', '#8b5cf6', '#f59e0b', '#94a3b8'], tooltip: { trigger: circular ? 'item' : 'axis', renderMode: 'richText' },
      legend: legend ?? { show: circular, bottom: 0 }, grid: { left: 48, right: 16, bottom: 48, top: 24 },
      ...(circular ? {} : { xAxis: { type: 'category', data: data.map(item => item.name) }, yAxis: { type: 'value' } }),
      series: [{
        type: kind === 'doughnut' ? 'pie' : kind === 'area' ? 'line' : kind,
        data: circular ? data : data.map(item => item.value),
        ...(labels ? { label: labels } : {}),
        ...(kind === 'doughnut' ? { radius: ['40%', '65%'] } : {}), ...(kind === 'area' ? { areaStyle: {} } : {}),
        ...(kind === 'funnel' ? { sort: 'none' } : {})
      }]
    };
  });

  readonly bars = computed(() => {
    const field = this.node().columns?.[0];
    if (!field) return [];
    const groups = new Map<string, number>();
    for (const row of this.rows()) {
      const value = row[field];
      if (value !== null && value !== undefined && ['string', 'number', 'boolean'].includes(typeof value)) {
        const label = String(value); groups.set(label, (groups.get(label) ?? 0) + 1);
      }
    }
    const values = [...groups].sort((a, b) => b[1] - a[1]).slice(0, 12);
    const max = Math.max(1, ...values.map(([, count]) => count));
    return values.map(([label, count]) => ({ label, count, width: count / max * 100 }));
  });

  constructor() {
    effect(cleanup => {
      const source = sourceForNode(this.node()), tenantId = this.tenantId();
      this.total.set(null); this.rows.set([]); this.failed.set(false); this.loading.set(false);
      if (!source || source.kind === 'object' && (this.designMode() || !tenantId)) return;
      this.loading.set(true);
      const subscription = this.sources.read(source, tenantId).subscribe({
        next: result => {
          this.total.set(result.total);
          this.rows.set(result.rows);
          this.loading.set(false);
        },
        error: () => { this.failed.set(true); this.loading.set(false); }
      });
      cleanup(() => subscription.unsubscribe());
    });
  }
  
}
