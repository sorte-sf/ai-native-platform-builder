import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, Router } from '@angular/router';
import { filter, take } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SorteSplashScreenService {
    private _document = inject(DOCUMENT);
    private _router = inject(Router);

    constructor() {
        this._router.events
            .pipe(
                filter((event) => event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError),
                take(1)
            )
            .subscribe(() => {
                this.hide();
            });
 
        if (typeof window !== 'undefined') window.setTimeout(() => this.hide(), 5000);
    }

    show(): void {
        this._document.body.classList.remove('sorte-splash-screen-hidden');
    }

    hide(): void {
        this._document.body.classList.add('sorte-splash-screen-hidden');
    }

}
