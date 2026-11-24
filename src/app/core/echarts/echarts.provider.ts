import { EnvironmentProviders, importProvidersFrom, Provider } from '@angular/core';
import { NGX_ECHARTS_CONFIG, NgxEchartsModule } from 'ngx-echarts';

export const provideEcharts = (): Array<Provider | EnvironmentProviders> => {
    return [
        importProvidersFrom(NgxEchartsModule),
        {
            provide: NGX_ECHARTS_CONFIG,
            useFactory: () => ({ echarts: () => import('echarts') })
        }
    ];
};
