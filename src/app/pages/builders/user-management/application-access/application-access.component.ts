import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccessGrant, AccessGroup, AccessGroupMember, AccessGroupRole, AccessPermission, AccessRole, BuilderApplicationMember, BuilderUserApplication, BuildersApiService, TenantBuilderUser } from '@core/builders/builders-api.service';
import { DesignerObject } from '@core/builders/interfaces/designer-object';
import { BuilderRecord } from '@core/builders/interfaces/builder-record';

type AccessTab = 'groups' | 'roles' | 'applications' | 'permissions';

@Component({
  selector: 'builder-application-access', standalone: true, imports: [CommonModule, FormsModule],
  templateUrl: './application-access.component.html', styleUrl: './application-access.component.scss'
})
export class ApplicationAccessComponent {
  private readonly api = inject(BuildersApiService);
  readonly applications = signal<BuilderUserApplication[]>([]);
  readonly users = signal<TenantBuilderUser[]>([]);
  readonly groups = signal<AccessGroup[]>([]);
  readonly roles = signal<AccessRole[]>([]);
  readonly members = signal<AccessGroupMember[]>([]);
  readonly groupRoles = signal<AccessGroupRole[]>([]);
  readonly permissions = signal<AccessPermission[]>([]);
  readonly grants = signal<AccessGrant[]>([]);
  readonly directMembers = signal<BuilderApplicationMember[]>([]);
  readonly objects = signal<DesignerObject[]>([]);
  readonly records = signal<BuilderRecord[]>([]);
  readonly tab = signal<AccessTab>('groups');
  readonly selectedApplicationId = signal('');
  readonly selectedGroupId = signal('');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  groupKey = ''; groupName = ''; groupDescription = ''; roleKey = ''; roleName = ''; roleDescription = '';
  selectedUserId = ''; selectedRoleId = ''; selectedPermissionId = ''; selectedDirectUserId = ''; selectedDirectRoleId = ''; subjectType: 'user' | 'group' | 'role' = 'group'; subjectId = '';
  permissionKey = ''; permissionName = ''; permissionAction = 'read'; permissionObjectId = ''; permissionRecordId = '';
  groupEditId = ''; roleEditId = ''; permissionEditId = '';

  constructor() { this.load(); }

  load(): void {
    this.loading.set(true); this.error.set('');
    this.api.publishedUserApplications().subscribe({
      next: apps => {
        this.applications.set(apps);
        const appId = apps.some(x => x.id === this.selectedApplicationId()) ? this.selectedApplicationId() : apps[0]?.id ?? '';
        this.selectedApplicationId.set(appId);
        this.api.tenantBuilderUsers().subscribe({ next: users => this.users.set(users), error: e => this.fail(e) });
        this.api.accessGroups().subscribe({ next: groups => { this.groups.set(groups); const groupId = groups.some(x => x.id === this.selectedGroupId()) ? this.selectedGroupId() : groups[0]?.id ?? ''; this.selectedGroupId.set(groupId); if (groupId) this.loadMembers(groupId); }, error: e => this.fail(e) });
        this.api.accessRoles().subscribe({ next: roles => this.roles.set(roles), error: e => this.fail(e) });
        if (appId) this.loadApplicationRules(appId); else this.loading.set(false);
      }, error: e => this.fail(e)
    });
  }

  selectApplication(id: string): void { this.selectedApplicationId.set(id); if (id) this.loadApplicationRules(id); }
  publishedAssistantUrl(): string {
    const tenantId = this.api.currentTenantId();
    return tenantId && this.selectedApplicationId()
      ? `/published/${encodeURIComponent(tenantId)}/${encodeURIComponent(this.selectedApplicationId())}/assistant`
      : '/';
  }
  selectGroup(id: string): void { this.selectedGroupId.set(id); if (id) this.loadMembers(id); else this.members.set([]); }
  setTab(tab: AccessTab): void { this.tab.set(tab); this.error.set(''); this.notice.set(''); }
  private loadApplicationRules(id: string): void {
    this.loading.set(true);
    let remaining = 4;
    const done = () => { if (--remaining === 0) this.loading.set(false); };
    this.api.applicationGroupRoles(id).subscribe({ next: x => { this.groupRoles.set(x); done(); }, error: e => { this.fail(e); done(); } });
    this.api.accessPermissions(id).subscribe({ next: x => { this.permissions.set(x); done(); }, error: e => { this.fail(e); done(); } });
    this.api.accessGrants(id).subscribe({ next: x => { this.grants.set(x); done(); }, error: e => { this.fail(e); done(); } });
    this.api.applicationMembers(id).subscribe({ next: x => { this.directMembers.set(x); done(); }, error: e => { this.fail(e); done(); } });
    const tenantId = this.api.currentTenantId();
    if (tenantId) this.api.dataObjects(tenantId, id).subscribe({ next: result => this.objects.set(result.objects ?? []), error: e => this.fail(e) });
  }
  private loadMembers(id: string): void { this.api.groupMembers(id).subscribe({ next: x => this.members.set(x), error: e => this.fail(e) }); }
  private fail(error: any): void { this.error.set(error?.error?.message ?? 'The access settings could not be loaded or saved.'); this.loading.set(false); this.saving.set(false); }

  saveGroup(): void {
    if (!this.groupKey.trim() || !this.groupName.trim() || this.saving()) return;
    const editing = !!this.groupEditId;
    this.run(this.api.saveAccessGroup({ key: this.groupKey.trim(), name: this.groupName.trim(), description: this.groupDescription.trim() || null, isActive: true }, this.groupEditId || undefined), group => {
      this.groups.update(x => [...x.filter(g => g.id !== group.id), group].sort((a,b) => a.name.localeCompare(b.name))); this.selectedGroupId.set(group.id); this.loadMembers(group.id); this.groupKey = ''; this.groupName = ''; this.groupDescription = ''; this.groupEditId = ''; return editing ? 'Group updated.' : 'Group created.';
    });
  }
  editGroup(group: AccessGroup): void { this.groupEditId = group.id; this.groupKey = group.key; this.groupName = group.name; this.groupDescription = group.description ?? ''; }
  removeGroup(group: AccessGroup): void { if (!confirm(`Delete group “${group.name}”?`)) return; this.run(this.api.deleteAccessGroup(group.id), () => { this.groups.update(x => x.filter(g => g.id !== group.id)); this.selectedGroupId.set(''); this.members.set([]); return 'Group removed.'; }); }
  addMember(): void { const groupId = this.selectedGroupId(); if (!groupId || !this.selectedUserId) return; this.run(this.api.setGroupMember(groupId, this.selectedUserId), () => { this.selectedUserId = ''; this.loadMembers(groupId); return 'User added to group.'; }); }
  removeMember(member: AccessGroupMember): void { this.run(this.api.removeGroupMember(this.selectedGroupId(), member.userId), () => { this.loadMembers(this.selectedGroupId()); return 'User removed from group.'; }); }

  saveRole(): void {
    if (!this.roleKey.trim() || !this.roleName.trim() || this.saving()) return;
    const editing = !!this.roleEditId;
    this.run(this.api.saveAccessRole({ key: this.roleKey.trim(), name: this.roleName.trim(), description: this.roleDescription.trim() || null, isActive: true }, this.roleEditId || undefined), role => { this.roles.update(x => [...x.filter(r => r.id !== role.id), role].sort((a,b) => a.name.localeCompare(b.name))); this.roleKey = ''; this.roleName = ''; this.roleDescription = ''; this.roleEditId = ''; return editing ? 'Role updated.' : 'Role created.'; });
  }
  editRole(role: AccessRole): void { if (role.isSystemRole) return; this.roleEditId = role.id; this.roleKey = role.key; this.roleName = role.name; this.roleDescription = role.description ?? ''; }
  removeRole(role: AccessRole): void { if (!confirm(`Delete role “${role.name}”?`)) return; this.run(this.api.deleteAccessRole(role.id), () => { this.roles.update(x => x.filter(r => r.id !== role.id)); return 'Role removed.'; }); }
  assignGroupRole(): void { const app = this.selectedApplicationId(); if (!app || !this.selectedGroupId() || !this.selectedRoleId) return; this.run(this.api.setApplicationGroupRole(app, this.selectedGroupId(), this.selectedRoleId), () => { this.selectedRoleId = ''; this.loadApplicationRules(app); return 'Application role assigned to group.'; }); }
  removeGroupRole(item: AccessGroupRole): void { const app = this.selectedApplicationId(); this.run(this.api.removeApplicationGroupRole(app, item.groupId, item.roleId), () => { this.loadApplicationRules(app); return 'Application role removed from group.'; }); }
  assignDirectUser(): void { const app = this.selectedApplicationId(); const userId = this.selectedDirectUserId; const role = this.roles().find(x => x.id === this.selectedDirectRoleId); if (!app || !userId || !role) return; this.run(this.api.assignApplicationMember(app, userId, role.key), () => { this.selectedDirectUserId = ''; this.selectedDirectRoleId = ''; this.loadApplicationRules(app); return 'User assigned directly to the application.'; }); }
  removeDirectUser(member: BuilderApplicationMember): void { const app = this.selectedApplicationId(); this.run(this.api.removeApplicationMember(app, member.userId), () => { this.loadApplicationRules(app); return 'Direct application access removed.'; }); }

  savePermission(): void {
    const app = this.selectedApplicationId(); if (!app || !this.permissionKey.trim() || !this.permissionName.trim()) return;
    const editing = !!this.permissionEditId;
    this.run(this.api.saveAccessPermission(app, { key: this.permissionKey.trim(), name: this.permissionName.trim(), resourceType: this.permissionObjectId ? 'object' : 'application', action: this.permissionAction, objectId: this.permissionObjectId || null, recordId: this.permissionRecordId || null }, this.permissionEditId || undefined), () => { this.permissionKey = ''; this.permissionName = ''; this.permissionObjectId = ''; this.permissionRecordId = ''; this.permissionEditId = ''; this.loadApplicationRules(app); return editing ? 'Permission updated.' : 'Permission created.'; });
  }
  editPermission(permission: AccessPermission): void { this.permissionEditId = permission.id; this.permissionKey = permission.key; this.permissionName = permission.name; this.permissionAction = permission.action; this.permissionObjectId = permission.objectId ?? ''; this.permissionRecordId = ''; if (this.permissionObjectId) { this.selectPermissionObject(this.permissionObjectId); this.permissionRecordId = permission.recordId ?? ''; } }
  selectPermissionObject(id: string): void { this.permissionObjectId = id; this.permissionRecordId = ''; this.records.set([]); const tenantId = this.api.currentTenantId(); if (id && tenantId) this.api.records(tenantId, id).subscribe({ next: records => this.records.set(records), error: e => this.fail(e) }); }
  removePermission(item: AccessPermission): void { if (!confirm(`Delete permission “${item.name}”?`)) return; const app = this.selectedApplicationId(); this.run(this.api.deleteAccessPermission(item.id), () => { this.loadApplicationRules(app); return 'Permission removed.'; }); }
  addGrant(): void { const app = this.selectedApplicationId(); if (!app || !this.selectedPermissionId || !this.subjectId.trim()) return; this.run(this.api.createAccessGrant(app, { permissionId: this.selectedPermissionId, subjectType: this.subjectType, subjectId: this.subjectId.trim() }), () => { this.subjectId = ''; this.loadApplicationRules(app); return 'Permission granted.'; }); }
  removeGrant(grant: AccessGrant): void { const app = this.selectedApplicationId(); this.run(this.api.deleteAccessGrant(grant.id), () => { this.loadApplicationRules(app); return 'Permission grant removed.'; }); }

  private run<T>(request: import('rxjs').Observable<T>, success: (result: T) => string): void {
    if (this.saving()) return; this.saving.set(true); this.error.set(''); this.notice.set('');
    request.subscribe({ next: result => { this.notice.set(success(result)); this.saving.set(false); }, error: e => this.fail(e) });
  }
}
