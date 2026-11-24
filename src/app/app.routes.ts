import { Routes } from '@angular/router';
import type { PageTreeDesignerComponent } from './pages/builders/application-design/designer/page-tree-designer.component';
import { LandingComponent } from './landing/landing.component';
import { LoginComponent } from './pages/auth/login/login.component';
import { authGuard } from '@core/services/auth/auth.guard';
import { LayoutComponent } from './layout/layout.component';
import { ApplicationsComponent } from './pages/builders/applications/applications.component';

import { ChangePasswordComponent } from './pages/auth/change-password/change-password.component';
import { TemplatesComponent } from './pages/builders/templates/templates.component';
import { systemAdminGuard, tenantAdminGuard, tenantConfigurationAdminGuard } from '@core/services/auth/role.guard';
import { CustomDashbaordsComponent } from './pages/custom-dashbaords/custom-dashbaords.component';
import { SystemStatusComponent } from './pages/system-status/system-status.component';
import { RuntimeFormComponent } from './pages/builders/runtime-form/runtime-form.component';

export const routes: Routes = [
  { path: 'published/:tenantId/:applicationId/assistant', loadComponent: () => import('./pages/published-app-assistant/published-app-assistant.component').then(m => m.PublishedAppAssistantComponent) },
  { path: 'builder/applications/:id/screens/:screenKey', canActivate: [authGuard], loadComponent: () => import('@pages/builders/template-screen/template-screen.component').then(m => m.TemplateScreenComponent) },
  { path: 'builder/applications/:id/data-sources', canActivate: [authGuard], loadComponent: () => import('@pages/builders/data-sources/data-sources.component').then(m => m.DataSourcesComponent) },
  { path: 'builder/applications/:id/documents', canActivate: [authGuard], loadComponent: () => import('@pages/builders/application-documents/application-documents.component').then(m => m.ApplicationDocumentsComponent) },
  { path: 'builder/applications/:id/email-templates', canActivate: [authGuard], loadComponent: () => import('@pages/builders/email-builder/email-builder.component').then(m => m.EmailBuilderComponent) },
  { path: 'builder/applications/:id/jobs', canActivate: [authGuard], loadComponent: () => import('@pages/builders/scheduled-jobs/scheduled-jobs.component').then(m => m.ScheduledJobsComponent) },
  { path: 'builder/applications/:id/workflows', canActivate: [authGuard], loadComponent: () => import('@pages/builders/workflows/workflows.component').then(m => m.WorkflowsComponent) },
  { path: '', component: LandingComponent },
  { path: 'login', component: LoginComponent },
  { path: 'change-password', component: ChangePasswordComponent, canActivate: [authGuard] },
  { path: 'builder/applications/:id/forms', canActivate: [authGuard], loadComponent: () => import('./pages/builders/form-designer/form-designer.component').then(m => m.FormDesignerComponent) },
  { path: 'builder/applications/:id/design', canActivate: [authGuard], canDeactivate: [(component: PageTreeDesignerComponent) => component.canLeave()], loadComponent: () => import('./pages/builders/application-design/designer/page-tree-designer.component').then(m => m.PageTreeDesignerComponent) },
  {
    path: 'builder', component: LayoutComponent, canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', component: SystemStatusComponent },
      { path: 'dashboard', component: SystemStatusComponent },
      { path: 'ai-governance', canActivate: [systemAdminGuard], loadComponent: () => import('./pages/ai-governance/ai-governance.component').then(m => m.AiGovernanceComponent) },
      { path: 'tenant-configurations', canActivate: [tenantConfigurationAdminGuard], loadComponent: () => import('./pages/builders/tenant-configurations/settings/tenant-settings-page.component').then(m => m.TenantSettingsPageComponent) },
      { path: 'user-management/users', canActivate: [tenantAdminGuard], loadComponent: () => import('./pages/builders/user-management/users/user-management.component').then(m => m.UserManagementComponent) },
      { path: 'user-management/application-access', canActivate: [tenantAdminGuard], loadComponent: () => import('./pages/builders/user-management/application-access/application-access.component').then(m => m.ApplicationAccessComponent) },
      { path: 'custom-dashboard', component: CustomDashbaordsComponent },
      { path: 'applications/new/blank', redirectTo: 'applications/new', pathMatch: 'full' },
      { path: 'applications/new', loadComponent: () => import('./pages/builders/applications/create/application-create.component').then(m => m.ApplicationCreateComponent) },
      { path: 'templates-hub', component: TemplatesComponent, canActivate: [systemAdminGuard] },
      { path: 'applications', component: ApplicationsComponent },
      { path: 'subscription', loadComponent: () => import('./pages/builders/subscription/subscription-page.component').then(m => m.SubscriptionPageComponent) },
      { path: 'forms/:objectId', component: RuntimeFormComponent },
      { path: 'data', loadComponent: () => import('./pages/builders/applications/create/application-create.component').then(m => m.ApplicationCreateComponent) },
      { path: 'workflows', loadComponent: () => import('./pages/builders/workflows/workflows.component').then(m => m.WorkflowsComponent) },
      { path: 'reports', loadComponent: () => import('./pages/builders/applications/create/application-create.component').then(m => m.ApplicationCreateComponent) },
      { path: 'assistant', canActivate: [authGuard], loadChildren: () => import('./pages/ai-chat/routes').then(m => m.default) },
    ]
  },
  { path: 'system-error', pathMatch: 'full', loadChildren: () => import('./pages/error-500/error-500.routing').then(m => m.error500Routes) },
  //{ path: 'assistant', canActivate: [authGuard], loadChildren: () => import('./pages/ai-chat/routes').then(m => m.default) },
  { path: '**', redirectTo: '/' }
];
