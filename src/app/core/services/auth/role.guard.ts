import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const systemAdminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.hasAnyRole(['SystemAdmin', 'systemAdmin']) ? true : router.createUrlTree(['/builder/dashboard'], { queryParams: { denied: state.url } });
};

export const tenantConfigurationAdminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.hasAnyRole(['SystemAdmin', 'TenantAdmin', 'systemAdmin', 'tenantAdmin']) ? true : router.createUrlTree(['/builder/dashboard'], { queryParams: { denied: state.url } });
};

export const tenantAdminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.hasAnyRole(['SystemAdmin', 'TenantAdmin', 'systemAdmin', 'tenantAdmin']) ? true : router.createUrlTree(['/builder/dashboard'], { queryParams: { denied: state.url } });
};
