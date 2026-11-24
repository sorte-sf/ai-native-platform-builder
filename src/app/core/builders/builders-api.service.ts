import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BuilderApplication } from './interfaces/builder-application';
import { CreateBuilderApplicationRequest } from './interfaces/create-builder-application.request';

import { BuilderMenuItem } from './interfaces/builder-menuItem';
import { RuntimeFormDefinition } from './interfaces/runtime-form-definition';
import { BuilderRecord } from './interfaces/builder-record';
import { DesignerApplication } from './interfaces/designer-application';
import { SaveDesignerDraft } from './interfaces/save-designer-draft';
import { DesignerObject } from './interfaces/designer-object';
import { BuilderTemplate } from './interfaces/builder-template';
import { AuthService } from '@core/services/auth/auth.service';
import { RuntimeFormField } from './interfaces/runtime-form-field';
import { getGatewayApiBaseUrl } from '../gateway-config';
export interface PublishedApplication {
  Menus: { Id: string; ParentId: string | null; Label: string; Route: string | null; SortOrder: number; Visible: boolean; Icon?: string | null; PermissionKey?: string | null }[];
  Id: string; Name: string; ThemeJson: string | null; PublishedVersion: string;
  Modules: { Id: string; ScreenId: string; ObjectId: string; FormId: string }[];
  Screens: { Id: string; Key: string; Title: string; HtmlContent: string; ObjectId: string | null; FormKey: string | null; FormId?: string | null; DefinitionJson?: string | null }[];
  Forms: { Id: string; ObjectId: string; Key: string; Name: string; LayoutJson: string | null }[];
  Objects: { Id: string; Fields: { Key: string; Label: string; Type: RuntimeFormField['type']; SortOrder: number; Required: boolean; ReadOnly: boolean; ConfigurationJson: string | null }[] }[];
}
export interface GeneratedPublishedWidget {
  type: 'metric' | 'table' | 'barChart' | 'donutChart'; title: string;
  fields?: Array<{ key: string; label: string }>; rows?: Array<Record<string, unknown>>;
  value?: number; total?: number; groupBy?: string; groups?: Array<{ label: string; value: number }>;
}
export interface PublishedUiSpecification {
  answer: string;
  widgets: Array<{ type: string; title: string; objectKey: string; fields: string[];
    filters?: Array<{ field: string; operator: string; value: string | null }>;
    groupByField?: string | null; valueField?: string | null; aggregate: string }>;
}
export interface PublishedUiResult {
  specification: PublishedUiSpecification; answer: string; widgets: GeneratedPublishedWidget[];
  publishedVersion: string; versionChanged?: boolean; id?: string; name?: string;
}
export interface UserFavouriteLink { id: string; name: string; publishedVersion: string; createdAt: string; updatedAt: string; }
export interface AiApplicationProposal {
  name: string; description?: string | null;
  objects: Array<{ key: string; name: string; fields: Array<{ key: string; label: string; type: string; required: boolean; searchable: boolean }> }>;
  pages: Array<{ key: string; title: string; objectKey: string; description?: string | null }>;
  navigation?: Array<{ label: string; pageKey: string }> | null;
}
export interface PublishedAppLoginResponse {
  accessToken: string; expiresAt: string; mustChangePassword: boolean;
  user: { id: string; email: string; displayName: string; tenantId: string };
}
export interface TenantBuilderUser { id: string; email: string; displayName: string; isActive: boolean; mustChangePassword: boolean; createdAt: string; applicationCount: number; }
export interface BuilderWorkspaceUser { id: string; email: string; displayName: string; isActive: boolean; role: 'BuilderAdmin' | 'BuilderEditor' | 'BuilderViewer' | null; }
export interface BuilderUserApplication { id: string; name: string; key: string; publishedVersion: string; }
export interface BuilderApplicationMember { userId: string; email: string; displayName: string; role: string; createdAt: string; applicationName?: string; }
export interface AccessGroup { id: string; key: string; name: string; description?: string | null; isActive: boolean; memberCount?: number; }
export interface AccessRole { id: string; key: string; name: string; description?: string | null; isActive: boolean; isSystemRole?: boolean; }
export interface AccessGroupMember { id: string; userId: string; email: string; displayName: string; isActive: boolean; }
export interface AccessGroupRole { id: string; groupId: string; groupName: string; roleId: string; roleName: string; roleKey: string; isActive: boolean; }
export interface AccessPermission { id: string; applicationId: string; key: string; name: string; resourceType: string; action: string; objectId: string | null; recordId: string | null; }
export interface AccessGrant { id: string; permissionId: string; permissionName: string; subjectType: 'user' | 'group' | 'role'; subjectId: string; }
export interface SystemDashboardSummary {
  scope: 'system' | 'tenant';
  tenantId: string | null;
  asOfUtc: string;
  tenantCount: number;
  applications: { total: number; published: number; drafts: number; archived: number; passive: number; deleted: number };
  users: { active: number; createdLast30Days: number };
  recentlyUpdatedApplications: { id: string; name: string; status: string; updatedAt: string }[];
  tenantBreakdown: { tenantId: string; name: string; applicationCount: number; publishedCount: number; draftCount: number; activeUserCount: number }[];
}
export interface BuilderApplicationVersion {
  id: string;
  versionNumber: string;
  publishedAt: string | null;
  templateSource: {
    TemplateId?: string | null;
    TemplateKey?: string | null;
    TemplateName?: string | null;
    Category?: string | null;
    IsBuiltIn?: boolean | null;
    ReleaseId?: string | null;
    ReleaseVersion?: string | null;
    ManifestVersion?: number | null;
  } | null;
}

export interface BuilderEmailTemplate {
  id: string; tenantId: string; applicationId: string; key: string; name: string;
  subject: string; language: string; templateType: string; definitionJson: string;
  createdAt: string; updatedAt: string;
}
export interface BuilderSolutionUpload {
  id: string; applicationId: string; title: string; fileId: string | null; fileUrl: string | null;
  chunksIndexed: number; indexStatus: string;
}
export interface BuilderApplicationDocument {
  id: string;
  applicationId: string;
  title: string;
  fileId: string | null;
  fileName: string;
  size: number | null;
  createdAt: string;
  published: boolean;
}
export interface BuilderSolutionSearchResult {
  documentId: string; title: string; source: string | null; chunkOrdinal: number; content: string; score: number;
}
export interface BuilderScheduledJob {
  id: string; tenantId: string; applicationId: string; key: string; schedule: string; timeZoneId: string;
  scheduleType: 'once' | 'recurring'; runAt: string | null;
  actionType: string; actionJson: string; enabled: boolean; lastRunAt: string | null;
  nextRunAt: string | null; createdAt: string; updatedAt: string;
}
export interface BuilderScheduledJobTemplate {
  id: string; key: string; name: string; description: string; category: string; manifestJson: string | null;
}
export interface TenantAiPolicy {
  tenantId: string; mode: 'Disabled' | 'Local' | 'CustomerCloud' | 'PlatformManaged'; provider: string;
  endpoint: string | null; model: string | null; hasApiKey: boolean;
  monthlyTokenLimit: number; monthlyRequestLimit: number; maxOutputTokens: number;
}
export interface AiProviderOption { provider: string; model: string; mode: 'Local' | 'CustomerCloud' | 'PlatformManaged'; hasApiKey: boolean; }
export interface TenantAiUsage {
  month: string; totalRequests: number; inputTokens: number; outputTokens: number; totalTokens: number;
  items: Array<{ feature: string; provider: string; model: string; inputTokens: number; outputTokens: number;
    isEstimated: boolean; outcome: string; failureCode: string | null; createdAt: string }>;
}
export interface ConfigTenant { tenantId: string; name: string; recordState: string | number; }
export interface TenantSmtpConfig { tenantId: string; host: string; port: number | null; userName: string | null; from: string; displayName: string | null; enableSsl: boolean | null; useStartTls: boolean | null; hasPassword: boolean; }
export interface TenantIntegrationConfig { id: string; tenantId: string; applicationId: string; name: string; integrationType: number | 'DbServer' | 'Api'; port: number | null; userName: string | null; databaseName: string | null; enableSsl: boolean | null; hasPassword: boolean; hasToken: boolean; hasConnectionString: boolean; mappingCount: number; }
export interface TenantFieldMapping { id: string; tenantIntegrationConfigurationId: string; sourceFieldName: string; sourceFieldDescription: string | null; destinationFieldName: string; }
export interface TenantIntegrationInput { name: string; applicationId: string; integrationType: number; port: number | null; userName: string | null; password: string | null; token: string | null; connectionString: string | null; databaseName: string | null; enableSsl: boolean | null; clearPassword: boolean; clearToken: boolean; clearConnectionString: boolean; }
export interface TenantMappingInput { sourceFieldName: string; sourceFieldDescription: string | null; destinationFieldName: string; }
export interface BuilderRelationship {
  id: string;
  tenantId: string;
  sourceObjectId: string;
  targetObjectId: string;
  key: string;
  name: string;
  cardinality: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
}
export interface BuilderWorkflow {
  id: string; tenantId: string; applicationId: string; key: string; name: string;
  status: string; definitionJson: string; version: number; createdAt: string; updatedAt: string;
}
export interface AiWorkflowProposal {
  name: string; key: string; summary: string; definitionJson: string; provider: string; model: string;
}
export interface WorkflowApprovalPolicy {
  id: string; tenantId: string; applicationId: string; key: string; name: string;
  steps: Array<{ name: string; assignedTo: string; dueHours?: number | null; escalationHours?: number | null; escalateTo?: string | null; preventRequesterApproval?: boolean; mode?: 'all' | 'any' }>;
  updatedAt: string;
}
export interface BuilderWorkflowTaskRuntime {
  id: string; tenantId: string; workflowInstanceId: string; name: string; assignedTo: string | null;
  completed: boolean; activated: boolean; dueAt: string | null; createdAt: string;
}
export interface BuilderWorkflowInstanceRuntime {
  id: string; tenantId: string; workflowId: string; recordId: string; status: string;
  currentState: string; createdAt: string; tasks: BuilderWorkflowTaskRuntime[];
}
export interface WorkflowSimulationResult {
  status: 'completed' | 'waiting';
  steps: Array<{ nodeId: string; title: string; type: string; result?: string | null }>;
  awaitingNodeId?: string | null;
  message?: string | null;
}
export type SaveBuilderEmailTemplate = Omit<BuilderEmailTemplate, 'id' | 'applicationId' | 'createdAt' | 'updatedAt'>;

export interface TenantSubscriptionUsage {
  tenantId: string;
  hasActiveSubscription: boolean;
  startsOn: string | null;
  endsOn: string | null;
  applicationsUsed: number;
  applicationsLimit: number;
  usersUsed: number;
  usersLimit: number;
  integrationsConfigured: number;
  aiRequestsThisMonth: number;
}

@Injectable({ providedIn: 'root' })
export class BuildersApiService {
  subscriptionUsage(tenantId: string) {
    return this.http.get<TenantSubscriptionUsage>(`${this.base}/subscription/usage`, { params: { tenantId } });
  }
  currentTenantId(): string { return this.auth.tenantId() ?? ''; }
  configuredTenants() { return this.http.get<ConfigTenant[]>(`${this.base}/tenant-configurations/tenants`); }
  tenantSmtp(tenantId: string) { return this.http.get<TenantSmtpConfig | null>(`${this.base}/tenant-configurations/tenants/${tenantId}/smtp`); }
  saveTenantSmtp(tenantId: string, value: { host: string; port: number | null; userName: string | null; from: string; displayName: string | null; password: string | null; enableSsl: boolean | null; useStartTls: boolean | null; clearPassword: boolean }) { return this.http.put<TenantSmtpConfig>(`${this.base}/tenant-configurations/tenants/${tenantId}/smtp`, value); }
  deleteTenantSmtp(tenantId: string) { return this.http.delete<void>(`${this.base}/tenant-configurations/tenants/${tenantId}/smtp`); }
  tenantIntegrations(tenantId: string) { return this.http.get<TenantIntegrationConfig[]>(`${this.base}/tenant-configurations/tenants/${tenantId}/integrations`); }
  createTenantIntegration(tenantId: string, value: TenantIntegrationInput) { return this.http.post<TenantIntegrationConfig>(`${this.base}/tenant-configurations/tenants/${tenantId}/integrations`, value); }
  updateTenantIntegration(tenantId: string, id: string, value: TenantIntegrationInput) { return this.http.put<TenantIntegrationConfig>(`${this.base}/tenant-configurations/tenants/${tenantId}/integrations/${id}`, value); }
  deleteTenantIntegration(tenantId: string, id: string) { return this.http.delete<void>(`${this.base}/tenant-configurations/tenants/${tenantId}/integrations/${id}`); }
  tenantMappings(tenantId: string, integrationId: string) { return this.http.get<TenantFieldMapping[]>(`${this.base}/tenant-configurations/tenants/${tenantId}/integrations/${integrationId}/mappings`); }
  createTenantMapping(tenantId: string, integrationId: string, value: TenantMappingInput) { return this.http.post<TenantFieldMapping>(`${this.base}/tenant-configurations/tenants/${tenantId}/integrations/${integrationId}/mappings`, value); }
  updateTenantMapping(tenantId: string, integrationId: string, id: string, value: TenantMappingInput) { return this.http.put<TenantFieldMapping>(`${this.base}/tenant-configurations/tenants/${tenantId}/integrations/${integrationId}/mappings/${id}`, value); }
  deleteTenantMapping(tenantId: string, integrationId: string, id: string) { return this.http.delete<void>(`${this.base}/tenant-configurations/tenants/${tenantId}/integrations/${integrationId}/mappings/${id}`); }
  aiPolicy(tenantId: string) { return this.http.get<TenantAiPolicy>(`${this.base}/ai/policy`, { params: { tenantId } }); }
  saveAiPolicy(value: { tenantId: string; mode: string; provider: string | null; endpoint: string | null;
    model: string | null; apiKeyReference: string | null; authScheme: string; monthlyTokenLimit: number;
    monthlyRequestLimit: number; maxOutputTokens: number }) {
    return this.http.put<TenantAiPolicy>(`${this.base}/ai/policy`, value);
  }
  aiUsage(tenantId: string, month: string) { return this.http.get<TenantAiUsage>(`${this.base}/ai/usage`, { params: { tenantId, month } }); }
  scheduledJobs(tenantId: string, applicationId: string) {
    return this.http.get<BuilderScheduledJob[]>(`${this.base}/applications/${applicationId}/scheduled-jobs`, { params: { tenantId } });
  }
  scheduledJobTemplates(applicationId: string, tenantId: string) {
    return this.http.get<BuilderScheduledJobTemplate[]>(`${this.base}/applications/${applicationId}/scheduled-jobs/templates`, { params: { tenantId } });
  }
  createScheduledJob(applicationId: string, value: { tenantId: string; applicationId: string; key: string; schedule: string; timeZoneId: string; scheduleType: 'once' | 'recurring'; localRunAt: string | null; actionType: string; actionJson: string; nextRunAt: string | null }) {
    return this.http.post<BuilderScheduledJob>(`${this.base}/applications/${applicationId}/scheduled-jobs`, value);
  }
  setScheduledJobEnabled(applicationId: string, jobId: string, tenantId: string, enabled: boolean) {
    return this.http.patch<{ id: string; enabled: boolean }>(`${this.base}/applications/${applicationId}/scheduled-jobs/${jobId}/enabled`, { tenantId, enabled });
  }
  deleteScheduledJob(applicationId: string, jobId: string, tenantId: string) {
    return this.http.delete<void>(`${this.base}/applications/${applicationId}/scheduled-jobs/${jobId}`, { params: { tenantId } });
  }
  downloadScheduledJobReport(applicationId: string, jobId: string, tenantId: string) {
    return this.http.get(`${this.base}/applications/${applicationId}/scheduled-jobs/${jobId}/latest-report`, { params: { tenantId }, responseType: 'blob' });
  }
  workflows(tenantId: string, applicationId: string) {
    return this.http.get<BuilderWorkflow[]>(`${this.base}/workflows`, { params: { tenantId, applicationId } });
  }
  workflowApprovalPolicies(applicationId: string, tenantId: string) {
    return this.http.get<WorkflowApprovalPolicy[]>(`${this.base}/applications/${applicationId}/workflow-approval-policies`, { params: { tenantId } });
  }
  saveWorkflowApprovalPolicy(applicationId: string, tenantId: string, policy: Pick<WorkflowApprovalPolicy, 'key' | 'name' | 'steps'>) {
    return this.http.post<WorkflowApprovalPolicy>(`${this.base}/applications/${applicationId}/workflow-approval-policies`, policy, { params: { tenantId } });
  }
  proposeWorkflow(applicationId: string, tenantId: string, prompt: string) {
    return this.http.post<AiWorkflowProposal>(`${this.base}/applications/${applicationId}/workflows/ai-propose`, { tenantId, prompt });
  }
  acceptWorkflowProposal(applicationId: string, tenantId: string, proposal: AiWorkflowProposal) {
    return this.http.post<BuilderWorkflow>(`${this.base}/applications/${applicationId}/workflows/ai-accept`, {
      tenantId, applicationId, key: proposal.key, name: proposal.name, definitionJson: proposal.definitionJson
    });
  }
  createWorkflow(value: { tenantId: string; applicationId: string; key: string; name: string; definitionJson: string }) {
    return this.http.post<BuilderWorkflow>(`${this.base}/workflows`, value);
  }
  updateWorkflow(id: string, value: { tenantId: string; name: string; definitionJson: string }) {
    return this.http.put<BuilderWorkflow>(`${this.base}/workflows/${id}`, value);
  }
  publishWorkflow(id: string, tenantId: string) {
    return this.http.post<BuilderWorkflow>(`${this.base}/workflows/${id}/publish`, null, { params: { tenantId } });
  }
  deactivateWorkflow(id: string, tenantId: string) {
    return this.http.post<BuilderWorkflow>(`${this.base}/workflows/${id}/deactivate`, null, { params: { tenantId } });
  }
  reactivateWorkflow(id: string, tenantId: string) {
    return this.http.post<BuilderWorkflow>(`${this.base}/workflows/${id}/reactivate`, null, { params: { tenantId } });
  }
  workflowInbox(tenantId: string) {
    return this.http.get<BuilderWorkflowTaskRuntime[]>(`${this.base}/workflow-tasks/inbox`, { params: { tenantId } });
  }
  workflowInstances(tenantId: string) {
    return this.http.get<BuilderWorkflowInstanceRuntime[]>(`${this.base}/workflow-instances`, { params: { tenantId } });
  }
  startWorkflow(tenantId: string, workflowId: string, recordId: string) {
    return this.http.post<BuilderWorkflowInstanceRuntime>(`${this.base}/workflow-instances`, { tenantId, workflowId, recordId });
  }
  completeWorkflowTask(tenantId: string, taskId: string, outcome: 'approved' | 'rejected' = 'approved') {
    return this.http.post<void>(`${this.base}/workflow-tasks/${taskId}/complete`, { tenantId, taskId, outcome });
  }
  simulateWorkflow(applicationId: string, workflowId: string, tenantId: string, recordDataJson: string, approvalOutcomes: Record<string, string> = {}) {
    return this.http.post<WorkflowSimulationResult>(`${this.base}/applications/${applicationId}/workflows/${workflowId}/simulate`, {
      tenantId, recordDataJson, approvalOutcomes
    });
  }
  submitPurchaseApproval(tenantId: string, workflowId: string, recordId: string) {
    return this.http.post<BuilderWorkflowInstanceRuntime>(`${this.base}/purchase-approvals/submit`, { tenantId, workflowId, recordId });
  }
  decidePurchaseApproval(tenantId: string, taskId: string, decision: 'approve' | 'reject', comment: string | null) {
    return this.http.post<void>(`${this.base}/purchase-approvals/tasks/${taskId}/decision`, { tenantId, decision, comment });
  }
  emailTemplates(tenantId: string, applicationId: string) {
    return this.http.get<BuilderEmailTemplate[]>(`${this.base}/applications/${applicationId}/email-templates`, { params: { tenantId } });
  }
  createEmailTemplate(applicationId: string, value: SaveBuilderEmailTemplate) {
    return this.http.post<BuilderEmailTemplate>(`${this.base}/applications/${applicationId}/email-templates`, value);
  }
  updateEmailTemplate(applicationId: string, id: string, value: SaveBuilderEmailTemplate) {
    return this.http.put<BuilderEmailTemplate>(`${this.base}/applications/${applicationId}/email-templates/${id}`, value);
  }
  deleteEmailTemplate(applicationId: string, id: string, tenantId: string) {
    return this.http.delete<void>(`${this.base}/applications/${applicationId}/email-templates/${id}`, { params: { tenantId } });
  }
  proposeDesignerChange(applicationId: string, tenantId: string, pageId: string | null, command: string, definitionJson: string, selectedId: string | null, mode: 'new' | 'edit') {
    return this.http.post<{ mode: 'new' | 'edit'; title: string | null; summary: string; definitionJson: string; provider: string; model: string }>(`${this.base}/applications/${applicationId}/ai-designer/propose`, { tenantId, pageId, command, definitionJson, selectedId, mode });
  }
  proposeAiScaffold(tenantId: string, prompt: string, provider?: string, model?: string) {
    return this.http.post<AiApplicationProposal>(`${this.base}/applications/ai-scaffold/propose`, { tenantId, prompt, provider, model });
  }
  availableAiModels(tenantId: string) { return this.http.get<AiProviderOption[]>(`${this.base}/ai/available-models`, { params: { tenantId } }); }
  savePersonalAiModel(value: { tenantId: string; provider: string; endpoint: string | null; model: string; apiKey: string | null; authScheme: string }) {
    return this.http.put<{ provider: string; model: string; hasApiKey: boolean }>(`${this.base}/ai/personal-model`, value);
  }
  createAiScaffold(request: { tenantId: string; key: string; name: string; description: string; applicationType: 'Web' | 'Mobile'; proposal: AiApplicationProposal }) {
    return this.http.post<{ id: string; tenantId: string; key: string; name: string }>(`${this.base}/applications/ai-scaffold/create`, request);
  }
  renameApplicationPage(applicationId: string, screenId: string, tenantId: string, title: string) {
    return this.http.patch<{ id: string; title: string }>(`${this.base}/applications/${applicationId}/screens/${screenId}/title`, { tenantId, title });
  }
  draftPreview(tenantId: string, applicationId: string): Observable<PublishedApplication> {
    return this.http.get<PublishedApplication>(`${this.base}/applications/${applicationId}/draft-preview`, { params: { tenantId } });
  }
  recordCapabilities(tenantId: string, objectId: string) { return this.http.get<{read: boolean; create: boolean; update: boolean; delete: boolean}>(`${this.base}/objects/${objectId}/record-capabilities`, { params: { tenantId } }); }
  queryCrudRecords(tenantId: string, objectId: string, page: number) { return this.http.post<{items: BuilderRecord[]; total: number}>(`${this.base}/records/query`, { tenantId, objectId, filters: [], sortField: null, page, pageSize: 25 }); }
  dataObjects(tenantId: string, applicationId: string) { return this.http.get<DesignerApplication>(`${this.base}/applications/${applicationId}/data-objects`, { params: {tenantId} }); }
  relationships(tenantId: string, applicationId: string) {
    return this.http.get<BuilderRelationship[]>(`${this.base}/relationships`, { params: { tenantId, applicationId } });
  }
  createRelationship(value: Omit<BuilderRelationship, 'id'>) {
    return this.http.post<BuilderRelationship>(`${this.base}/relationships`, value);
  }
  createDataObject(draft: SaveDesignerDraft) { return this.http.post<DesignerObject>(`${this.base}/applications/${draft.applicationId}/data-objects`, draft); }
  createApplicationModule(tenantId: string, applicationId: string, key: string, name: string) {
    return this.http.post<{ id: string; key: string; name: string }>(`${this.base}/application-modules`, { tenantId, applicationId, key, name });
  }
  generateCrud(tenantId: string, applicationId: string, objectId: string) { return this.http.post<{id: string; key: string; title: string}>(`${this.base}/applications/${applicationId}/generate-crud`, {tenantId, objectId}); }
  validateApplication(tenantId: string, applicationId: string) { return this.http.post<string[]>(`${this.base}/applications/${applicationId}/validate`, {tenantId, applicationId}); }
  publishApplication(tenantId: string, applicationId: string) {
    return this.http.post<{ id?: string; publishedVersion?: string; status?: string; promotedApplicationId?: string }>(
      `${this.base}/applications/${applicationId}/publish`, { tenantId, applicationId });
  }
  applicationVersions(tenantId: string, applicationId: string): Observable<BuilderApplicationVersion[]> {
    return this.http.get<BuilderApplicationVersion[]>(`${this.base}/applications/${applicationId}/versions`, { params: { tenantId } });
  }
  updateRecord(tenantId: string, record: BuilderRecord, data: unknown) { return this.http.put<BuilderRecord>(`${this.base}/records/${record.id}`, {tenantId, dataJson: JSON.stringify(data), version: record.version}); }
  deleteRecord(tenantId: string, id: string) { return this.http.delete<void>(`${this.base}/records/${id}`, {params: {tenantId}}); }
  queryWidgetRecords(tenantId: string, objectId: string): Observable<{ items: BuilderRecord[]; total: number }> {
    return this.http.post<{ items: BuilderRecord[]; total: number }>(`${this.base}/records/query`, {
      tenantId, objectId, filters: [], sortField: null, descending: false, page: 1, pageSize: 50
    });
  }
  queryLookupRecords(tenantId: string, objectId: string, displayField: string, search: string, page: number, pageSize = 10) {
    return this.http.post<{ items: BuilderRecord[]; total: number; page: number; pageSize: number }>(`${this.base}/records/query`, {
      tenantId, objectId, filters: search.trim() ? [{ field: displayField, operator: 'contains', value: search.trim() }] : [],
      sortField: null, descending: false, page, pageSize
    });
  }

  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = this.resolveBase();

  private resolveBase(): string {
    const root = getGatewayApiBaseUrl();
    return root.endsWith('/builder') ? root : `${root}/builder`;
  }

  applications(includeAllTenants = false): Observable<BuilderApplication[]> {
    const tenantId = this.auth.tenantId() ?? '';
    const params = includeAllTenants ? undefined : new HttpParams().set('tenantId', tenantId);
    return this.http.get<BuilderApplication[]>(`${this.base}/applications`, params ? { params } : {});
  }

  templateUpdates(applicationId: string) {
    return this.http.get<TemplateUpdateReview>(`${this.base}/applications/${applicationId}/template-updates`);
  }

  applyTemplateUpdate(applicationId: string, tenantId: string, releaseId: string) {
    return this.http.post<TemplateUpdateApplyResult>(`${this.base}/applications/${applicationId}/template-updates/apply`, { tenantId, releaseId });
  }

  createPublishedApplicationDraft(applicationId: string) {
    return this.http.post<{ id: string; tenantId: string; key: string; name: string; existingDraft: boolean }>(
      `${this.base}/applications/${applicationId}/drafts`, {});
  }

  requestApplicationDeletion(applicationId: string, tenantId: string, details: string) {
    return this.http.post<{ id: string }>(`${this.base}/applications/${applicationId}/deletion-requests`, { tenantId, details });
  }

  setApplicationOperationalState(applicationId: string, tenantId: string, isActive: boolean) {
    return this.http.post<{ id: string; operationalState: string }>(
      `${this.base}/applications/${applicationId}/operational-state`, { tenantId, isActive });
  }

  pendingApplicationDeletions(tenantId?: string) {
    let params = new HttpParams();
    if (tenantId) params = params.set('tenantId', tenantId);
    return this.http.get<Array<{ id: string; tenantId: string; applicationId: string; applicationName: string; requestedByUserId: string; reason: string; createdAt: string }>>(`${this.base}/application-deletion-requests`, { params });
  }

  reviewApplicationDeletion(requestId: string, approve: boolean, reason?: string) {
    return this.http.post(`${this.base}/application-deletion-requests/${requestId}/review`, { approve, reason });
  }

  createApplication(request: CreateBuilderApplicationRequest): Observable<BuilderApplication> {
    return this.http.post<BuilderApplication>(`${this.base}/applications`, request);
  }

  templates(): Observable<BuilderTemplate[]> {
    return this.http.get<BuilderTemplate[]>(`${this.base}/templates`);
  }

  createTemplate(request: Omit<BuilderTemplate, 'id'>): Observable<BuilderTemplate> {
    return this.http.post<BuilderTemplate>(`${this.base}/templates`, request);
  }

  updateTemplate(id: string, request: Omit<BuilderTemplate, 'id'>): Observable<BuilderTemplate> {
    return this.http.put<BuilderTemplate>(`${this.base}/templates/${id}`, request);
  }

  deleteTemplate(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/templates/${id}`);
  }

  applicationMenu(tenantId: string, applicationId: string): Observable<BuilderMenuItem[]> {
    return this.http.get<BuilderMenuItem[]>(`${this.base}/application-menu`, {
      params: new HttpParams().set('tenantId', tenantId).set('applicationId', applicationId)
    });
  }
  systemDashboardSummary(): Observable<SystemDashboardSummary> {
    return this.http.get<SystemDashboardSummary>(`${this.base}/system/dashboard/summary`);
  }
  tenantBuilderUsers() { return this.http.get<TenantBuilderUser[]>(`${this.base}/application-users/users`); }
  builderWorkspaceUsers() { return this.http.get<BuilderWorkspaceUser[]>(`${this.base}/tenant-access/builder-workspace/users`); }
  setBuilderWorkspaceAccess(userId: string, role: BuilderWorkspaceUser['role']) {
    return this.http.put<void | { userId: string; role: string | null }>(`${this.base}/tenant-access/builder-workspace/users/${userId}`, { role });
  }
  loginBuilderWorkspace(email: string, password: string) {
    return this.http.post<import('@core/services/auth/auth.service').LoginResponse>(`${this.base}/builder-workspace/login`, { email, password });
  }
  createTenantBuilderUser(value: { email: string; displayName: string; password: string }) {
    return this.http.post<TenantBuilderUser>(`${this.base}/application-users/users`, value);
  }
  publishedUserApplications() { return this.http.get<BuilderUserApplication[]>(`${this.base}/application-users/applications`); }
  applicationMembers(applicationId: string) {
    return this.http.get<BuilderApplicationMember[]>(`${this.base}/application-users/applications/${applicationId}/members`);
  }
  assignApplicationMember(applicationId: string, userId: string, role: string) {
    return this.http.post<BuilderApplicationMember>(`${this.base}/application-users/applications/${applicationId}/members`, { userId, role });
  }
  removeApplicationMember(applicationId: string, userId: string) {
    return this.http.delete<void>(`${this.base}/application-users/applications/${applicationId}/members/${userId}`);
  }
  updateTenantBuilderUser(userId: string, value: { displayName: string; isActive: boolean }) { return this.http.put<TenantBuilderUser>(`${this.base}/tenant-access/users/${userId}`, value); }
  deleteTenantBuilderUser(userId: string) { return this.http.delete<void>(`${this.base}/tenant-access/users/${userId}`); }
  accessGroups() { return this.http.get<AccessGroup[]>(`${this.base}/tenant-access/groups`); }
  saveAccessGroup(value: { key: string; name: string; description: string | null; isActive: boolean }, id?: string) { return id ? this.http.put<AccessGroup>(`${this.base}/tenant-access/groups/${id}`, value) : this.http.post<AccessGroup>(`${this.base}/tenant-access/groups`, value); }
  deleteAccessGroup(id: string) { return this.http.delete<void>(`${this.base}/tenant-access/groups/${id}`); }
  groupMembers(id: string) { return this.http.get<AccessGroupMember[]>(`${this.base}/tenant-access/groups/${id}/members`); }
  setGroupMember(groupId: string, userId: string, isActive = true) { return this.http.put(`${this.base}/tenant-access/groups/${groupId}/members/${userId}`, { isActive }); }
  removeGroupMember(groupId: string, userId: string) { return this.http.delete<void>(`${this.base}/tenant-access/groups/${groupId}/members/${userId}`); }
  accessRoles() { return this.http.get<AccessRole[]>(`${this.base}/tenant-access/roles`); }
  saveAccessRole(value: { key: string; name: string; description: string | null; isActive: boolean }, id?: string) { return id ? this.http.put<AccessRole>(`${this.base}/tenant-access/roles/${id}`, value) : this.http.post<AccessRole>(`${this.base}/tenant-access/roles`, value); }
  deleteAccessRole(id: string) { return this.http.delete<void>(`${this.base}/tenant-access/roles/${id}`); }
  applicationGroupRoles(applicationId: string) { return this.http.get<AccessGroupRole[]>(`${this.base}/tenant-access/applications/${applicationId}/group-roles`); }
  setApplicationGroupRole(applicationId: string, groupId: string, roleId: string, isActive = true) { return this.http.put(`${this.base}/tenant-access/applications/${applicationId}/groups/${groupId}/roles/${roleId}`, { isActive }); }
  removeApplicationGroupRole(applicationId: string, groupId: string, roleId: string) { return this.http.delete<void>(`${this.base}/tenant-access/applications/${applicationId}/groups/${groupId}/roles/${roleId}`); }
  accessPermissions(applicationId: string) { return this.http.get<AccessPermission[]>(`${this.base}/tenant-access/applications/${applicationId}/permissions`); }
  saveAccessPermission(applicationId: string, value: Omit<AccessPermission, 'id' | 'applicationId'>, id?: string) { return id ? this.http.put<AccessPermission>(`${this.base}/tenant-access/permissions/${id}`, value) : this.http.post<AccessPermission>(`${this.base}/tenant-access/applications/${applicationId}/permissions`, value); }
  deleteAccessPermission(id: string) { return this.http.delete<void>(`${this.base}/tenant-access/permissions/${id}`); }
  accessGrants(applicationId: string) { return this.http.get<AccessGrant[]>(`${this.base}/tenant-access/applications/${applicationId}/permission-grants`); }
  createAccessGrant(applicationId: string, value: Pick<AccessGrant, 'permissionId' | 'subjectType' | 'subjectId'>) { return this.http.post<AccessGrant>(`${this.base}/tenant-access/applications/${applicationId}/permission-grants`, value); }
  deleteAccessGrant(id: string) { return this.http.delete<void>(`${this.base}/tenant-access/permission-grants/${id}`); }
  publishedApplication(tenantId: string, applicationId: string): Observable<PublishedApplication> {
    return this.http.get<PublishedApplication>(`${this.base}/applications/${applicationId}/published`, { params: { tenantId } });
  }

  loginPublishedApplicationUser(tenantId: string, applicationId: string, email: string, password: string) {
    return this.http.post<PublishedAppLoginResponse>(`${this.base}/application-users/login`, { tenantId, applicationId, email, password });
  }
  changePublishedApplicationPassword(currentPassword: string, newPassword: string, confirmPassword: string) {
    return this.http.post<void>(`${this.base}/application-users/change-password`, { currentPassword, newPassword, confirmPassword });
  }

  generatePublishedUi(applicationId: string, prompt: string) {
    return this.http.post<PublishedUiResult>(`${this.base}/published-runtime/assistant`, { applicationId, prompt });
  }
  userFavouriteLinks(applicationId: string) {
    return this.http.get<UserFavouriteLink[]>(`${this.base}/published-runtime/favourites`, { params: { applicationId } });
  }
  saveUserFavourite(applicationId: string, name: string, specification: PublishedUiSpecification, id?: string) {
    const value = { applicationId, name, specification };
    return id
      ? this.http.put<{ id: string; name: string; publishedVersion: string }>(`${this.base}/published-runtime/favourites/${id}`, value)
      : this.http.post<{ id: string; name: string; publishedVersion: string }>(`${this.base}/published-runtime/favourites`, value);
  }
  openUserFavourite(applicationId: string, id: string) {
    return this.http.get<PublishedUiResult>(`${this.base}/published-runtime/favourites/${id}`, { params: { applicationId } });
  }
  deleteUserFavourite(applicationId: string, id: string) {
    return this.http.delete<void>(`${this.base}/published-runtime/favourites/${id}`, { params: { applicationId } });
  }

  createMenuItem(item: Omit<BuilderMenuItem, 'id'>): Observable<BuilderMenuItem> {
    return this.http.post<BuilderMenuItem>(`${this.base}/application-menu`, item);
  }

  updateMenuItem(id: string, item: Omit<BuilderMenuItem, 'id' | 'applicationId' | 'route' | 'icon' | 'parentId' | 'moduleId'> & { route?: string | null; icon?: string | null; parentId?: string | null; moduleId?: string | null }): Observable<BuilderMenuItem> {
    return this.http.put<BuilderMenuItem>(`${this.base}/application-menu/${id}`, item);
  }

  deleteMenuItem(id: string, tenantId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/application-menu/${id}`, { params: new HttpParams().set('tenantId', tenantId) });
  }

  runtimeForm(tenantId: string, objectId: string): Observable<RuntimeFormDefinition> {
    return this.http.get<RuntimeFormDefinition>(`${this.base}/objects/${objectId}/form-definition`, {
      params: new HttpParams().set('tenantId', tenantId)
    });
  }

  applicationScreen(tenantId: string, applicationId: string, key: string): Observable<BuilderApplicationScreen> {
    return this.http.get<BuilderApplicationScreen>(`${this.base}/applications/${applicationId}/screens/${encodeURIComponent(key)}`, {
      params: new HttpParams().set('tenantId', tenantId)
    });
  }

  applicationScreens(tenantId: string, applicationId: string): Observable<BuilderDesignScreen[]> {
    return this.http.get<BuilderDesignScreen[]>(`${this.base}/applications/${applicationId}/screens`, {
      params: new HttpParams().set('tenantId', tenantId)
    });
  }

  applicationMenuItems(tenantId: string, applicationId: string): Observable<BuilderMenuItem[]> {
    return this.http.get<BuilderMenuItem[]>(`${this.base}/application-menu`, {
      params: new HttpParams().set('tenantId', tenantId).set('applicationId', applicationId)
    });
  }
  savePageDefinition(applicationId: string, pageId: string, tenantId: string, definitionJson: string): Observable<unknown> {
    return this.http.put(`${this.base}/applications/${applicationId}/pages/${pageId}/definition`, { tenantId, definitionJson });
  }

  createApplicationScreen(applicationId: string, request: SaveBuilderScreenRequest): Observable<BuilderDesignScreen> {
    return this.http.post<BuilderDesignScreen>(`${this.base}/applications/${applicationId}/screens`, request);
  }

  deleteApplicationScreen(applicationId: string, screenId: string, tenantId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/applications/${applicationId}/screens/${screenId}`, {
      params: new HttpParams().set('tenantId', tenantId)
    });
  }

  updateApplicationScreen(applicationId: string, key: string, request: SaveBuilderScreenRequest): Observable<BuilderDesignScreen> {
    return this.http.put<BuilderDesignScreen>(`${this.base}/applications/${applicationId}/screens/${encodeURIComponent(key)}`, request);
  }

  updateApplicationTheme(tenantId: string, applicationId: string, themeJson: string): Observable<{ themeJson: string }> {
    return this.http.put<{ themeJson: string }>(`${this.base}/applications/${applicationId}/theme`, { tenantId, themeJson });
  }

  records(tenantId: string, objectId: string): Observable<BuilderRecord[]> {
    return this.http.get<BuilderRecord[]>(`${this.base}/objects/${objectId}/records`, {
      params: new HttpParams().set('tenantId', tenantId)
    });
  }

  createRecord(tenantId: string, objectId: string, data: unknown): Observable<BuilderRecord> {
    return this.http.post<BuilderRecord>(`${this.base}/records`, { tenantId, objectId, dataJson: JSON.stringify(data) });
  }

  designerApplication(tenantId: string, applicationId: string): Observable<DesignerApplication> {
    return this.http.get<DesignerApplication>(`${this.base}/designer/applications/${applicationId}`, {
      params: new HttpParams().set('tenantId', tenantId)
    });
  }

  saveDesignerDraft(draft: SaveDesignerDraft): Observable<DesignerObject> {
    return this.http.put<DesignerObject>(`${this.base}/designer/draft`, draft);
  }

  uploadApplicationSolution(applicationId: string, tenantId: string, file: File): Observable<BuilderSolutionUpload> {
    const body = new FormData();
    body.append('file', file, file.name);
    return this.http.post<BuilderSolutionUpload>(`${this.base}/applications/${applicationId}/solutions?tenantId=${encodeURIComponent(tenantId)}`, body);
  }

  applicationSolutionDocuments(applicationId: string, tenantId: string): Observable<BuilderApplicationDocument[]> {
    return this.http.get<BuilderApplicationDocument[]>(`${this.base}/applications/${applicationId}/solutions`, { params: { tenantId } });
  }

  searchApplicationSolutions(applicationId: string, tenantId: string, query: string, limit = 5): Observable<BuilderSolutionSearchResult[]> {
    return this.http.post<BuilderSolutionSearchResult[]>(`${this.base}/applications/${applicationId}/solutions/search`, { tenantId, query, limit });
  }

  applicationSolutionFile(applicationId: string, tenantId: string, fileId: string): Observable<Blob> {
    return this.http.get(`${getGatewayApiBaseUrl()}/blob/applications/${applicationId}/documents/${fileId}`, {
      params: { tenantId }, responseType: 'blob'
    });
  }

}

export interface TemplateUpdateReview {
  hasTemplate: boolean;
  updateAvailable: boolean;
  currentVersion?: string | null;
  latestVersion?: string;
  releaseId?: string;
  changes: Array<{ kind: string; key: string; name: string; action: string }>;
  notes: string[];
  canApply?: boolean;
}

export interface TemplateUpdateApplyResult { id: string; applied: boolean; added: number; preserved: number; version: string; }

export interface BuilderApplicationScreen {
  id: string;
  key: string;
  title: string;
  htmlContent: string;
  objectId: string | null;
  formKey: string | null;
  applicationName: string;
  themeJson: string | null;
}

export interface BuilderDesignScreen {
  formId?: string | null;
  definitionJson?: string | null;
  id: string;
  key: string;
  title: string;
  htmlContent: string;
  objectId: string | null;
  formKey: string | null;
}

export interface SaveBuilderScreenRequest {
  tenantId: string;
  key: string;
  title: string;
  htmlContent: string;
}
