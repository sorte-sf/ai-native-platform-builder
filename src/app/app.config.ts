import { ApplicationConfig, inject, isDevMode, provideBrowserGlobalErrorListeners, provideEnvironmentInitializer, provideExperimentalWebMcpTools } from '@angular/core';
import { provideDynamicForm } from '@ng-forge/dynamic-forms';
import { withMaterialFields } from '@ng-forge/dynamic-forms-material';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling, withRouterResources, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from '@core/services/auth/auth.interceptor';
import { provideEcharts } from '@core/echarts/echarts.provider';
import { provideTransloco } from '@jsverse/transloco';
import { provideQuillConfig } from 'ngx-quill/config';

import { SorteSplashScreenService } from '@core/splash-screen';
import { TranslocoHttpLoader } from './transloco-loader';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';

export const appConfig: ApplicationConfig = {
  providers: [

    provideBrowserGlobalErrorListeners(),
    provideDynamicForm(...withMaterialFields()),
    provideQuillConfig({}),
    provideHttpClient(withInterceptors([authInterceptor])),

    provideRouter(routes,
      withComponentInputBinding(),
      withRouterResources(),
      withViewTransitions(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
    ),

    provideEnvironmentInitializer(() => inject(SorteSplashScreenService)),

    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'fill', },
    },
    
    ...provideEcharts(),

    provideTransloco({
      config: {
        availableLangs: ['en', 'tr'],
        defaultLang: 'en',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocoHttpLoader
    }),
 
    provideExperimentalWebMcpTools([
      {
        name: 'greet',
        description: 'Greets the agent.',
        inputSchema: { type: 'object', properties: {} },
        execute: () => {
          return { content: [{ type: 'text', text: "Hellow from Antsoft" }] };
        },
      },
    ]),

    /*
     { provide: MAT_DATE_LOCALE, useValue: 'tr-TR' },
     { provide: MAT_MOMENT_DATE_ADAPTER_OPTIONS, useValue: { useUtc: true } },
     { provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS] },
     { provide: MAT_DATE_FORMATS, useValue: DAY_MONTH_YEAR_FORMATS },
     { provide: ErrorStateMatcher, useClass: ShowOnDirtyErrorStateMatcher },
     */

  ]
};
