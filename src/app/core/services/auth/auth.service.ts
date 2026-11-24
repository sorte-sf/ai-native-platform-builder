import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, map, of, tap } from 'rxjs';
import { getGatewayApiBaseUrl } from '@core/gateway-config';

export interface LoginUser { id: string; companyId?: string; userName: string; role: string; permissions: string[]; }
export interface ChangePasswordRequest { currentPassword?: string; newPassword: string; confirmPassword: string; }
export interface BuilderWorkspaceLoginResponse extends LoginResponse { authMode?: 'portal' | 'builderWorkspace'; }
export interface RefreshResponse { accessToken: string; expiresAt: string; user: LoginUser; }
export const applicationRoles = ['SystemAdmin', 'TenantAdmin', 'Agents', 'Integration', 'User'] as const;
export type ApplicationRole = typeof applicationRoles[number];

export interface LoginResponse {
  userId: string;
  email: string;
  displayName: string;
  userRoles?: string[];
  permissions?: string[];
  accessToken: string;
  expiresAt: string;
  user: LoginUser;
  mustChangePassword: boolean;
  authMode?: 'portal' | 'builderWorkspace';
}

interface JwtPayload {
  companyId?: string | number;
  company_id?: string | number;
  tenant_id?: string | number;
}

// Session storage remains browser-only; API routing comes from gateway.json.
const storage: Storage | null = typeof localStorage !== 'undefined' ? localStorage : null;

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly sessionStorageKey = 'sorte.portal.session';
  private readonly sessionState = signal<LoginResponse | null>(this.restoreSession());
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  readonly session = this.sessionState.asReadonly();

  private readonly http = inject(HttpClient);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly mustChangePassword = signal(false);

  readonly isAuthenticated = computed(() => !!this.sessionState() && new Date(this.sessionState()!.expiresAt).getTime() > Date.now());
  readonly displayName = computed(() => this.sessionState()?.displayName ?? 'User');
  readonly userId = computed(() => this.sessionState()?.userId ?? null);
  readonly companyId = computed(() => this.sessionState()?.user?.companyId ?? this.getCompanyIdFromToken() ?? null);
  readonly authMode = computed(() => this.sessionState()?.authMode ?? 'portal');
  readonly isBuilderWorkspaceUser = computed(() => this.authMode() === 'builderWorkspace');

  readonly initials = computed(() => this.displayName().split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase());

  constructor() {
    const session = this.sessionState();
    this.mustChangePassword.set(storage?.getItem('mustChangePassword') === 'true' || session?.mustChangePassword === true);
    this.scheduleRefresh(session);
  }

  private scheduleRefresh(session: LoginResponse | null): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    if (!session?.accessToken || !session.expiresAt || typeof window === 'undefined') return;
    const delay = Math.max(10_000, new Date(session.expiresAt).getTime() - Date.now() - 60_000);
    this.refreshTimer = setTimeout(() => this.refreshToken().subscribe(), delay);
  }

  private setSession(session: LoginResponse): void {
    storage?.setItem(this.sessionStorageKey, JSON.stringify(session));
    storage?.setItem('accessToken', session.accessToken);
    this.sessionState.set(session);
  }

  private normalizeSession(response: LoginResponse, current?: LoginResponse | null): LoginResponse {
    return {
      ...current,
      ...response,
      userId: response.userId ?? response.user?.id ?? current?.userId ?? '',
      email: response.email ?? current?.email ?? '',
      displayName: response.displayName ?? response.user?.userName ?? current?.displayName ?? 'User',
      userRoles: response.userRoles ?? (response.user?.role ? [response.user.role] : current?.userRoles ?? []),
      permissions: response.permissions ?? response.user?.permissions ?? current?.permissions ?? [],
      mustChangePassword: response.mustChangePassword ?? current?.mustChangePassword ?? false
    };
  }

  ensureSession(): Observable<boolean> {
    if (this.isAuthenticated()) return of(true);
    return this.refreshToken().pipe(map(session => !!session && this.isAuthenticated()));
  }

  private restoreSession(): LoginResponse | null {
    try {
      const value = storage?.getItem(this.sessionStorageKey);
      if (!value) return null;
      const session = JSON.parse(value) as LoginResponse;
      if (!session.accessToken || new Date(session.expiresAt).getTime() <= Date.now()) {
        storage?.removeItem(this.sessionStorageKey);
        return null;
      }
      return session;
    } catch { storage?.removeItem(this.sessionStorageKey); return null; }
  }

  hasAnyRole(roles: readonly string[]): boolean {
    const assigned = this.sessionState()?.userRoles ?? [];
    return roles.length === 0 || roles.some(role => assigned.some(value => value.toLowerCase() === role.toLowerCase()));
  }

  token(): string | null { return this.isAuthenticated() ? this.sessionState()?.accessToken ?? null : null; }

  clearError(): void { this.error.set(null); }

  setError(message: string): void {
    this.error.set(message);
  }

  getCompanyIdFromToken(): string | null {
    const token = storage?.getItem('accessToken');
    if (!token) return null;

    try {
      const payload = token.split('.')[1];
      if (!payload) return null;

      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='));
      const claims = JSON.parse(decoded) as JwtPayload;
      const companyId = claims.companyId ?? claims.company_id ?? claims.tenant_id;
      return companyId === undefined || companyId === null ? null : String(companyId);
    } catch {
      return null;
    }
  }

  tenantId(): string | null {
    return this.sessionState()?.user?.companyId
      ?? this.getCompanyIdFromToken()
      ?? storage?.getItem('tenantId')
      ?? storage?.getItem('companyId')
      ?? null;
  }

  login(userName: string, password: string): Observable<LoginResponse> {
    this.loading.set(true);
    this.error.set(null);
    const url = `${getGatewayApiBaseUrl()}/auth/login`;

    return this.http.post<LoginResponse>(url, { userName, password }, { withCredentials: true }).pipe(
      tap(response => {
        const session: LoginResponse = {
          ...response,
          userId: response.userId ?? response.user?.id,
          email: response.email ?? '',
          displayName: response.displayName ?? response.user?.userName ?? 'User',
          userRoles: response.userRoles ?? (response.user?.role ? [response.user.role] : []),
          permissions: response.permissions ?? response.user?.permissions ?? []
        };
        this.setSession(session);
        storage?.setItem('accessToken', response.accessToken);
        storage?.setItem('currentUser', JSON.stringify(response.user));
        storage?.setItem('mustChangePassword', String(response.mustChangePassword));
        this.mustChangePassword.set(session.mustChangePassword);
        this.scheduleRefresh(session);
      }),
      finalize(() => this.loading.set(false))
    );
  }

  sendForgetPassword(email: string): Observable<any> {
    const url = `${getGatewayApiBaseUrl()}/builder/builder-workspace/login/SendForgetPasswordCode?email=${email}`;
    return this.http.post(url, null);
  }

  loginBuilderWorkspace(email: string, password: string): Observable<LoginResponse> {
    this.loading.set(true);
    this.error.set(null);
    return this.http.post<LoginResponse>(`${getGatewayApiBaseUrl()}/builder/builder-workspace/login`, { email, password }).pipe(
      tap(response => {
        const session = this.normalizeSession({ ...response, authMode: 'builderWorkspace' });
        this.setSession(session);
        storage?.setItem('accessToken', session.accessToken);
        storage?.setItem('currentUser', JSON.stringify(session.user));
        storage?.setItem('mustChangePassword', String(session.mustChangePassword));
        this.mustChangePassword.set(session.mustChangePassword);
        this.scheduleRefresh(session);
      }),
      finalize(() => this.loading.set(false))
    );
  }

  refreshToken(): Observable<LoginResponse | null> {
    const current = this.sessionState();
    if (current?.authMode === 'builderWorkspace') {
      return this.http.post<LoginResponse>(`${getGatewayApiBaseUrl()}/builder/builder-workspace/refresh`, {}).pipe(
        tap(response => {
          const session = this.normalizeSession({ ...response, authMode: 'builderWorkspace' }, current);
          this.setSession(session);
          storage?.setItem('accessToken', session.accessToken);
          storage?.setItem('currentUser', JSON.stringify(session.user));
          storage?.setItem('mustChangePassword', String(session.mustChangePassword));
          this.mustChangePassword.set(session.mustChangePassword);
          this.scheduleRefresh(session);
        }),
        catchError(() => {
          if (!this.isAuthenticated()) this.logout();
          else if (typeof window !== 'undefined') this.refreshTimer = setTimeout(() => this.refreshToken().subscribe(), 30_000);
          return of(null);
        })
      );
    }
    return this.http.post<LoginResponse>(`${getGatewayApiBaseUrl()}/auth/refresh`, {}, { withCredentials: true }).pipe(
      tap(response => this.setSession(this.normalizeSession(response, current))),
      catchError(() => {
        // A temporary API/gateway failure must not erase a still-valid login.
        if (!this.isAuthenticated()) this.logout();
        else if (typeof window !== 'undefined') this.refreshTimer = setTimeout(() => this.refreshToken().subscribe(), 30_000);
        return of(null);
      })
    );
  }

  changePassword(request: ChangePasswordRequest): Observable<void> {
    const accessToken = storage?.getItem('accessToken');
    const options = accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {};
    const url = this.isBuilderWorkspaceUser()
      ? `${getGatewayApiBaseUrl()}/builder/builder-workspace/change-password`
      : `${getGatewayApiBaseUrl()}/auth/change-password`;
    const payload = this.isBuilderWorkspaceUser()
      ? { ...request, currentPassword: request.currentPassword ?? '' }
      : { newPassword: request.newPassword, confirmPassword: request.confirmPassword };

    return this.http.post<void>(url, payload, options).pipe(
      tap(() => { this.mustChangePassword.set(false); storage?.setItem('mustChangePassword', 'false'); })
    );
  }

  logout(): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
    if (!this.isBuilderWorkspaceUser()) {
      const logoutUrl = `${getGatewayApiBaseUrl()}/auth/logout`;
      void this.http.post<void>(logoutUrl, {}, { withCredentials: true }).subscribe({ error: () => undefined });
    }
    this.sessionState.set(null);
    storage?.removeItem('accessToken');
    storage?.removeItem('currentUser');
    storage?.removeItem(this.sessionStorageKey);
    storage?.removeItem('mustChangePassword');
    this.mustChangePassword.set(false);
  }

}
