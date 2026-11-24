import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FDeleteSelectedEvent, FFlowModule, FMoveNodesEvent, FCreateConnectionEvent, FSelectionChangeEvent, provideFFlow, withA11y } from '@foblex/flow';
import { TranslocoModule, TranslocoService } from '@jsverse/transloco';
import { AuthService } from '@core/services/auth/auth.service';
import { BuilderApplication } from '@core/builders/interfaces/builder-application';
import { AiWorkflowProposal, BuilderWorkflow, BuildersApiService, WorkflowApprovalPolicy, WorkflowSimulationResult } from '@core/builders/builders-api.service';

type StepType = 'trigger' | 'condition' | 'approval' | 'email' | 'alert' | 'end';
type InspectorTab = 'settings' | 'test' | 'approvals' | 'connections';
type WorkflowListView = 'list' | 'editor';

interface ProcessStep {
  id: string;
  type: StepType;
  title: string;
  description: string;
  position: { x: number; y: number };
  settings: Record<string, string>;
}

interface ProcessConnection {
  id: string;
  source: string;
  target: string;
  label?: string;
}

interface ProcessTemplate {
  key: string;
  name: string;
  category: string;
  description: string;
  steps: ProcessStep[];
  connections: ProcessConnection[];
  purchaseApproval?: boolean;
}

interface PurchaseApprovalDraft {
  objectKey: string; statusField: string; requesterField: string;
  submittedStatus: string; pendingStatus: string; approvedStatus: string; rejectedStatus: string;
  routing: { employeeObjectKey: string; departmentObjectKey: string; absenceObjectKey: string; delegationObjectKey: string; requesterEmployeeField: string; managerField: string; approvalLimitField: string; portalUserIdField: string; departmentField: string; departmentHeadField: string };
}

const step = (id: string, type: StepType, title: string, x: number, y: number, description = '', settings: Record<string, string> = {}): ProcessStep => ({ id, type, title, description, position: { x, y }, settings });
const link = (id: string, source: string, target: string, label?: string): ProcessConnection => ({ id, source, target, label });

@Component({
  standalone: true,
  selector: 'ant-workflows',
  imports: [FormsModule, FFlowModule, RouterLink, TranslocoModule],
  providers: [provideFFlow(withA11y())],
  templateUrl: './workflows.component.html',
  styleUrl: './workflows.component.scss'
})
export class WorkflowsComponent implements OnInit {
  private readonly api = inject(BuildersApiService);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly transloco = inject(TranslocoService);

  readonly applications = signal<BuilderApplication[]>([]);
  readonly workflows = signal<BuilderWorkflow[]>([]);
  readonly selectedApplicationId = signal('');
  readonly applicationName = signal('');
  readonly selectedWorkflowId = signal('');
  readonly view = signal<WorkflowListView>('list');
  readonly searchText = signal('');
  readonly statusFilter = signal('all');
  readonly sortBy = signal('recent');
  readonly renamingWorkflowId = signal('');
  readonly renameValue = signal('');
  readonly rowMenuWorkflowId = signal('');
  readonly steps = signal<ProcessStep[]>([]);
  readonly connections = signal<ProcessConnection[]>([]);
  readonly selectedStepId = signal('');
  readonly selectedConnectionId = signal('');
  readonly activeTab = signal<InspectorTab>('settings');
  readonly inspectorCollapsed = signal(false);
  readonly showTemplates = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly testResult = signal<{ valid: boolean; issues: string[] } | null>(null);
  readonly simulationResult = signal<WorkflowSimulationResult | null>(null);
  readonly simulationBusy = signal(false);
  readonly purchaseApproval = signal<PurchaseApprovalDraft | null>(null);
  readonly aiPrompt = signal('');
  readonly aiProposal = signal<AiWorkflowProposal | null>(null);
  readonly aiGenerating = signal(false);
  readonly approvalPolicies = signal<WorkflowApprovalPolicy[]>([]);
  readonly approvalPolicyId = signal('');
  readonly approvalPolicyName = signal('');
  readonly selectedStep = computed(() => this.steps().find(item => item.id === this.selectedStepId()) ?? null);
  readonly selectedConnection = computed(() => this.connections().find(item => item.id === this.selectedConnectionId()) ?? null);
  readonly canvasWidth = computed(() => Math.max(0, ...this.steps().map(item => item.position.x + 520)));
  readonly canvasHeight = computed(() => Math.max(0, ...this.steps().map(item => item.position.y + 360)));
  readonly visibleWorkflows = computed(() => {
    const query = this.searchText().trim().toLocaleLowerCase();
    const status = this.statusFilter();
    const rows = this.workflows().filter(workflow =>
      (!query || workflow.name.toLocaleLowerCase().includes(query) || workflow.key.toLocaleLowerCase().includes(query)) &&
      (status === 'all' || this.workflowStatus(workflow) === status)
    );
    return rows.sort((left, right) => {
      if (this.sortBy() === 'name') return left.name.localeCompare(right.name);
      if (this.sortBy() === 'oldest') return Date.parse(left.updatedAt) - Date.parse(right.updatedAt);
      return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
    });
  });
  readonly isDraft = computed(() => !this.selectedWorkflowId() || this.workflows().find(item => item.id === this.selectedWorkflowId())?.status === 'Draft');
  readonly tenantId = this.auth.tenantId() ?? '';
  readonly designerApplicationId = this.route.snapshot.paramMap.get('id') ?? '';

  name = '';
  key = '';
  isNew = false;
  simulationRecordJson = '{}';
  simulationOutcomesJson = '{}';

  readonly stepTools: Array<{ type: StepType; label: string; icon: string }> = [
    { type: 'trigger', label: 'Trigger', icon: '↯' },
    { type: 'condition', label: 'Condition', icon: '⑂' },
    { type: 'approval', label: 'Approval', icon: '♙' },
    { type: 'email', label: 'Email', icon: '✉' },
    { type: 'alert', label: 'Alert', icon: '♢' },
    { type: 'end', label: 'End', icon: '⚑' }
  ];

  readonly templates: ProcessTemplate[] = [
    {
      key: 'leave-request', name: 'Leave Request', category: 'HR', description: 'Route employee leave requests through manager and HR review.',
      steps: [step('trigger', 'trigger', 'Leave request submitted', 60, 220, 'When an employee submits a request'), step('manager', 'approval', 'Manager approval', 340, 220, 'Review dates and coverage', { assignedTo: 'Manager', dueHours: '48' }), step('hr', 'approval', 'HR review', 620, 220, 'Confirm policy and available leave', { assignedTo: 'HR', dueHours: '24' }), step('notify', 'alert', 'Notify employee', 900, 220, 'Send the final decision'), step('end', 'end', 'Request complete', 1180, 220)],
      connections: [link('c1', 'trigger-out', 'manager-in'), link('c2', 'manager-approved', 'hr-in', 'approved'), link('c3', 'hr-approved', 'notify-in', 'approved'), link('c4', 'notify-out', 'end-in')]
    },
    {
      key: 'expense-claim', name: 'Expense Claim', category: 'Finance', description: 'Check receipts, approve the claim, and escalate high-value expenses.',
      steps: [step('trigger', 'trigger', 'Expense submitted', 60, 230), step('manager', 'approval', 'Manager review', 340, 230, 'Check business purpose and receipts', { assignedTo: 'Manager', dueHours: '48' }), step('limit', 'condition', 'Over approval limit?', 620, 230, 'Amount > 50000', { field: 'Amount', operator: '>', value: '50000' }), step('finance', 'approval', 'Finance approval', 900, 110, 'Review high-value claim', { assignedTo: 'Finance', dueHours: '24' }), step('approved', 'end', 'Ready for reimbursement', 1180, 110), step('standard', 'end', 'Standard reimbursement', 900, 350)],
      connections: [link('c1', 'trigger-out', 'manager-in'), link('c2', 'manager-approved', 'limit-in', 'approved'), link('c3', 'limit-yes', 'finance-in', 'yes'), link('c4', 'limit-no', 'standard-in', 'no'), link('c5', 'finance-approved', 'approved-in', 'approved')]
    },
    {
      key: 'purchase-request-approval', name: 'Purchase Request', category: 'Procurement', description: 'Start the purchase approval runtime with manager and spending-limit review.', purchaseApproval: true,
      steps: [step('trigger', 'trigger', 'Purchase request submitted', 60, 230), step('manager', 'approval', 'Manager approval', 340, 230, 'Review request and budget', { assignedTo: 'Department Manager', dueHours: '48' }), step('limit', 'condition', 'Requires executive sign-off?', 620, 230, 'Amount > approval limit', { field: 'Amount', operator: '>', value: '50000' }), step('executive', 'approval', 'Executive approval', 900, 100, 'Review requests above the limit', { assignedTo: 'Finance Manager', dueHours: '24' }), step('approved', 'end', 'Approved', 1180, 100), step('standard', 'end', 'Approved under limit', 900, 360)],
      connections: [link('c1', 'trigger-out', 'manager-in'), link('c2', 'manager-approved', 'limit-in', 'approved'), link('c3', 'limit-yes', 'executive-in', 'yes'), link('c4', 'limit-no', 'standard-in', 'no'), link('c5', 'executive-approved', 'approved-in', 'approved')]
    },
    {
      key: 'employee-onboarding', name: 'Employee Onboarding', category: 'HR', description: 'Coordinate manager, IT, and HR tasks for a new employee.',
      steps: [step('trigger', 'trigger', 'New employee added', 60, 230), step('manager', 'approval', 'Manager confirms details', 340, 230, '', { assignedTo: 'Manager' }), step('accounts', 'email', 'Create accounts', 620, 230, 'Prepare system access'), step('equipment', 'approval', 'Prepare equipment', 900, 230, '', { assignedTo: 'IT' }), step('orientation', 'email', 'Schedule orientation', 1180, 230), step('hr', 'approval', 'HR confirmation', 1460, 230, '', { assignedTo: 'HR' }), step('end', 'end', 'Onboarding complete', 1740, 230)],
      connections: [link('c1', 'trigger-out', 'manager-in'), link('c2', 'manager-approved', 'accounts-in'), link('c3', 'accounts-out', 'equipment-in'), link('c4', 'equipment-approved', 'orientation-in'), link('c5', 'orientation-out', 'hr-in'), link('c6', 'hr-approved', 'end-in')]
    },
    {
      key: 'invoice-approval', name: 'Invoice Approval', category: 'Finance', description: 'Verify invoice documents and route high-value invoices for executive approval.',
      steps: [step('trigger', 'trigger', 'Invoice received', 60, 230), step('verify', 'approval', 'Verify documents', 340, 230, '', { assignedTo: 'Accounts Payable' }), step('budget', 'approval', 'Budget owner review', 620, 230, '', { assignedTo: 'Budget Owner' }), step('limit', 'condition', 'Over approval limit?', 900, 230, '', { field: 'Amount', operator: '>', value: '25000' }), step('cfo', 'approval', 'CFO approval', 1180, 100, '', { assignedTo: 'CFO' }), step('paid', 'end', 'Approved for payment', 1460, 100), step('regular', 'end', 'Approved', 1180, 360)],
      connections: [link('c1', 'trigger-out', 'verify-in'), link('c2', 'verify-approved', 'budget-in'), link('c3', 'budget-approved', 'limit-in'), link('c4', 'limit-yes', 'cfo-in', 'yes'), link('c5', 'limit-no', 'regular-in', 'no'), link('c6', 'cfo-approved', 'paid-in', 'approved')]
    }
  ];

  t(key: string, params?: Record<string, unknown>): string { return this.transloco.translate(`workflows.${key}`, params); }
  templateName(key: string): string { return this.t(`templates.${key}.name`); }
  templateDescription(key: string): string { return this.t(`templates.${key}.description`); }
  templateStepTitle(templateKey: string, stepId: string): string { return this.t(`templates.${templateKey}.steps.${stepId}`); }

  ngOnInit(): void {
    if (!this.tenantId) { this.error.set(this.t('errors.tenant')); return; }
    if (!this.designerApplicationId) { this.error.set(this.t('errors.applicationContext')); return; }
    this.selectedApplicationId.set(this.designerApplicationId);
    this.loading.set(true);
    this.api.applications().subscribe({
      next: apps => {
        this.applications.set(apps);
        const current = apps.find(app => app.id === this.designerApplicationId);
        if (current) this.applicationName.set(current.name);
        this.loadApprovalPolicies();
        this.loadWorkflows();
      },
      error: () => { this.loading.set(false); this.error.set(this.t('errors.applicationsLoad')); }
    });
  }

  loadApprovalPolicies(): void {
    this.api.workflowApprovalPolicies(this.selectedApplicationId(), this.tenantId).subscribe({
      next: policies => this.approvalPolicies.set(policies),
      error: () => this.approvalPolicies.set([])
    });
  }

  applyApprovalPolicy(): void {
    const selected = this.selectedStep();
    const policy = this.approvalPolicies().find(item => item.id === this.approvalPolicyId());
    if (!selected || selected.type !== 'approval' || !policy || !this.isDraft()) return;
    this.updateSelectedStep(item => ({ ...item, settings: {
      ...item.settings,
      approvalLevels: JSON.stringify(policy.steps),
      assignedTo: policy.steps[0]?.assignedTo ?? '',
      dueHours: String(policy.steps[0]?.dueHours ?? ''),
      approvalMode: policy.steps[0]?.mode ?? 'all'
    } }));
    this.message.set(this.t('messages.approvalPolicyApplied', { name: policy.name }));
  }

  saveApprovalPolicy(): void {
    const selected = this.selectedStep();
    const name = this.approvalPolicyName().trim();
    if (!selected || selected.type !== 'approval' || !name || !this.isDraft()) return;
    const levels = this.currentApprovalLevels(selected);
    const key = this.uniqueKey(name);
    this.api.saveWorkflowApprovalPolicy(this.selectedApplicationId(), this.tenantId, { key, name, steps: levels }).subscribe({
      next: policy => {
        this.approvalPolicies.update(items => [policy, ...items.filter(item => item.id !== policy.id)]);
        this.approvalPolicyId.set(policy.id); this.approvalPolicyName.set('');
        this.message.set(this.t('messages.approvalPolicySaved', { name: policy.name }));
      },
      error: response => this.error.set(response.error?.error ?? response.error?.detail ?? this.t('errors.save'))
    });
  }

  private currentApprovalLevels(selected: ProcessStep): WorkflowApprovalPolicy['steps'] {
    try {
      const saved = JSON.parse(selected.settings['approvalLevels'] || '[]') as WorkflowApprovalPolicy['steps'];
      if (Array.isArray(saved) && saved.length) return saved.map(level => ({ ...level, mode: level.mode ?? (selected.settings['approvalMode'] as 'all' | 'any') ?? 'all' }));
    } catch { /* use the single-level editor values below */ }
    return [{ name: selected.title, assignedTo: selected.settings['assignedTo'] || '',
      dueHours: Number(selected.settings['dueHours']) || null, mode: (selected.settings['approvalMode'] as 'all' | 'any') || 'all' }];
  }

  approvalLevelCount(selected: ProcessStep): number { return this.currentApprovalLevels(selected).length; }
  requesterSeparationEnabled(selected: ProcessStep): boolean {
    return this.currentApprovalLevels(selected).every(level => level.preventRequesterApproval !== false);
  }
  setRequesterSeparation(enabled: boolean): void {
    const selected = this.selectedStep();
    if (!selected || selected.type !== 'approval' || !this.isDraft()) return;
    const levels = this.currentApprovalLevels(selected).map(level => ({ ...level, preventRequesterApproval: enabled }));
    this.updateStepSetting('approvalLevels', JSON.stringify(levels));
  }

  loadWorkflows(): void {
    const applicationId = this.selectedApplicationId();
    if (!applicationId) return;
    this.loading.set(true); this.error.set('');
    this.api.workflows(this.tenantId, applicationId).subscribe({
      next: items => {
        this.workflows.set(items); this.loading.set(false); this.view.set('list');
        const routeWorkflow = this.route.snapshot.queryParamMap.get('workflowId');
        const selected = items.find(item => item.id === routeWorkflow);
        if (selected) this.selectWorkflow(selected);
      },
      error: () => { this.loading.set(false); this.error.set(this.t('errors.workflowsLoad')); }
    });
  }

  selectWorkflow(workflow: BuilderWorkflow): void {
    this.showTemplates.set(false);
    this.view.set('editor');
    this.selectedWorkflowId.set(workflow.id); this.isNew = false; this.name = workflow.name; this.key = workflow.key;
    try {
      const definition = JSON.parse(workflow.definitionJson) as { nodes?: ProcessStep[]; connections?: ProcessConnection[]; tasks?: Array<string | { name?: string; assignedTo?: string }>; purchaseApproval?: Partial<PurchaseApprovalDraft> };
      if (definition.nodes?.length) {
        this.steps.set(definition.nodes.map(node => ({ ...node, position: { ...node.position }, settings: { ...node.settings } })));
        this.connections.set((definition.connections ?? []).map(connection => ({ ...connection })));
      } else {
        const legacyTasks = definition.tasks ?? [];
        const legacy = [step('legacy-trigger', 'trigger', 'Process started', 60, 220)];
        legacy.push(...legacyTasks.map((task, index) => step(`legacy-${index}`, 'approval', typeof task === 'string' ? task : task.name ?? 'Approval', 340 + index * 280, 220, '', typeof task === 'string' ? {} : { assignedTo: task.assignedTo ?? '' })));
        legacy.push(step(`legacy-${legacy.length}`, 'end', 'Process complete', 340 + legacyTasks.length * 280, 220));
        this.steps.set(legacy);
        this.connections.set(legacy.slice(0, -1).map((node, index) => link(`legacy-connection-${index}`, this.outputId(node), `${legacy[index + 1].id}-in`)));
      }
      this.purchaseApproval.set(definition.purchaseApproval ? this.normalizeApproval(definition.purchaseApproval) : null);
    } catch { this.clearCanvas(); }
    this.activeTab.set('settings'); this.selectedStepId.set(''); this.selectedConnectionId.set(''); this.error.set(''); this.message.set('');
    this.testResult.set(null);
  }

  createNewWorkflow(): void {
    if (!this.selectedApplicationId()) return;
    this.isNew = true; this.selectedWorkflowId.set(''); this.name = this.t('newProcess'); this.key = this.uniqueKey('new-process');
    this.view.set('editor');
    this.purchaseApproval.set(null); this.showTemplates.set(false);
    this.steps.set([step('trigger', 'trigger', this.t('defaultSteps.trigger'), 80, 220), step('approval', 'approval', this.t('defaultSteps.approval'), 400, 220, '', { assignedTo: this.t('managerRole') }), step('end', 'end', this.t('defaultSteps.end'), 720, 220)]);
    this.connections.set([link('connection-1', 'trigger-out', 'approval-in'), link('connection-2', 'approval-approved', 'end-in', this.t('approved'))]);
    this.selectedStepId.set('approval'); this.selectedConnectionId.set(''); this.message.set(''); this.error.set('');
    this.testResult.set(null);
  }

  generateWorkflowProposal(): void {
    const prompt = this.aiPrompt().trim();
    if (!prompt || this.aiGenerating()) return;
    this.aiGenerating.set(true); this.aiProposal.set(null); this.error.set('');
    this.api.proposeWorkflow(this.selectedApplicationId(), this.tenantId, prompt).subscribe({
      next: proposal => { this.aiProposal.set(proposal); this.aiGenerating.set(false); },
      error: response => { this.aiGenerating.set(false); this.error.set(response.error?.error ?? response.error?.detail ?? this.t('errors.save')); }
    });
  }

  acceptAiWorkflowProposal(): void {
    const proposal = this.aiProposal();
    if (!proposal || this.saving()) return;
    this.saving.set(true); this.error.set('');
    this.api.acceptWorkflowProposal(this.selectedApplicationId(), this.tenantId, proposal).subscribe({
      next: workflow => {
        this.saving.set(false); this.aiProposal.set(null); this.aiPrompt.set('');
        this.workflows.update(items => [workflow, ...items.filter(item => item.id !== workflow.id)]);
        this.selectWorkflow(workflow); this.message.set(this.t('messages.aiDraftCreated'));
      },
      error: response => { this.saving.set(false); this.error.set(response.error?.error ?? response.error?.detail ?? this.t('errors.save')); }
    });
  }

  useTemplate(template: ProcessTemplate): void {
    this.isNew = true; this.selectedWorkflowId.set(''); this.name = this.templateName(template.key); this.key = this.uniqueKey(template.key);
    this.view.set('editor');
    this.steps.set(template.steps.map(item => ({ ...item, title: this.templateStepTitle(template.key, item.id), position: { ...item.position }, settings: { ...item.settings } })));
    this.connections.set(template.connections.map(item => ({ ...item })));
    this.purchaseApproval.set(template.purchaseApproval ? this.normalizeApproval({}) : null);
    this.selectedStepId.set('trigger'); this.selectedConnectionId.set(''); this.activeTab.set('settings');
    this.showTemplates.set(false); this.error.set(''); this.message.set(this.t('messages.templateLoaded')); this.testResult.set(null);
  }

  addStep(type: StepType): void {
    if (!this.isDraft()) return;
    const selected = this.selectedStep();
    const anchor = selected ?? [...this.steps()].sort((a, b) => a.position.x - b.position.x).at(-1) ?? null;
    const id = `${type}-${crypto.randomUUID().slice(0, 8)}`;
    const position = anchor ? { x: anchor.position.x + 280, y: anchor.position.y } : { x: 80, y: 220 };
    const title = this.t(`defaultSteps.${type}`);
    const created = step(id, type, title, position.x, position.y, '', type === 'approval' ? { assignedTo: this.t('managerRole'), dueHours: '48' } : {});
    this.steps.update(items => [...items, created]);
    if (anchor && this.outputId(anchor) && type !== 'trigger') this.connect(this.outputId(anchor), `${id}-in`);
    this.selectedStepId.set(id); this.selectedConnectionId.set(''); this.activeTab.set('settings'); this.testResult.set(null);
  }

  onCreateConnection(event: FCreateConnectionEvent): void {
    if (!event.targetId || event.sourceId === event.targetId) return;
    this.connect(event.sourceId, event.targetId);
  }

  onMoveNodes(event: FMoveNodesEvent): void {
    const moved = new Map(event.nodes.map(item => [item.id, item.position]));
    this.steps.update(items => items.map(item => moved.has(item.id) ? { ...item, position: { ...moved.get(item.id)! } } : item));
  }

  onSelectionChange(event: FSelectionChangeEvent): void {
    if (event.nodeIds.length) { this.selectedStepId.set(event.nodeIds.at(-1)!); this.selectedConnectionId.set(''); }
    else if (event.connectionIds.length) { this.selectedStepId.set(''); this.selectedConnectionId.set(event.connectionIds.at(-1)!); this.activeTab.set('connections'); }
  }

  onNodePositionChange(id: string, position: { x: number; y: number }): void {
    this.steps.update(items => items.map(item => item.id === id ? { ...item, position: { ...position } } : item));
  }

  selectStep(id: string): void { this.selectedStepId.set(id); this.selectedConnectionId.set(''); this.activeTab.set('settings'); }
  selectConnection(id: string): void { this.selectedConnectionId.set(id); this.selectedStepId.set(''); this.activeTab.set('connections'); }
  approvalSteps(): ProcessStep[] { return this.steps().filter(item => item.type === 'approval'); }
  connectionLabel(connection: ProcessConnection): string {
    const source = this.steps().find(item => connection.source.startsWith(`${item.id}-`));
    const target = this.steps().find(item => connection.target.startsWith(`${item.id}-`));
    return `${source?.title ?? 'Step'} → ${target?.title ?? 'Step'}`;
  }

  deleteSelection(event: FDeleteSelectedEvent): void {
    if (!this.isDraft()) return;
    this.removeGraphItems(event.nodeIds, event.connectionIds);
  }

  deleteStep(id: string): void {
    if (!this.isDraft()) return;
    this.removeGraphItems([id], []);
  }

  private removeGraphItems(nodeIds: string[], connectionIds: string[]): void {
    const deletedNodes = new Set(nodeIds);
    const deletedConnections = new Set(connectionIds);
    this.steps.update(items => items.filter(item => !deletedNodes.has(item.id)));
    this.connections.update(items => items.filter(item => !deletedConnections.has(item.id) && ![...deletedNodes].some(id => item.source.startsWith(`${id}-`) || item.target.startsWith(`${id}-`))));
    this.selectedStepId.set(''); this.selectedConnectionId.set(''); this.testResult.set(null);
  }

  updateStepTitle(value: string): void { this.updateSelectedStep(item => ({ ...item, title: value })); }
  updateStepDescription(value: string): void { this.updateSelectedStep(item => ({ ...item, description: value })); }
  updateStepSetting(key: string, value: string): void {
    this.updateSelectedStep(item => {
      const settings = { ...item.settings, [key]: value };
      if (item.type === 'approval' && ['assignedTo', 'dueHours', 'approvalMode'].includes(key) && settings['approvalLevels']) {
        try {
          const levels = JSON.parse(settings['approvalLevels']) as WorkflowApprovalPolicy['steps'];
          if (levels.length) {
            levels[0] = { ...levels[0], ...(key === 'assignedTo' ? { assignedTo: value } : key === 'dueHours' ? { dueHours: Number(value) || null } : { mode: value as 'all' | 'any' }) };
            settings['approvalLevels'] = JSON.stringify(levels);
          }
        } catch { /* keep the field value; publish validation reports malformed policy JSON */ }
      }
      return { ...item, settings };
    });
  }

  updateConnectionLabel(id: string, label: string): void { this.connections.update(items => items.map(item => item.id === id ? { ...item, label } : item)); }
  removeConnection(id: string): void { this.connections.update(items => items.filter(item => item.id !== id)); this.selectedConnectionId.set(''); this.testResult.set(null); }

  save(): void {
    const name = this.name.trim();
    const allSteps = this.steps();
    if (!this.selectedApplicationId() || !name || !this.key.trim()) { this.error.set(this.t('errors.requiredNameKey')); return; }
    if (!allSteps.some(item => item.type === 'trigger') || !allSteps.some(item => item.type === 'end')) { this.error.set(this.t('errors.triggerAndEnd')); return; }
    if (this.connections().length === 0) { this.error.set(this.t('errors.connectSteps')); return; }
    if (this.saving()) return;
    this.saving.set(true); this.error.set(''); this.message.set('');
    const approvalSteps = allSteps.filter(item => item.type === 'approval').sort((a, b) => a.position.x - b.position.x);
    const tasks = approvalSteps.map((item, index) => ({
      name: item.title.trim(), assignedTo: item.settings['assignedTo']?.trim() || 'Workflow participant',
      ...(index ? { dependsOn: approvalSteps[index - 1].title.trim() } : {}),
      ...(Number(item.settings['dueHours']) > 0 ? { dueHours: Number(item.settings['dueHours']) } : {})
    }));
    const definitionJson = JSON.stringify({ nodes: allSteps, connections: this.connections(), tasks, ...(this.purchaseApproval() ? { purchaseApproval: this.purchaseApproval() } : {}) });
    const request = this.isNew
      ? this.api.createWorkflow({ tenantId: this.tenantId, applicationId: this.selectedApplicationId(), key: this.key.trim(), name, definitionJson })
      : this.api.updateWorkflow(this.selectedWorkflowId(), { tenantId: this.tenantId, name, definitionJson });
    request.subscribe({
      next: saved => {
        this.saving.set(false); this.isNew = false;
        this.workflows.update(items => [saved, ...items.filter(item => item.id !== saved.id)]);
        this.selectWorkflow(saved); this.message.set(this.t('messages.savedDraft'));
      },
      error: response => { this.saving.set(false); this.error.set(response.error?.detail ?? response.error ?? this.t('errors.save')); }
    });
  }

  backToWorkflowList(): void {
    this.showTemplates.set(false); this.view.set('list'); this.rowMenuWorkflowId.set('');
    this.error.set(''); this.message.set('');
    this.loadWorkflows();
  }

  workflowStatus(workflow: BuilderWorkflow): 'active' | 'draft' | 'deactivated' {
    const status = workflow.status.toLocaleLowerCase();
    return status === 'published' ? 'active' : status === 'archived' ? 'deactivated' : 'draft';
  }

  workflowStepCount(workflow: BuilderWorkflow): number {
    try {
      const definition = JSON.parse(workflow.definitionJson) as { nodes?: unknown[]; tasks?: unknown[] };
      return definition.nodes?.length ?? definition.tasks?.length ?? 0;
    } catch { return 0; }
  }

  updatedLabel(value: string): string {
    const updated = Date.parse(value);
    if (!Number.isFinite(updated)) return '—';
    const minutes = Math.max(0, Math.floor((Date.now() - updated) / 60_000));
    if (minutes < 1) return this.t('time.justNow');
    if (minutes < 60) return this.t(minutes === 1 ? 'time.minuteAgo' : 'time.minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return this.t(hours === 1 ? 'time.hourAgo' : 'time.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < 30) return this.t(days === 1 ? 'time.dayAgo' : 'time.daysAgo', { count: days });
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(updated);
  }

  toggleRowMenu(workflowId: string): void {
    this.rowMenuWorkflowId.update(current => current === workflowId ? '' : workflowId);
  }

  beginRename(workflow: BuilderWorkflow): void {
    if (workflow.status !== 'Draft') return;
    this.renamingWorkflowId.set(workflow.id); this.renameValue.set(workflow.name); this.rowMenuWorkflowId.set('');
  }

  cancelRename(): void { this.renamingWorkflowId.set(''); this.renameValue.set(''); }

  saveRename(workflow: BuilderWorkflow): void {
    const name = this.renameValue().trim();
    if (!name || this.saving()) return;
    this.saving.set(true); this.error.set(''); this.message.set('');
    this.api.updateWorkflow(workflow.id, { tenantId: this.tenantId, name, definitionJson: workflow.definitionJson }).subscribe({
      next: saved => {
        this.workflows.update(items => items.map(item => item.id === saved.id ? saved : item));
        this.saving.set(false); this.cancelRename(); this.message.set(this.t('messages.renamed'));
      },
      error: response => { this.saving.set(false); this.error.set(response.error?.detail ?? response.error ?? this.t('errors.rename')); }
    });
  }

  toggleWorkflowActivation(workflow: BuilderWorkflow): void {
    if (this.saving()) return;
    this.saving.set(true); this.error.set(''); this.message.set(''); this.rowMenuWorkflowId.set('');
    const request = workflow.status === 'Draft'
      ? this.api.publishWorkflow(workflow.id, this.tenantId)
      : workflow.status === 'Published'
        ? this.api.deactivateWorkflow(workflow.id, this.tenantId)
        : this.api.reactivateWorkflow(workflow.id, this.tenantId);
    request.subscribe({
      next: updated => {
        this.workflows.update(items => items.map(item => item.id === updated.id ? updated : item));
        this.saving.set(false);
        this.message.set(this.t(workflow.status === 'Published' ? 'messages.deactivated' : 'messages.activated'));
      },
      error: response => {
        this.saving.set(false);
        this.error.set(response.error?.detail ?? response.error ?? this.t(workflow.status === 'Published' ? 'errors.deactivate' : 'errors.activate'));
      }
    });
  }

  publish(): void {
    const workflow = this.workflows().find(item => item.id === this.selectedWorkflowId());
    if (!workflow || workflow.status !== 'Draft' || this.saving()) return;
    this.saving.set(true); this.error.set(''); this.message.set('');
    this.api.publishWorkflow(workflow.id, this.tenantId).subscribe({
      next: published => { this.saving.set(false); this.workflows.update(items => items.map(item => item.id === published.id ? published : item)); this.selectWorkflow(published); this.message.set(this.t('messages.published')); },
      error: response => { this.saving.set(false); this.error.set(response.error?.detail ?? response.error ?? this.t('errors.publish')); }
    });
  }

  inputId(item: ProcessStep): string { return `${item.id}-in`; }
  outputId(item: ProcessStep): string { return item.type === 'trigger' || item.type === 'email' || item.type === 'alert' ? `${item.id}-out` : item.type === 'approval' ? this.approvedId(item) : ''; }
  approvedId(item: ProcessStep): string { return `${item.id}-approved`; }
  rejectedId(item: ProcessStep): string { return `${item.id}-rejected`; }
  conditionYesId(item: ProcessStep): string { return `${item.id}-yes`; }
  conditionNoId(item: ProcessStep): string { return `${item.id}-no`; }
  nodeIcon(type: StepType): string { return ({ trigger: '↯', condition: '⑂', approval: '♙', email: '✉', alert: '♢', end: '⚑' } satisfies Record<StepType, string>)[type]; }
  isPurchaseApproval(): boolean { return !!this.purchaseApproval(); }
  openTemplates(): void { this.showTemplates.set(true); }
  closeTemplates(): void { this.showTemplates.set(false); }
  toggleTab(tab: InspectorTab): void { this.activeTab.set(tab); }
  toggleInspector(): void { this.inspectorCollapsed.update(collapsed => !collapsed); }
  validateProcess(): void {
    const nodes = this.steps(), links = this.connections();
    const issues: string[] = [];
    if (!nodes.some(item => item.type === 'trigger')) issues.push(this.t('validation.addTrigger'));
    if (!nodes.some(item => item.type === 'end')) issues.push(this.t('validation.addEnd'));
    if (!links.length) issues.push(this.t('validation.connect'));
    for (const item of nodes) {
      if (item.type === 'email' || item.type === 'alert') issues.push(this.t('validation.unsupportedAction', { name: item.title }));
      const hasInput = links.some(connection => connection.target === this.inputId(item));
      const hasOutput = links.some(connection => connection.source.startsWith(`${item.id}-`));
      if (item.type !== 'trigger' && item.type !== 'end' && !hasInput) issues.push(this.t('validation.noIncoming', { name: item.title }));
      if (item.type !== 'end' && !hasOutput) issues.push(this.t('validation.noOutgoing', { name: item.title }));
      if (item.type === 'condition' && (!links.some(connection => connection.source === this.conditionYesId(item)) || !links.some(connection => connection.source === this.conditionNoId(item)))) issues.push(this.t('validation.conditionBranches', { name: item.title }));
      if (item.type === 'approval' && (!links.some(connection => connection.source === this.approvedId(item)) || !links.some(connection => connection.source === this.rejectedId(item)))) issues.push(this.t('validation.approvalBranches', { name: item.title }));
      if (item.type === 'condition' && (!item.settings['field'] || !item.settings['value'])) issues.push(this.t('validation.conditionFields', { name: item.title }));
      if (item.type === 'approval' && !item.settings['assignedTo']?.trim()) issues.push(this.t('validation.approver', { name: item.title }));
    }
    this.testResult.set({ valid: issues.length === 0, issues: issues.length ? issues : [this.t('validation.valid')] });
  }

  simulateWorkflow(): void {
    const workflowId = this.selectedWorkflowId();
    if (!workflowId || !this.selectedApplicationId() || !this.tenantId || this.simulationBusy()) return;
    let record: unknown;
    let decisions: unknown;
    try {
      record = JSON.parse(this.simulationRecordJson);
      decisions = JSON.parse(this.simulationOutcomesJson);
      if (record === null || typeof record !== 'object' || Array.isArray(record)) throw new Error('record');
      if (decisions === null || typeof decisions !== 'object' || Array.isArray(decisions) ||
          Object.values(decisions).some(value => value !== 'approved' && value !== 'rejected')) throw new Error('outcomes');
    } catch {
      this.error.set(this.t('errors.simulationJson'));
      return;
    }

    this.simulationBusy.set(true);
    this.error.set('');
    this.simulationResult.set(null);
    this.api.simulateWorkflow(this.selectedApplicationId(), workflowId, this.tenantId,
      JSON.stringify(record), decisions as Record<string, string>).subscribe({
        next: result => { this.simulationResult.set(result); this.simulationBusy.set(false); },
        error: response => {
          this.error.set(response.error?.error ?? response.error?.detail ?? this.t('errors.simulationFailed'));
          this.simulationBusy.set(false);
        }
      });
  }
  canAdd(type: StepType): boolean { return this.isDraft() && !(type === 'trigger' && this.steps().some(item => item.type === 'trigger')) && !(type === 'end' && this.selectedStep()?.type === 'end'); }

  private connect(source: string, target: string): void {
    const sourceNode = this.steps().find(item => [this.outputId(item), this.conditionYesId(item), this.conditionNoId(item), this.rejectedId(item)].includes(source));
    const targetNode = this.steps().find(item => this.inputId(item) === target);
    if (!sourceNode || !targetNode || sourceNode.id === targetNode.id || this.connections().some(item => item.source === source && item.target === target)) return;
    this.connections.update(items => [...items, link(`connection-${crypto.randomUUID().slice(0, 8)}`, source, target)]);
    this.testResult.set(null);
  }

  private updateSelectedStep(change: (item: ProcessStep) => ProcessStep): void {
    const id = this.selectedStepId(); if (!id) return;
    this.steps.update(items => items.map(item => item.id === id ? change(item) : item));
    this.testResult.set(null);
  }

  private uniqueKey(base: string): string {
    const existing = new Set(this.workflows().map(item => item.key.toLowerCase()));
    let candidate = base, suffix = 2;
    while (existing.has(candidate.toLowerCase())) candidate = `${base}-${suffix++}`;
    return candidate;
  }

  private normalizeApproval(value: Partial<PurchaseApprovalDraft>): PurchaseApprovalDraft {
    const routing = value.routing ?? {} as PurchaseApprovalDraft['routing'];
    const defaults = { employeeObjectKey: 'employees', departmentObjectKey: 'departments', absenceObjectKey: 'employee-absences', delegationObjectKey: 'approval-delegations', requesterEmployeeField: 'requester-employee', managerField: 'manager', approvalLimitField: 'approval-limit', portalUserIdField: 'portal-user-id', departmentField: 'department', departmentHeadField: 'department-head' };
    return { objectKey: value.objectKey ?? 'purchase-requests', statusField: value.statusField ?? 'status', requesterField: value.requesterField ?? 'requester', submittedStatus: value.submittedStatus ?? 'Draft', pendingStatus: value.pendingStatus ?? 'In approval', approvedStatus: value.approvedStatus ?? 'Approved', rejectedStatus: value.rejectedStatus ?? 'Rejected', routing: { ...defaults, ...routing } };
  }

  private clearCanvas(): void {
    this.name = ''; this.key = ''; this.isNew = false; this.steps.set([]); this.connections.set([]);
    this.purchaseApproval.set(null); this.selectedStepId.set(''); this.selectedConnectionId.set(''); this.testResult.set(null);
  }
}
