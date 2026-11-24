import { Injectable, computed, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { RoleKey } from '@core/enums/role-enums';

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly auth = inject(AuthService);
  readonly permissions = computed(() => new Set(this.auth.session()?.permissions ?? []));
  
  has(permission: string): boolean {
    return this.auth.hasAnyRole([
      RoleKey.systemAdmin,
      RoleKey.admin,
      RoleKey.portalDeveloper,
      RoleKey.tenantAdmin,
      RoleKey.integrator,
      RoleKey.portalUser,
      RoleKey.user
    ]) || this.permissions().has(permission);
  }

  canView(module: string): boolean { return this.has(`${module}.view`); }
  canCreate(module: string): boolean { return this.has(`${module}.new`); }
  canEdit(module: string): boolean { return this.has(`${module}.edit`); }
  canDelete(module: string): boolean { return this.has(`${module}.delete`); }
}
