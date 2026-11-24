import { Injectable, signal } from '@angular/core';

export interface PublishedAppSession {
  accessToken: string;
  expiresAt: string;
  applicationId: string;
  tenantId: string;
  user: { id: string; email: string; displayName: string };
  mustChangePassword: boolean;
}

const sessionKey = 'sorte.published-app.session';

@Injectable({ providedIn: 'root' })
export class PublishedApplicationSessionService {
  private readonly state = signal<PublishedAppSession | null>(this.restore());
  readonly session = this.state.asReadonly();

  tokenFor(applicationId: string): string | null {
    const current = this.state();
    if (!current || current.applicationId !== applicationId || new Date(current.expiresAt).getTime() <= Date.now()) {
      if (current?.applicationId === applicationId) this.logout();
      return null;
    }
    return current.accessToken;
  }

  set(session: PublishedAppSession): void {
    this.state.set(session);
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(sessionKey, JSON.stringify(session));
  }

  logout(): void {
    this.state.set(null);
    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(sessionKey);
  }

  private restore(): PublishedAppSession | null {
    try {
      if (typeof sessionStorage === 'undefined') return null;
      const current = JSON.parse(sessionStorage.getItem(sessionKey) ?? 'null') as PublishedAppSession | null;
      if (!current?.accessToken || !current.applicationId || new Date(current.expiresAt).getTime() <= Date.now()) {
        sessionStorage.removeItem(sessionKey);
        return null;
      }
      return current;
    } catch {
      if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(sessionKey);
      return null;
    }
  }
}
