import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { map } from 'rxjs';

export const authGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  return auth.ensureSession().pipe(map(ready => {
    if (!ready || !auth.isAuthenticated())
      return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
    if (auth.mustChangePassword() || (typeof localStorage !== 'undefined' && localStorage.getItem('mustChangePassword') === 'true')) {
      if (state.url !== '/change-password') return router.createUrlTree(['/change-password']);
    }
    return true;
  }));
};
