import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BuilderWorkspaceUser, BuildersApiService, TenantBuilderUser } from '@core/builders/builders-api.service';
import { AuthService } from '@core/services/auth/auth.service';

@Component({
  selector: 'builder-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export class UserManagementComponent {
  private readonly api = inject(BuildersApiService);
  private readonly auth = inject(AuthService);
  readonly users = signal<TenantBuilderUser[]>([]);
  readonly workspaceUsers = signal<BuilderWorkspaceUser[]>([]);
  workspaceRoleSelection: Record<string, string> = {};
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  email = '';
  displayName = '';
  password = '';

  constructor() { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    if (!this.auth.tenantId()) { this.loading.set(false); this.error.set('Your account has no tenant attached. Please sign in again or contact your administrator.'); return; }
    this.api.tenantBuilderUsers().subscribe({
      next: users => { this.users.set(users); this.loading.set(false); },
      error: err => { this.error.set(err?.error?.message ?? 'Could not load tenant users.'); this.loading.set(false); }
    });
    this.api.builderWorkspaceUsers().subscribe({
      next: users => {
        this.workspaceUsers.set(users);
        this.workspaceRoleSelection = Object.fromEntries(users.map(user => [user.id, user.role ?? '']));
      },
      error: err => { this.error.set(err?.error?.message ?? 'Could not load Builder workspace access.'); }
    });
  }

  saveWorkspaceRole(user: BuilderWorkspaceUser): void {
    if (this.saving()) return;
    const selected = this.workspaceRoleSelection[user.id] || null;
    this.saving.set(true); this.error.set(''); this.notice.set('');
    this.api.setBuilderWorkspaceAccess(user.id, selected as BuilderWorkspaceUser['role']).subscribe({
      next: () => {
        this.workspaceUsers.update(items => items.map(item => item.id === user.id ? { ...item, role: selected as BuilderWorkspaceUser['role'] } : item));
        this.notice.set(selected ? `${user.displayName} can access Builder as ${selected}.` : `Builder workspace access removed for ${user.displayName}.`);
        this.saving.set(false);
      },
      error: err => { this.error.set(err?.error?.message ?? 'Could not update Builder workspace access.'); this.saving.set(false); }
    });
  }

  create(): void {
    if (this.saving()) return;
    this.error.set(''); this.notice.set(''); this.saving.set(true);
    this.api.createTenantBuilderUser({ email: this.email.trim(), displayName: this.displayName.trim(), password: this.password }).subscribe({
      next: user => {
        this.users.update(items => [...items, user].sort((a, b) => a.displayName.localeCompare(b.displayName)));
        this.email = ''; this.displayName = ''; this.password = '';
        this.notice.set('User created. Assign access to published applications from Application access. The user will be required to change this initial password.');
        this.saving.set(false);
      },
      error: err => { this.error.set(err?.error?.message ?? 'Could not create this user.'); this.saving.set(false); }
    });
  }

  edit(user: TenantBuilderUser): void {
    const displayName = prompt('Update the user name:', user.displayName);
    if (displayName === null || !displayName.trim()) return;
    this.saving.set(true); this.error.set(''); this.notice.set('');
    this.api.updateTenantBuilderUser(user.id, { displayName: displayName.trim(), isActive: user.isActive }).subscribe({
      next: updated => { this.users.update(items => items.map(item => item.id === updated.id ? { ...item, ...updated } : item)); this.notice.set('User updated.'); this.saving.set(false); },
      error: err => { this.error.set(err?.error?.message ?? 'Could not update this user.'); this.saving.set(false); }
    });
  }

  toggleActive(user: TenantBuilderUser): void {
    this.saving.set(true); this.error.set(''); this.notice.set('');
    this.api.updateTenantBuilderUser(user.id, { displayName: user.displayName, isActive: !user.isActive }).subscribe({
      next: updated => { this.users.update(items => items.map(item => item.id === updated.id ? { ...item, ...updated } : item)); this.notice.set(updated.isActive ? 'User reactivated.' : 'User deactivated; existing sessions have been invalidated.'); this.saving.set(false); },
      error: err => { this.error.set(err?.error?.message ?? 'Could not update user status.'); this.saving.set(false); }
    });
  }

  delete(user: TenantBuilderUser): void {
    if (!confirm(`Delete ${user.displayName} from this tenant? This deactivates the account and removes its sign-in access.`)) return;
    this.saving.set(true); this.error.set(''); this.notice.set('');
    this.api.deleteTenantBuilderUser(user.id).subscribe({
      next: () => { this.users.update(items => items.filter(item => item.id !== user.id)); this.notice.set('User deleted.'); this.saving.set(false); },
      error: err => { this.error.set(err?.error?.message ?? 'Could not delete this user.'); this.saving.set(false); }
    });
  }
}
