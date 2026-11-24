import { Component, ElementRef, HostListener, inject, input, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@core/services/auth/auth.service';
import { ConfirmationService } from '@app/shared/confirmation/confirmation.service';
import { TranslocoModule } from '@jsverse/transloco';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NavigationEnd } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { catchError, filter, Observable, of, startWith, switchMap } from 'rxjs';
import { BuildersApiService, type TenantSubscriptionUsage } from '@core/builders/builders-api.service';
import { BuilderMenuItem } from '@core/builders/interfaces/builder-menuItem';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
    faBars,
    faAnglesLeft,
    faAnglesRight,
    faGlobe,
    faMagnifyingGlass,
    faMoon,
    faSun,
    faRightFromBracket,
    faHandSparkles,
    faLayerGroup,
    faCogs,
    faChevronDown,
    faChevronLeft,
    faKey,
    faBuilding,
    faUsers,
    faUserShield
} from '@fortawesome/free-solid-svg-icons';

import { SignalRService } from '@app/core/services/signalr.service';
import { SignalRState } from '@app/core/enums/signalr-state';
import { CommonModule } from '@angular/common';
import { SignalRConnectionComponent } from '@app/shared/sorte-components/signalr-connection/signalr-connection.component';
import { LogoWidgetComponent } from '@app/shared/sorte-components/logo-widget/logo-widget.component';
import { MatDialog } from '@angular/material/dialog';
import { ChangePasswordComponent } from '@app/pages/auth/change-password/change-password.component';
import { createMockSubscriptionUsage } from '@app/pages/builders/subscription/subscription-mock.data';

@Component({
    selector: 'ant-sidenav',
    host: { '[class.icon-only]': 'collapsed()' },
    templateUrl: './sidenav.component.html',
    styleUrl: './sidenav.component.scss',
    imports: [
        CommonModule,
        RouterLink,
        RouterLinkActive,
        TranslocoModule,
        FontAwesomeModule,

        SignalRConnectionComponent,
        LogoWidgetComponent
    ],
})
export class SidenavComponent {
    readonly collapsed = input(false); 

    readonly accountMenuOpen = signal(false);
    readonly auth = inject(AuthService);
    private readonly router = inject(Router);
    private readonly dialog = inject(MatDialog);
    private readonly element = inject(ElementRef<HTMLElement>);
    private readonly confirmation = inject(ConfirmationService);
    private readonly api = inject(BuildersApiService);
    readonly applicationMenu = signal<BuilderMenuItem[]>([]);
    readonly menuTenantId = signal('');
    readonly subscriptionUsage = signal<TenantSubscriptionUsage | null>(null);
    private readonly moduleIcons = signal(new Map<string, IconDefinition>());

    //private readonly _signalRService = inject(SignalRService);

    moduleIcon(item: BuilderMenuItem): IconDefinition {
        try {
            const value = JSON.parse((item.icon || '').replace(/'/g, '"'));
            const name = Array.isArray(value) ? value[1] : value;
            return this.moduleIcons().get(String(name).replace(/^fa-/, '')) ?? faLayerGroup;
        } catch {
            return this.moduleIcons().get((item.icon || '').replace(/^fa-/, '')) ?? faLayerGroup;
        }
    }

    // readonly signalRStatus = toSignal(
    //     this._signalRService.signalRStatus$,
    //     { initialValue: SignalRState.Offline }
    // ); 

    constructor() {
        const tenantId = this.auth.tenantId();
        this.subscriptionUsage.set(createMockSubscriptionUsage(tenantId ?? 'demo-tenant'));
        this.router.events.pipe(filter(event => event instanceof NavigationEnd), startWith(null), switchMap(() => {
            const url = this.router.parseUrl(this.router.url);
            const applicationId = /^\/builder\/applications\/([a-f0-9-]{36})(?:\/|$)/i.exec(this.router.url)?.[1];
            const tenantId = url.queryParams['tenantId'] ?? this.auth.tenantId() ?? '';
            this.menuTenantId.set(tenantId);
            this.applicationMenu.set([]);
            return applicationId && tenantId ? this.api.applicationMenu(tenantId, applicationId).pipe(catchError(() => of([]))) : of([]);
        }), takeUntilDestroyed()).subscribe(items => {
            this.applicationMenu.set(items.filter(item => item.visible));
            if (items.length && !this.moduleIcons().size) {
                void import('@fortawesome/free-solid-svg-icons').then(({ fas }) => {
                    this.moduleIcons.set(new Map(Object.values(fas).map(icon => [icon.iconName, icon])));
                });
            }
        });
    }

    readonly icons = {
        bars: faBars,
        template: faAnglesLeft,
        expand: faAnglesRight,
        sparkles: faHandSparkles,
        settings: faCogs,
        applications: faLayerGroup,
        tenants: faBuilding,
        users: faUsers,
        appAccess: faUserShield,

        changePassword: faKey,
        collapse: faChevronLeft,
        expandGroup: faChevronDown,
        accountMenu: faChevronDown,
        signOut: faRightFromBracket
    };

    toggleAccountMenu(): void {
        this.accountMenuOpen.update(open => !open);
    }

    openChangePassword(): void {
        this.accountMenuOpen.set(false);
        this.dialog.open(ChangePasswordComponent, {
            width: 'min(480px, calc(100vw - 32px))',
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: 'calc(100dvh - 32px)',
            autoFocus: 'first-tabbable',
            restoreFocus: true,
            panelClass: 'change-password-modal'
        });
    }

    @HostListener('document:click', ['$event'])
    closeAccountMenuOnOutsideClick(event: MouseEvent): void {
        const accountPanel = this.element.nativeElement.querySelector('.account-panel');
        if (this.accountMenuOpen() && !accountPanel?.contains(event.target as Node))
            this.accountMenuOpen.set(false);
    }

    @HostListener('document:keydown.escape')
    closeAccountMenuOnEscape(): void {
        if (!this.accountMenuOpen()) return;
        this.accountMenuOpen.set(false);
        (this.element.nativeElement.querySelector('.account-trigger') as HTMLButtonElement | null)?.focus();
    }

    async logout(): Promise<void> {
        this.accountMenuOpen.set(false);
        const confirmed = await this.confirmation.confirm({
            title: 'Sign out?',
            message: 'Are you sure you want to sign out of Builder Studio?',
            confirmText: 'Sign out',
            cancelText: 'Cancel',
            tone: 'danger'
        });
        if (!confirmed) return;
        this.auth.logout();
        void this.router.navigateByUrl('/login', { replaceUrl: true });
    }
}
