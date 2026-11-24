import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { getGatewayApiBaseUrl } from '@core/gateway-config';
import { AuthService } from './auth.service';
import { PublishedApplicationSessionService } from './published-application-session.service';

const gatewayRoutes = ['/auth', '/portal', '/builder', '/blob', '/designer-studio', '/realtime'];

function isGatewayRequest(url: string): boolean {
  try {
    const gateway = new URL(getGatewayApiBaseUrl(), document.baseURI);
    const request = new URL(url, document.baseURI);
    return request.origin === gateway.origin &&
      gatewayRoutes.some(route => request.pathname === route || request.pathname.startsWith(route + '/'));
  } catch {
    return false;
  }
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const publishedSession = inject(PublishedApplicationSessionService);
  if (!isGatewayRequest(request.url)) return next(request);

  const requestPath = new URL(request.url, document.baseURI).pathname;
  const publishedLogin = requestPath.endsWith('/builder/application-users/login');
  const publishedAppUserRequest = requestPath.includes('/builder/published-runtime/') || requestPath.endsWith('/builder/application-users/change-password');
  const publicAuthRequest = publishedLogin || ['/auth/login', '/auth/refresh', '/auth/logout', '/builder/builder-workspace/login'].some(path => requestPath.endsWith(path));
  const applicationId = publishedAppUserRequest ? publishedSession.session()?.applicationId : undefined;
  const token = publicAuthRequest ? null : publishedAppUserRequest && applicationId
    ? publishedSession.tokenFor(applicationId) : auth.token();
  const authenticatedRequest = request.clone({
    withCredentials: true,
    ...(token ? { setHeaders: { Authorization: 'Bearer ' + token } } : {})
  });

  return next(authenticatedRequest).pipe(catchError((error: HttpErrorResponse) => {
    if (error.status === 401 && publishedAppUserRequest) {
      publishedSession.logout();
    } else if (error.status === 401 && !publicAuthRequest) {
      auth.logout();
      void router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
    }
    return throwError(() => error);
  }));
};
