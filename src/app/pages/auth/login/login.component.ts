import { AfterViewInit, Component, ElementRef, inject, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LanguageService } from '@core/services/language.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import * as CryptoJS from 'crypto-js';
import { CommonModule } from '@angular/common';
import { LogoWidgetComponent } from '@app/shared/sorte-components/logo-widget/logo-widget.component';
import { LanguageSelectorComponent } from '@app/shared/sorte-components/language-selector/language-selector.component';

import {
  faArrowRight,
  faArrowTrendUp,
  faCircleExclamation,
  faEnvelope,
  faGem,
  faLock,
  faPause,
  faPlay,
  faShieldHalved,
  faUser
} from '@fortawesome/free-solid-svg-icons';
import { AntsoftCardComponent } from '@app/shared/sorte-components/flippable-card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { ResetPassword } from '../reset-password/reset-password';
import { RegisterUser } from '../register/user/register-user';
import { MatIconModule } from '@angular/material/icon';

const rememberedEmailCookie = 'antsoft-admin-remembered-email';
const rememberKey = 'antsoft.Admin.RememberMe.v1';

@Component({
  selector: 'ants-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TranslocoPipe,
    FontAwesomeModule,

    MatInputModule,
    MatButtonModule,
    MatIconModule,

    LogoWidgetComponent,
    LanguageSelectorComponent,

    AntsoftCardComponent,
    RegisterUser,
    ResetPassword
  ],
})
export class LoginComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly auth = inject(AuthService);
  readonly language = inject(LanguageService);
  showLoginForm = true;
  workspaceLogin = false;
  showRegister = false;
  forgottenForm: FormGroup;
  backgroundImage: string = 'url(\'/images/backgrounds/login/background1.jpg\')';

  private _formBuilder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);

  private readonly translateService = inject(TranslocoService);

  readonly icons = {
    arrow: faArrowRight,
    trend: faArrowTrendUp,
    error: faCircleExclamation,
    email: faEnvelope,
    trust: faGem,
    lock: faLock,
    user: faUser,
    shield: faShieldHalved,
    pause: faPause,
    play: faPlay
  };

  readonly heroSlides = [
    { title: 'auth.heroTitle', text: 'auth.heroText', image: '/images/builder1.png', alt: 'auth.heroImageAlt' },
    { title: 'auth.heroSlideTwoTitle', text: 'auth.heroSlideTwoText', image: '/images/builder2.png', alt: 'auth.heroSlideTwoImageAlt' }
  ];

  heroSlideIndex = 0;
  heroRotationPaused = false;
  private heroRotationTimer: number | null = null;
  backgroundIndex = 0;

  backgrounds: string[] = [
    'url(\'/images/backgrounds/login/background1.jpg\')',
    'url(\'/images/backgrounds/login/background2.jpg\')',
    'url(\'/images/backgrounds/login/background3.jpg\')',
  ];

  // readonly backgrounds = [
  //   '/images/backgrounds/login/background1.jpg',
  //   '/images/backgrounds/login/background2.jpg',
  //   '/images/backgrounds/login/background3.jpg',
  //   '/images/backgrounds/login/background4.jpg',
  // ];

  readonly form = new FormGroup({
    userName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    rememberMe: new FormControl(false, { nonNullable: true })
  });

  constructor() {
    const remembered = this.readRememberedEmail();
    if (remembered) this.form.controls.userName.setValue(remembered);
    this.translateService.langChanges$.subscribe(() => {
      setTimeout(() =>
        this.initGlow()
        , 3000);
    });

    this.forgottenForm = this._formBuilder.nonNullable.group({
      emailAddress: new FormControl<string>('', [Validators.required, Validators.email, Validators.maxLength(200)])
    });

  }

  ngAfterViewInit(): void {
    this.initGlow();
  }

  ngOnInit(): void {
    
     this.setRandomBackground();
     setInterval(() => {
       this.setRandomBackground();
     }, 60000);


    if (typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.heroRotationPaused = true;
      return;
    }

    //this.backgroundIndex = Math.floor(Math.random() * this.backgrounds.length);
    this.startHeroRotation();
  }

  ngOnDestroy(): void {
    this.stopHeroRotation();
  }

  showHeroSlide(index: number): void {
    if (index >= 0 && index < this.heroSlides.length) this.heroSlideIndex = index;
  }

  toggleHeroRotation(): void {
    this.heroRotationPaused = !this.heroRotationPaused;
    if (this.heroRotationPaused) this.stopHeroRotation();
    else this.startHeroRotation();
  }

  private startHeroRotation(): void {
    this.stopHeroRotation();
    if (typeof window === 'undefined') return;
    this.heroRotationTimer = window.setInterval(() => {
      this.heroSlideIndex = (this.heroSlideIndex + 1) % this.heroSlides.length;
      //this.backgroundIndex = (this.backgroundIndex + 1) % this.backgrounds.length;
    }, 5000);
  }

  private stopHeroRotation(): void {
    if (typeof window !== 'undefined' && this.heroRotationTimer !== null) {
      window.clearInterval(this.heroRotationTimer);
      this.heroRotationTimer = null;
    }
  }

  submit(): void {

    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { userName, password } = this.form.getRawValue();

    const login = this.workspaceLogin
      ? this.auth.loginBuilderWorkspace(userName, password)
      : this.auth.login(userName, password);

    login.subscribe({
      next: response => {

        if (this.form.controls.rememberMe.value) this.writeRememberedEmail(userName);
        else this.clearRememberedEmail();

        const requestedReturnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const returnUrl = requestedReturnUrl?.startsWith('/builder')
          ? requestedReturnUrl
          : response.authMode === 'builderWorkspace' ? '/builder/applications' : '/builder/dashboard';

        if (response.mustChangePassword) {
          void this.router.navigate(['/change-password'], { replaceUrl: true });
          return;
        }

        void this.router.navigateByUrl(returnUrl, { replaceUrl: true }).then(navigated => {
          if (!navigated) void this.router.navigate(['/builder', 'dashboard'], { replaceUrl: true });
        });

      },
      error: error => this.auth.error.set(error?.error?.message ?? 'Unable to sign in. Please check your credentials.')
    });

  }

  rand(a: number, b: number) {
    return a + (b - a + 1) * crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32 | 0
  }

  private setRandomBackground(): void {
    this.backgroundIndex = this.rand(0, this.backgrounds.length - 1);
    this.backgroundImage = this.backgrounds[this.backgroundIndex];
  }

  toggleWorkspaceLogin(): void {
    this.workspaceLogin = !this.workspaceLogin;
    this.auth.clearError();
  }

  private writeRememberedEmail(email: string): void {
    const encrypted = CryptoJS.AES.encrypt(email.trim().toLowerCase(), rememberKey).toString();
    document.cookie = `${rememberedEmailCookie}=${encodeURIComponent(encrypted)}; Max-Age=${60 * 60 * 24 * 90}; Path=/; SameSite=Lax`;
  }

  private readRememberedEmail(): string | null {
    if (typeof document === 'undefined') return null;
    const value = document.cookie.split('; ').find(item => item.startsWith(`${rememberedEmailCookie}=`))?.split('=').slice(1).join('=');
    if (!value) return null;
    try {
      const decrypted = CryptoJS.AES.decrypt(decodeURIComponent(value), rememberKey).toString(CryptoJS.enc.Utf8);
      return decrypted || null;
    } catch { return null; }
  }

  private clearRememberedEmail(): void {
    document.cookie = `${rememberedEmailCookie}=; Max-Age=0; Path=/; SameSite=Lax`;
  }

  private initGlow() {
    const glowingWords = this.el.nativeElement.querySelectorAll('.glow');

    glowingWords.forEach((word: HTMLElement) => {
      const delay = Math.random() * 20;
      this.renderer.setStyle(word, 'animation-delay', `${delay}s`);
      this.renderer.addClass(word, 'glow');
    });
  }

}
