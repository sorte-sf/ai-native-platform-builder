import { TranslocoModule, TranslocoPipe } from '@jsverse/transloco';
import { Component, effect, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { SorteSplashScreenService } from '@core/splash-screen';
import { SnackBarService } from '@core/services/snackbar.service';
import { CommonModule } from '@angular/common';
import { SignalRConnectionComponent } from './shared/sorte-components/signalr-connection/signalr-connection.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { SignalRState } from './core/enums/signalr-state';
import { SignalRService } from './core/services/signalr.service';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { DateAdapter, ErrorStateMatcher, MAT_DATE_FORMATS, MAT_DATE_LOCALE, ShowOnDirtyErrorStateMatcher } from '@angular/material/core';
import { DAY_MONTH_YEAR_FORMATS } from './core/utils/base-constants';
import { LogoWidgetComponent } from './shared/sorte-components/logo-widget/logo-widget.component';
import { AuthService } from './core/services/auth/auth.service';
 
import { fal } from '@fortawesome/pro-light-svg-icons';
import { fas } from '@fortawesome/free-solid-svg-icons';
import * as proLightIcons from '@fortawesome/pro-light-svg-icons';

@Component({
  selector: 'sorte-root',
  styleUrl: './app.component.scss',
  templateUrl: './app.component.html',
  imports: [
    CommonModule,
    TranslocoModule,

    RouterOutlet,
    FontAwesomeModule,

    LogoWidgetComponent
  ],
  providers: [
    SnackBarService,

    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' }, },
    { provide: MAT_DATE_FORMATS, useValue: DAY_MONTH_YEAR_FORMATS },
    { provide: ErrorStateMatcher, useClass: ShowOnDirtyErrorStateMatcher },
    //{ provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS], },

  ]
})
export class App {
  protected readonly title = signal('AntsoftBuilder');

  readonly releaseMode = signal(false);
  private _library = inject(FaIconLibrary);
  private _signalr = inject(SignalRService);
  private _authService = inject(AuthService);
  private readonly splashScreen = inject(SorteSplashScreenService);

  constructor() {
    
    effect(() => {
      if (this._authService.isAuthenticated()) void this._signalr.startConnection();
      else void this._signalr.disconnect();
    });
    this.signalR();

     this._library.addIconPacks(fas, fal);
        this._library.addIcons(
            ...Object.entries(proLightIcons)
                .filter(([name, icon]) => name.startsWith('fa') && typeof icon === 'object' && icon !== null && 'icon' in icon)
                .map(([, icon]) => icon as import('@fortawesome/fontawesome-svg-core').IconDefinition)
        );

  }
  
  ngOnDestroy(): void {
    this._signalr.disconnect();
  }

  private signalR(): void {
    this._signalr.signalRStatus$.subscribe((state: SignalRState) => {
      if (state === SignalRState.Online) {
        this.splashScreen.hide();
      }
    });
  }

}
