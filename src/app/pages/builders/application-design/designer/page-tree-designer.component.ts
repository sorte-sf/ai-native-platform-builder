import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { LanguageSelectorComponent } from '@app/shared/sorte-components/language-selector/language-selector.component';
import { parsePageDefinition, type PageDefinition } from '@core/builders/page-definition';
import { bindingForComponent } from '@core/builders/component-capabilities';
import { propertiesForNode, ComponentProperty } from '@core/builders/component-properties';
import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { BuildersApiService, BuilderDesignScreen } from '@core/builders/builders-api.service';
import { BuilderMenuItem } from '@core/builders/interfaces/builder-menuItem';
import { AuthService } from '@core/services/auth/auth.service';
import { DesignerApplication } from '@core/builders/interfaces/designer-application';
import { PageNode, pageBlocks, createPageBlock, responsiveNodeStyle } from '@core/builders/page-blocks';
import { composePreviewPage } from '@core/builders/preview-navigation-layout';
import { createSideNavigation } from '@shared/components/application-blocks';
import { sanitizeElementStyle, styleGroups } from '@core/builders/element-styling';
import { InlinePageEditorComponent } from '../inline-editor/inline-page-editor.component';
import { DataWidgetComponent } from '@shared/components/data-widget.component';
import { KanbanComponent } from '@shared/components/kanban.component';
import { GalleryComponent } from '@shared/components/gallery.component';
import { DesignerDataGridComponent } from '@shared/components/designer-data-grid.component';
import { PivotTableComponent } from '@shared/components/pivot-table.component';
import { PaginationComponent } from '@shared/components/pagination.component';
import { BlockPaginationService } from '@shared/components/block-pagination.service';
import { PageTreeRuntimeComponent } from '../../template-screen/page-tree-runtime/page-tree-runtime.component';
import type { RuntimeFormDefinition } from '@core/builders/interfaces/runtime-form-definition';
import { DisplayBlockComponent } from '@shared/components/display-block.component';
import { DataTableComponent } from '@shared/components/data-table.component';
import { SectionBlockComponent } from '@shared/components/section-block.component';
import { ConfirmationService } from '@app/shared/confirmation/confirmation.service';
import { createClientId } from '@core/builders/client-id';
import { BrandColorPickerComponent } from '@shared/components/brand-color-picker.component';
import { IconSelectorComponent } from '@app/shared/sorte-components/icon-selector/icon-selector.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import * as solidIcons from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faPenRuler,
  faDatabase,
  faDiagramProject,
  faEnvelope,
  faCalendarCheck,
  faCode,
  faSliders,
  faCircleQuestion,
  faDesktop,
  faTabletScreenButton,
  faMobileScreenButton,
  faPlay,
  faFloppyDisk,
  faArrowLeft,
  faTableColumns,
  faHeading,
  faGrip,
  faLayerGroup,
  faFont,
  faRectangleList,
  faCirclePlus,
  faKeyboard,
  faIcons,
  faTable,
  faFileLines,
  faWindowMaximize,
  faListOl,
  faCalendarDays,
  faBars,
  faClock,
  faCircleInfo,
  faImage,
  faChevronDown,
  faFolder,
  faChartColumn,
  faChartLine,
  faChartPie,
  faFilter,
  faGauge,
  faGripLines,
  faGripLinesVertical,
  faParagraph,
  faRotateLeft,
  faPenToSquare,
  faTrash,
  faFilePdf,
  faCompass,
  faMoon,
  faSun
} from '@fortawesome/free-solid-svg-icons';

interface LocalPreviewMenuNode { item: BuilderMenuItem; children: LocalPreviewMenuNode[]; }
interface GeneratedPageProposal { mode: 'new' | 'edit'; title: string; summary: string; definition: PageDefinition; }

@Component({
  selector: 'ant-page-tree-designer',
  host: { '(document:keydown)': 'onDesignerKeydown($event)' },
  providers: [BlockPaginationService],
  templateUrl: './page-tree-designer.component.html',
  styleUrl: 'page-tree-designer.component.scss',
  imports: [TranslocoPipe,
    CommonModule,
    RouterModule,
    InlinePageEditorComponent,
    DataWidgetComponent,
    GalleryComponent,
    DesignerDataGridComponent,
    PivotTableComponent,
    PaginationComponent,
    KanbanComponent,
    DisplayBlockComponent,
    SectionBlockComponent,
    FontAwesomeModule,
    DataTableComponent,
    PageTreeRuntimeComponent,
    BrandColorPickerComponent,
    IconSelectorComponent,
    LanguageSelectorComponent,

  ],

})
export class PageTreeDesignerComponent {
  private readonly document = inject(DOCUMENT);
  readonly darkMode = signal(this.readDarkMode());
  readonly bindingForComponent = bindingForComponent;
  readonly isColorStyle = (key: string): boolean => ['color', 'background-color', 'border-color'].includes(key);
  readonly sidebarPanel = signal<'pages' | 'components' | 'dataModels' | 'elements' | 'navigation' | null>('elements');
  readonly sidebarWidth = signal(260);
  readonly sidebarMinWidth = 200;
  readonly sidebarMaxWidth = 480;
  private resizingPointerId: number | null = null;
  private sidebarResizeOrigin = 0;
  private sidebarResizeStartWidth = 260;
  readonly sidebarIcons = { toggle: faBars, pages: faFolder, components: faDiagramProject, dataModels: faDatabase, elements: faLayerGroup, navigation: faCompass };
  readonly paletteTab = signal<'elements' | 'blocks' | 'widgets'>('elements');
  readonly pivotConfigTab = signal<'pivotRows' | 'pivotColumns' | 'pivotValues'>('pivotRows');
  readonly pivotFieldSearch = signal('');
  updatePivotFieldSearch(event: Event): void { this.pivotFieldSearch.set((event.target as HTMLInputElement).value); }
  filteredPivotFields() {
    const query = this.pivotFieldSearch().trim().toLocaleLowerCase();
    return this.tableFields().filter(field => !query || field.label.toLocaleLowerCase().includes(query) || field.key.toLocaleLowerCase().includes(query));
  }

  toggleTheme(): void {
    const dark = !this.darkMode();
    this.darkMode.set(dark);
    try { localStorage.setItem('sorte-builder-theme', dark ? 'dark' : 'light'); } catch { /* Storage may be unavailable. */ }
  }

  private readDarkMode(): boolean {
    try { return this.document.defaultView?.localStorage.getItem('sorte-builder-theme') !== 'light'; }
    catch { return true; }
  }

  showSidebarSection(section: 'pages' | 'components' | 'dataModels' | 'elements' | 'navigation'): void {
    this.sidebarPanel.set(this.sidebarPanel() === section ? null : section);
  }

  startSidebarResize(event: PointerEvent): void {
    if (event.button !== 0) return;
    event.preventDefault();
    this.resizingPointerId = event.pointerId;
    this.sidebarResizeOrigin = event.clientX;
    this.sidebarResizeStartWidth = this.sidebarPanel() ? this.sidebarWidth() : 58;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  resizeSidebar(event: PointerEvent): void {
    if (this.resizingPointerId !== event.pointerId) return;
    this.sidebarPanel.set(this.sidebarPanel() ?? 'elements');
    this.sidebarWidth.set(Math.min(this.sidebarMaxWidth, Math.max(this.sidebarMinWidth,
      this.sidebarResizeStartWidth + event.clientX - this.sidebarResizeOrigin)));
  }

  stopSidebarResize(event: PointerEvent): void {
    if (this.resizingPointerId !== event.pointerId) return;
    this.resizingPointerId = null;
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
  }

  resizeSidebarWithKeyboard(event: KeyboardEvent): void {
    const step = event.shiftKey ? 48 : 16;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      this.sidebarPanel.set(this.sidebarPanel() ?? 'elements');
      this.sidebarWidth.update(width => Math.min(this.sidebarMaxWidth, Math.max(this.sidebarMinWidth,
        width + (event.key === 'ArrowRight' ? step : -step))));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      this.sidebarPanel.set(this.sidebarPanel() ?? 'elements');
      this.sidebarWidth.set(event.key === 'Home' ? this.sidebarMinWidth : this.sidebarMaxWidth);
    }
  }
  readonly aiPanelOpen = signal(false);
  readonly aiPanel = viewChild<ElementRef<HTMLDialogElement>>('aiPanel');
  readonly aiLauncher = viewChild<ElementRef<HTMLButtonElement>>('aiLauncher');
  readonly aiPanelIcons = { open: faIcons, close: faArrowLeft };
  openAiPanel(): void { this.aiPanel()?.nativeElement.showModal(); this.aiPanelOpen.set(true); }
  closeAiPanel(): void { this.aiPanel()?.nativeElement.close(); }
  onAiPanelClosed(): void { this.aiPanelOpen.set(false); this.aiLauncher()?.nativeElement.focus(); }
  readonly aiCommand = signal(''); readonly aiBusy = signal(false); readonly aiError = signal('');
  readonly aiProposal = signal<GeneratedPageProposal | null>(null);
  readonly aiMode = signal<'new' | 'edit'>('new');
  private aiBase = ''; private aiPageId = '';
  private aiUndoState: { before: string; after: string; pageId: string } | null = null;
  updateAiCommand(event: Event): void { this.aiCommand.set((event.target as HTMLTextAreaElement).value); }

  async proposeAiPage(): Promise<void> {
    const app = this.app(), command = this.aiCommand().trim();
    const page = this.current();
    if (!app || !this.editable() || this.aiBusy() || !command || command.length > 2000 || this.aiMode() === 'edit' && !page) return;
    this.aiBusy.set(true); this.aiProposal.set(null); this.aiError.set('');
    const base = this.aiMode() === 'edit'
      ? JSON.stringify({ schemaVersion: 1, children: this.nodes() })
      : JSON.stringify({ schemaVersion: 1, children: [] });
    this.api.proposeDesignerChange(this.applicationId, this.tenantId, this.aiMode() === 'edit' ? page?.id ?? null : null, command, base,
      this.aiMode() === 'edit' ? this.selectedId() : null, this.aiMode()).subscribe({
      next: response => {
        try {
          const definition = parsePageDefinition(response.definitionJson);
          const title = response.title?.trim() || page?.title || 'New page';
          this.aiBase = base; this.aiPageId = page?.id ?? '';
          this.aiProposal.set({ mode: response.mode, title, summary: response.summary, definition });
        } catch { this.aiError.set('aiDesigner.error'); }
        finally { this.aiBusy.set(false); }
      },
      error: error => {
        this.aiError.set(error?.error?.detail ?? error?.error?.error ?? 'aiDesigner.error');
        this.aiBusy.set(false);
      }
    });
  }

  applyAiEdit(): void {
    const proposal = this.aiProposal(), page = this.current();
    if (!proposal || proposal.mode !== 'edit' || !page || !this.editable()) return;
    const current = JSON.stringify({ schemaVersion: 1, children: this.nodes() });
    if (page.id !== this.aiPageId || current !== this.aiBase) { this.aiError.set('aiDesigner.stale'); return; }
    const after = JSON.stringify(proposal.definition);
    this.aiUndoState = { before: this.aiBase, after, pageId: page.id };
    this.nodes.set(proposal.definition.children); this.selectedId.set(null); this.dirty = true;
    this.aiProposal.set(null); this.notice.set('AI changes applied to the canvas. Review and save when ready.'); 
    this.closeAiPanel();
  }

  canUndoAi(): boolean {
    return this.editable() && !!this.aiUndoState && this.current()?.id === this.aiUndoState.pageId && JSON.stringify({ schemaVersion: 1, children: this.nodes() }) === this.aiUndoState.after;
  }

  undoAiChange(): void {
    if (!this.canUndoAi() || !this.aiUndoState) return;
    this.nodes.set(parsePageDefinition(this.aiUndoState.before).children); this.selectedId.set(null); this.dirty = true; this.aiUndoState = null;
  }

  createGeneratedPage(): void {
    const proposal = this.aiProposal();
    if (!proposal || proposal.mode !== 'new' || !this.editable() || this.creatingPage() || this.saving()) return;
    if (this.dirty) { this.save(() => this.createGeneratedPageNow(proposal)); return; }
    this.createGeneratedPageNow(proposal);
  }

  private createGeneratedPageNow(proposal: GeneratedPageProposal): void {
    if (!this.editable() || this.creatingPage() || this.saving()) return;
    this.creatingPage.set(true); this.aiError.set('');
    this.api.createApplicationScreen(this.applicationId, {
      tenantId: this.tenantId, key: `page-${createClientId()}`, title: proposal.title, htmlContent: ''
    }).subscribe({
      next: page => {
        const definitionJson = JSON.stringify(proposal.definition);
        this.api.savePageDefinition(this.applicationId, page.id, this.tenantId, definitionJson).subscribe({
          next: () => {
            page.definitionJson = definitionJson;
            this.pages.update(items => [...items, page]);
            this.refreshApplicationMenus();
            this.creatingPage.set(false); this.selectPage(page); this.aiProposal.set(null); this.aiCommand.set('');
            this.notice.set('Generated page created. Review and save any further edits in the designer.');
            this.closeAiPanel();
          },
          error: () => this.api.deleteApplicationScreen(this.applicationId, page.id, this.tenantId).subscribe({
            next: () => { this.creatingPage.set(false); this.aiError.set('The page could not be saved. The incomplete page was removed; please try again.'); },
            error: () => { this.creatingPage.set(false); this.aiError.set('The page definition could not be saved, and cleanup did not complete. Check the Pages list before retrying.'); this.load(); }
          })
        });
      },
      error: response => { this.creatingPage.set(false); this.aiError.set(response?.error?.detail ?? 'The generated page could not be created.'); }
    });
  }

  readonly translations = inject(TranslocoService);
  private readonly confirmation = inject(ConfirmationService);

  readonly renamingPageId = signal<string | null>(null);
  readonly pageEditPosition = signal<{ left: number; top: number } | null>(null);
  readonly pageName = signal('');
  readonly renameError = signal('');
  readonly renameBusy = signal(false);
  readonly deletingPageId = signal<string | null>(null);
  readonly faEditIcon = faPenToSquare;
  readonly faTrashIcon = faTrash;
  beginRename(page: BuilderDesignScreen, event: MouseEvent): void {
    if (!this.editable() || this.renameBusy() || this.deletingPageId()) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const width = Math.min(280, window.innerWidth - 16);
    const estimatedHeight = 150;
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    const top = rect.bottom + estimatedHeight <= window.innerHeight - 8
      ? rect.bottom + 6
      : Math.max(8, rect.top - estimatedHeight - 6);
    this.pageEditPosition.set({ left, top });
    this.pageName.set(page.title);
    this.renameError.set('');
    this.renamingPageId.set(page.id);
  }
  cancelRename(): void { if (!this.renameBusy()) { this.renamingPageId.set(null); this.pageEditPosition.set(null); this.renameError.set(''); } }
  updatePageName(event: Event): void {
    this.pageName.set((event.target as HTMLInputElement).value);
    this.renameError.set('');
  }

  pageNameIssue(): string {
    const title = this.pageName().trim().replace(/\s+/gu, ' ');
    if (!title || title.length > 120 || !/^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N} '’&().,_-]*$/u.test(title))
      return 'pageRename.invalidName';
    const duplicate = this.pages().some(page => page.id !== this.renamingPageId() &&
      page.title.trim().replace(/\s+/gu, ' ').toLowerCase() === title.toLowerCase());
    return duplicate ? 'pageRename.duplicateName' : '';
  }

  renamePage(page: BuilderDesignScreen): void {
    const title = this.pageName().trim().replace(/\s+/gu, ' ');
    if (!page || !this.editable() || this.renameBusy() || this.pageNameIssue()) return;
    this.renameBusy.set(true); this.error.set(''); this.renameError.set('');
    this.api.renameApplicationPage(this.applicationId, page.id, this.tenantId, title).subscribe({
      next: result => { this.pages.update(pages => pages.map(item => item.id === page.id ? { ...item, title: result.title } : item)); if (this.current()?.id === page.id) this.current.set({ ...this.current()!, title: result.title }); this.renameBusy.set(false); this.renamingPageId.set(null); this.pageEditPosition.set(null); this.refreshApplicationMenus(); },
      error: response => {
        this.renameBusy.set(false);
        if (response?.error?.code === 'page_name_exists') {
          this.renameError.set(this.translations.translate('pageRename.duplicateName'));
          return;
        }
        const serverMessage = typeof response?.error === 'string'
          ? response.error
          : response?.error?.detail ?? response?.error?.message ?? response?.error?.title;
        this.renameError.set(serverMessage || this.translations.translate(
          response?.status === 403 ? 'pageRename.forbidden'
            : response?.status === 409 ? 'pageRename.draftOnly'
              : 'pageRename.error'
        ));
      }
    });
  }

  async deletePage(page: BuilderDesignScreen): Promise<void> {
    if (!this.editable() || this.deletingPageId() || this.saving() || this.creatingPage() || this.renameBusy()) return;
    const accepted = await this.confirmation.confirm({
      title: this.translations.translate('pageRename.deleteTitle'),
      message: this.translations.translate('pageRename.deleteMessage', { title: page.title }),
      confirmText: this.translations.translate('pageRename.deleteConfirm'),
      cancelText: this.translations.translate('ui.cancel'),
      tone: 'danger'
    });
    if (!accepted) return;

    this.deletingPageId.set(page.id);
    this.error.set('');
    this.api.deleteApplicationScreen(this.applicationId, page.id, this.tenantId).subscribe({
      next: () => {
        const remaining = this.pages().filter(item => item.id !== page.id);
        this.pages.set(remaining);
        if (this.current()?.id === page.id) {
          this.current.set(null);
          this.nodes.set([]);
          this.selectedId.set(null);
          this.dirty = false;
          this.undoStack.set([]);
          this.historySnapshot = '[]';
          this.renamingPageId.set(null);
          this.pageEditPosition.set(null);
          if (remaining.length) this.selectPage(remaining[0]);
        }
        this.deletingPageId.set(null);
        this.refreshApplicationMenus();
        this.notice.set(this.translations.translate('pageRename.deleted'));
      },
      error: response => {
        this.deletingPageId.set(null);
        this.error.set(response?.error?.detail ?? this.translations.translate('pageRename.deleteError'));
      }
    });
  }
  readonly propertiesForNode = propertiesForNode;
  updateRegisteredProperty(property: ComponentProperty, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
    if (property.key === 'text') this.updateText(value);
    else this.setProperty(property.key, value);
  }
  buttonActionType(node: PageNode): 'none' | 'page' | 'url' | 'form' {
    return node.actionType ?? (node.pageKey ? 'page' : 'none');
  }
  setButtonActionType(node: PageNode, value: string): void {
    if (!this.editable() || node.type !== 'button' || !['none', 'page', 'url', 'form'].includes(value) || value === 'form' && !node.floatingButton) return;
    const type = value as NonNullable<PageNode['actionType']>;
    if (type === 'page') node.actionValue = node.actionValue || node.pageKey || '';
    else node.actionValue = '';
    node.pageKey = undefined;
    node.actionType = type;
    this.nodes.update(items => [...items]); this.dirty = true;
  }
  setButtonActionValue(node: PageNode, value: string): void {
    if (!this.editable() || node.type !== 'button') return;
    node.actionValue = value.slice(0, 2048);
    node.pageKey = undefined;
    this.nodes.update(items => [...items]); this.dirty = true;
  }
  readonly toolbarIcons = {
    desktop: faDesktop,
    tablet: faTabletScreenButton,
    mobile: faMobileScreenButton,
    preview: faPlay,
    save: faFloppyDisk,
    document: faFilePdf,
    undo: faRotateLeft,
    back: faArrowLeft,
    moon: faMoon,
    sun: faSun
  };

  readonly studioModules = [
    { key: 'uiDesign', icon: faPenRuler, route: 'design' },
    { key: 'dataSources', icon: faDatabase, route: 'data-sources' },
    { key: 'automation', icon: faDiagramProject, route: 'workflows' },
    { key: 'email', icon: faEnvelope, route: 'email-templates' },
    { key: 'documents', icon: faFilePdf, route: 'documents' },
    { key: 'reports', icon: faFileLines, route: null },
    { key: 'jobs', icon: faCalendarCheck, route: 'jobs' },
    { key: 'api', icon: faCode, route: null },
    { key: 'configuration', icon: faSliders, route: null },
    { key: 'helpDesk', icon: faCircleQuestion, route: null }
  ];

  previewDraft(): void {
    const page = this.current();
    if (!page || this.saving()) return;
    try {
      this.previewNodes.set(parsePageDefinition(JSON.stringify({ schemaVersion: 1, children: this.nodes() })).children);
      this.previewShellNodes = structuredClone(this.previewNodes());
      this.previewNavigation.set(this.buildPreviewNavigation(this.previewMenus));
      this.previewTitle.set(page.title); this.previewPageKey = page.key;
      this.previewDialog()?.nativeElement.showModal();
    } catch {
      this.error.set('preview.loadError');
    }
  }

  readonly previewDialog = viewChild<ElementRef<HTMLDialogElement>>('previewDialog');
  readonly previewNodes = signal<PageNode[]>([]);
  readonly previewNavigation = signal<LocalPreviewMenuNode[]>([]);
  readonly managedNavigation = signal<LocalPreviewMenuNode[]>([]);
  readonly expandedMenuIds = signal<Set<string>>(new Set());
  readonly menuSettingsId = signal<string | null>(null);
  readonly menuBusy = signal(false);
  readonly menuError = signal('');
  readonly previewTitle = signal('');
  private previewPageKey = '';
  private previewShellNodes: PageNode[] = [];
  private previewMenus: BuilderMenuItem[] = [];
  private navigationMenusInitialized = false;

  private setApplicationMenus(items: BuilderMenuItem[], expandParentId?: string): void {
    this.previewMenus = items;
    this.managedNavigation.set(this.buildPreviewNavigation(items));
    this.previewNavigation.set(this.buildPreviewNavigation(items));
    const ids = new Set(items.map(item => item.id));
    const parentIds = new Set(items.flatMap(item => item.parentId ? [item.parentId] : []));
    this.expandedMenuIds.update(current => {
      const next = new Set([...current].filter(id => ids.has(id)));
      if (!this.navigationMenusInitialized) parentIds.forEach(id => next.add(id));
      if (expandParentId && ids.has(expandParentId)) next.add(expandParentId);
      return next;
    });
    this.navigationMenusInitialized = true;
    if (!ids.has(this.menuSettingsId() ?? '')) this.menuSettingsId.set(null);
  }

  toggleApplicationMenuNode(id: string): void {
    this.expandedMenuIds.update(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  toggleApplicationMenuSettings(id: string): void {
    this.menuSettingsId.set(this.menuSettingsId() === id ? null : id);
  }

  canMoveApplicationMenuItem(item: BuilderMenuItem, offset: number): boolean {
    const siblings = this.previewMenus.filter(candidate => (candidate.parentId ?? null) === (item.parentId ?? null))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const index = siblings.findIndex(candidate => candidate.id === item.id);
    return index + offset >= 0 && index + offset < siblings.length;
  }

  moveApplicationMenuItem(item: BuilderMenuItem, offset: number): void {
    if (!this.editable() || this.menuBusy() || !this.canMoveApplicationMenuItem(item, offset)) return;
    const siblings = this.previewMenus.filter(candidate => (candidate.parentId ?? null) === (item.parentId ?? null))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const index = siblings.findIndex(candidate => candidate.id === item.id);
    const neighbor = siblings[index + offset];
    this.menuBusy.set(true); this.menuError.set('');
    forkJoin([
      this.api.updateMenuItem(item.id, this.applicationMenuUpdate(item, { sortOrder: neighbor.sortOrder })),
      this.api.updateMenuItem(neighbor.id, this.applicationMenuUpdate(neighbor, { sortOrder: item.sortOrder }))
    ]).subscribe({
      next: updated => {
        const byId = new Map(updated.map(candidate => [candidate.id, candidate]));
        this.setApplicationMenus(this.previewMenus.map(candidate => byId.get(candidate.id) ?? candidate));
        this.menuBusy.set(false);
      },
      error: response => { this.menuBusy.set(false); this.menuError.set(response?.error?.detail ?? 'The menu order could not be changed.'); }
    });
  }

  menuPageKey(item: BuilderMenuItem): string {
    return this.pages().find(page => page.key === this.previewMenuPageKey(item.route))?.key ?? '';
  }

  createApplicationMenuGroup(parentId?: string): void {
    this.createApplicationMenuItem(parentId, null, this.translations.translate('designer.newMenuGroup'), `menu-group-${createClientId()}`);
  }

  createApplicationMenuLink(parentId?: string): void {
    const page = this.pages()[0];
    if (!page) return;
    this.createApplicationMenuItem(parentId, page, page.title, `menu-link-${createClientId()}`);
  }

  private createApplicationMenuItem(parentId: string | undefined, page: BuilderDesignScreen | null, label: string, key: string): void {
    if (!this.editable() || this.menuBusy()) return;
    const siblings = this.previewMenus.filter(item => (item.parentId ?? null) === (parentId ?? null));
    const item: Omit<BuilderMenuItem, 'id'> = {
      tenantId: this.tenantId, applicationId: this.applicationId, parentId: parentId ?? null,
      key, label, route: page ? `/builder/applications/${this.applicationId}/screens/${page.key}` : undefined,
      icon: "['fas','layer-group']", sortOrder: siblings.length, visible: true
    };
    this.menuBusy.set(true); this.menuError.set('');
    this.api.createMenuItem(item).subscribe({
      next: created => { this.setApplicationMenus([...this.previewMenus, created], parentId); this.menuBusy.set(false); },
      error: response => { this.menuBusy.set(false); this.menuError.set(response?.error?.detail ?? 'The menu item could not be created.'); }
    });
  }

  saveApplicationMenuLabel(item: BuilderMenuItem, value: string): void {
    const label = value.trim();
    if (!label || label.length > 80 || label === item.label || !this.editable() || this.menuBusy()) return;
    this.updateApplicationMenu(item, { label });
  }

  saveApplicationMenuIcon(item: BuilderMenuItem, icon: string): void {
    if (!this.editable() || this.menuBusy()) return;
    this.updateApplicationMenu(item, { icon });
  }

  setApplicationMenuTarget(item: BuilderMenuItem, pageKey: string): void {
    if (!this.editable() || this.menuBusy()) return;
    const page = this.pages().find(candidate => candidate.key === pageKey);
    if (pageKey && !page) return;
    this.updateApplicationMenu(item, { route: page ? `/builder/applications/${this.applicationId}/screens/${page.key}` : undefined });
  }

  private updateApplicationMenu(item: BuilderMenuItem, changes: Partial<BuilderMenuItem>): void {
    this.menuBusy.set(true); this.menuError.set('');
    this.api.updateMenuItem(item.id, this.applicationMenuUpdate(item, changes)).subscribe({
      next: updated => { this.setApplicationMenus(this.previewMenus.map(existing => existing.id === updated.id ? updated : existing)); this.menuBusy.set(false); },
      error: response => { this.menuBusy.set(false); this.menuError.set(response?.error?.detail ?? 'The menu item could not be updated.'); }
    });
  }

  private applicationMenuUpdate(item: BuilderMenuItem, changes: Partial<BuilderMenuItem> = {}) {
    return {
      tenantId: item.tenantId, parentId: item.parentId ?? null, moduleId: item.moduleId ?? null,
      key: item.key, label: item.label, icon: item.icon, sortOrder: item.sortOrder,
      visible: item.visible, permissionKey: item.permissionKey,
      ...changes, route: Object.hasOwn(changes, 'route') ? changes.route ?? null : item.route ?? null
    };
  }

  async removeApplicationMenuItem(item: BuilderMenuItem): Promise<void> {
    if (!this.editable() || this.menuBusy()) return;
    const accepted = await this.confirmation.confirm({
      title: this.translations.translate('designer.removeMenuGroup'), message: item.label,
      confirmText: this.translations.translate('pageRename.deleteConfirm'),
      cancelText: this.translations.translate('ui.cancel'), tone: 'danger'
    });
    if (!accepted) return;
    this.menuBusy.set(true); this.menuError.set('');
    this.api.deleteMenuItem(item.id, this.tenantId).subscribe({
      next: () => {
        const removed = new Set<string>([item.id]);
        let changed = true;
        while (changed) { changed = false; for (const candidate of this.previewMenus) if (candidate.parentId && removed.has(candidate.parentId) && !removed.has(candidate.id)) { removed.add(candidate.id); changed = true; } }
        this.setApplicationMenus(this.previewMenus.filter(candidate => !removed.has(candidate.id)));
        this.menuBusy.set(false);
      },
      error: response => { this.menuBusy.set(false); this.menuError.set(response?.error?.detail ?? 'The menu item could not be removed.'); }
    });
  }

  private refreshApplicationMenus(): void {
    this.api.applicationMenuItems(this.tenantId, this.applicationId).subscribe({
      next: items => this.setApplicationMenus(items),
      error: () => this.menuError.set('The application menu could not be refreshed.')
    });
  }

  previewMenuIcon(value?: string | null): IconDefinition {
    const name = value?.match(/^\['fas','([a-z0-9-]+)'\]$/)?.[1] ?? value?.replace(/^fa-/, '');
    return Object.values(solidIcons).find((icon): icon is IconDefinition =>
      !!icon && typeof icon === 'object' && 'iconName' in icon && icon.iconName === name) ?? faLayerGroup;
  }

  previewMenuPageKey(route?: string): string {
    if (!route) return '';
    const match = route.match(/\/screens\/([^/?#]+)/i);
    return match?.[1] ?? route;
  }

  private buildPreviewNavigation(items: BuilderMenuItem[]): LocalPreviewMenuNode[] {
    if (!items.length) {
      items = this.pages().map((page, index) => ({
        id: `local-preview-${page.id}`, tenantId: this.tenantId, applicationId: this.applicationId,
        key: page.key, label: page.title, route: page.key, icon: "['fas','layer-group']",
        sortOrder: index, visible: true
      }));
    }
    const nodes = new Map(items.filter(item => item.visible).map(item => [item.id, { item, children: [] as LocalPreviewMenuNode[] }]));
    const roots: LocalPreviewMenuNode[] = [];
    for (const node of nodes.values()) {
      const parent = node.item.parentId ? nodes.get(node.item.parentId) : undefined;
      if (parent) parent.children.push(node);
      else if (!node.item.parentId) roots.push(node);
    }
    const sort = (siblings: LocalPreviewMenuNode[]) => {
      siblings.sort((a, b) => a.item.sortOrder - b.item.sortOrder);
      siblings.forEach(node => sort(node.children));
    };
    sort(roots);
    return roots;
  }

  previewForms(): Record<string, RuntimeFormDefinition> {
    return Object.fromEntries((this.app()?.objects ?? []).flatMap(obj => this.formsForObject(obj).map(form => [form.id, {
      formId: form.id, objectId: obj.id, key: form.key, name: form.name, layoutJson: form.layoutJson ?? null, fields: obj.fields
    }] as const)));
  }

  availableForms(): { id: string; objectId: string; objectName: string; key: string; name: string; layoutJson?: string | null }[] {
    return (this.app()?.objects ?? []).flatMap(obj => this.formsForObject(obj).map(form => ({
      ...form, objectId: obj.id, objectName: obj.name
    })));
  }

  private formsForObject(obj: DesignerApplication['objects'][number]): { id: string; key: string; name: string; layoutJson?: string | null }[] {
    if (obj.forms?.length) return obj.forms;
    return obj.formId ? [{ id: obj.formId, key: obj.formKey ?? obj.key, name: obj.formName ?? obj.name, layoutJson: obj.layoutJson }] : [];
  }

  previewNavigate(key: string): void {
    const page = this.pages().find(page => page.key === key); if (!page || key === this.previewPageKey) return;
    try {
      const json = page.id === this.current()?.id ? JSON.stringify({
        schemaVersion: 1,
        children: this.nodes()
      }) : page.definitionJson ?? '{"schemaVersion":1,"children":[]}';

      this.previewNodes.set(composePreviewPage(this.previewShellNodes, parsePageDefinition(json).children));
      this.previewTitle.set(page.title);
      this.previewPageKey = key;

    } catch { this.error.set('preview.loadError'); }
  }

  private readonly router = inject(Router);
  private readonly api = inject(BuildersApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  readonly applicationId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly tenantId = this.route.snapshot.queryParamMap.get('tenantId') ?? this.auth.tenantId() ?? '';
  readonly app = signal<DesignerApplication | null>(null);
  readonly pages = signal<BuilderDesignScreen[]>([]);
  readonly current = signal<BuilderDesignScreen | null>(null);
  readonly nodes = signal<PageNode[]>([]);
  readonly selectedId = signal<string | null>(null);
  readonly inlineEditingId = signal<string | null>(null);
  readonly selectionActionsOpen = signal(false);
  private inlineEditOriginal = '';
  readonly collapsedTreeNodes = signal<ReadonlySet<string>>(new Set());
  readonly editingNodeId = signal<string | null>(null);
  readonly error = signal('');
  readonly notice = signal('');
  readonly saving = signal(false);
  private dirty = false;
  readonly undoStack = signal<string[]>([]);
  private historySnapshot = '[]';

  onDesignerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.selectionActionsOpen()) {
        this.selectionActionsOpen.set(false);
        event.preventDefault();
        return;
      }
      if (this.inlineEditingId()) return;
      if (this.selectedId()) {
        this.selectedId.set(null);
        event.preventDefault();
        return;
      }
    }
    if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.key.toLowerCase() !== 'z') return;
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]')) return;
    if (!this.editable() || !this.undoStack().length) return;
    event.preventDefault(); this.undoCanvas();
  }

  undoCanvas(): void {
    if (!this.editable()) return;
    const stack = this.undoStack(); if (!stack.length) return;
    const previous = stack[stack.length - 1];
    this.undoStack.set(stack.slice(0, -1));
    this.historySnapshot = previous;
    this.nodes.set(JSON.parse(previous) as PageNode[]);
    this.selectedId.set(null);
    this.dirty = true;
  }
  readonly blocks = pageBlocks; readonly styleGroups = styleGroups;
  readonly newPageOpen = signal(false); readonly creatingPage = signal(false); readonly newPageError = signal('');
  private readonly newPageButton = viewChild<ElementRef<HTMLButtonElement>>('newPageButton');
  readonly types: PageNode['type'][] = ['container', 'text', 'heading', 'image', 'button', 'table', 'form'];
  readonly viewport = signal<'desktop' | 'tablet' | 'mobile'>('desktop');
  readonly inspectorTab = signal<'properties' | 'styling'>('properties');

  tableFields() {
    return this.app()?.objects.find(object => object.id === this.selected()?.objectId)?.fields ?? [];
  }

  galleryTargets(): PageNode[] {
    const visit = (nodes: PageNode[]): PageNode[] => nodes.flatMap(node => [...(node.type === 'gallery' ? [node] : []), ...visit(node.children ?? [])]);
    return visit(this.nodes());
  }

  setBlockNumber(key: 'galleryColumns' | 'pageSize', event: Event): void {
    const node = this.selected(), value = Number((event.target as HTMLInputElement).value);
    if (!node || !this.editable() || !Number.isInteger(value) || value < 1 || value > (key === 'galleryColumns' ? 6 : 100)) return;
    node[key] = value; this.nodes.update(items => [...items]); this.dirty = true;
  }

  togglePivotDimension(axis: 'pivotRows' | 'pivotColumns', field: string, event: Event): void {
    const node = this.selected();
    if (!node || node.type !== 'pivot-table' || !this.editable()) return;
    const checked = (event.target as HTMLInputElement).checked;
    const limit = axis === 'pivotRows' ? 3 : 2;
    const otherAxis = axis === 'pivotRows' ? node.pivotColumns : node.pivotRows;
    const values = new Set(node[axis] ?? []);
    if (checked) {
      if (values.size >= limit || otherAxis?.includes(field)) return;
      values.add(field);
    } else values.delete(field);
    node[axis] = values.size ? [...values] : undefined;
    this.nodes.update(items => [...items]); this.dirty = true;
  }

  togglePivotValue(field: string, event: Event): void {
    const node = this.selected();
    if (!node || node.type !== 'pivot-table' || !this.editable()) return;
    const values = node.pivotValues ?? [];
    if ((event.target as HTMLInputElement).checked) {
      if (values.length >= 5 || values.some(value => value.field === field)) return;
      node.pivotValues = [...values, { field, aggregation: 'sum' }];
    } else {
      const remaining = values.filter(value => value.field !== field);
      node.pivotValues = remaining.length ? remaining : undefined;
    }
    this.nodes.update(items => [...items]); this.dirty = true;
  }

  pivotMeasure(node: PageNode, field: string) { return node.pivotValues?.find(value => value.field === field); }

  setPivotAggregation(field: string, aggregation: string): void {
    const node = this.selected();
    if (!node || node.type !== 'pivot-table' || !this.editable() || !['count', 'sum', 'average', 'min', 'max'].includes(aggregation)) return;
    node.pivotValues = (node.pivotValues ?? []).map(value => value.field === field ? { ...value, aggregation: aggregation as NonNullable<PageNode['pivotValues']>[number]['aggregation'] } : value);
    this.nodes.update(items => [...items]); this.dirty = true;
  }

  setPivotTotals(key: 'pivotRowTotals' | 'pivotColumnTotals', event: Event): void {
    const node = this.selected();
    if (!node || node.type !== 'pivot-table' || !this.editable()) return;
    node[key] = (event.target as HTMLInputElement).checked;
    this.nodes.update(items => [...items]); this.dirty = true;
  }

  readonly crudActionNames = ['create', 'view', 'edit', 'delete'] as const;
  setCrudAction(action: 'create' | 'view' | 'edit' | 'delete', event: Event): void {
    const node = this.selected(); if (!node || node.type !== 'crud' || !this.editable()) return;
    node.crudActions = { ...node.crudActions, [action]: (event.target as HTMLInputElement).checked };
    this.nodes.update(items => [...items]); this.dirty = true;
  }

  addTableColumn(): void {
    const node = this.selected(); if (!node || !this.editable()) return;
    node.tableColumns ??= (node.columns ?? []).map(field => ({ field, title: field }));
    if (node.tableColumns.length >= 50) return;
    const field = this.tableFields().find(field => !node.tableColumns?.some(column => column.field === field.key));
    node.tableColumns.push({ field: field?.key ?? '', title: field?.label ?? 'Column', align: 'left', format: 'text' });
    this.nodes.update(items => [...items]); this.dirty = true;
  }

  editTableColumn(index: number, key: 'field' | 'title' | 'width' | 'align' | 'format' | 'hidden', value: string): void {
    const node = this.selected(), column = node?.tableColumns?.[index]; if (!node || !column || !this.editable()) return;
    if (key === 'width') { const width = Number(value); if (value && (!Number.isInteger(width) || width < 40 || width > 1200)) return; column.width = value ? width : undefined; }
    else if (key === 'align') { if (value === 'left' || value === 'right' || value === 'center') column.align = value; }
    else if (key === 'format') { if (value === 'text' || value === 'number' || value === 'date') column.format = value; }
    else if (key === 'hidden') column.hidden = value === 'true';
    else column[key] = value;
    node.columns = node.tableColumns?.map(column => column.field).filter(Boolean);
    this.nodes.update(items => [...items]); this.dirty = true;
  }

  moveTableColumn(index: number, offset: number): void {
    const columns = this.selected()?.tableColumns;
    if (!this.editable() || !columns || index + offset < 0 || index + offset >= columns.length) return;
    [columns[index], columns[index + offset]] = [columns[index + offset], columns[index]];
    this.nodes.update(items => [...items]); this.dirty = true;
  }

  removeTableColumn(index: number): void {
    if (!this.editable()) return;
    const node = this.selected(); node?.tableColumns?.splice(index, 1);
    if (node) node.columns = node.tableColumns?.map(column => column.field).filter(Boolean);
    this.nodes.update(items => [...items]);
    this.dirty = true;
  }

  setTableJson(value: string): void {
    if (!this.editable()) return;
    const node = this.selected();
    if (!node) return; node.tableJson = value || undefined;
    if (value) node.objectId = undefined; this.nodes.update(items => [...items]);
    this.dirty = true;
  }

  readonly elementGroups = [
    { title: 'elements.common', keys: ['row', 'app-header', 'horizontal', 'vertical', 'text', 'button', 'floating-button', 'text-input', 'icon', 'table'] },
    { title: 'elements.containers', keys: ['form', 'stepper', 'row', 'app-header', 'app-footer', 'horizontal', 'vertical', 'panel', 'collapse', 'tabs', 'container', 'app-grid', 'app-layout'] },
    { title: 'elements.display', keys: ['badge', 'barcode-reader', 'countdown', 'countup', 'icon', 'image', 'text', 'markdown', 'qr-renderer', 'stopwatch', 'thumbnail', 'timeline', 'calendar', 'date-time-picker', 'flippable-card', 'app-sidenav', 'tooltip', 'heading'] },
    { title: 'elements.business', keys: ['kpi', 'chart', 'line-chart', 'area-chart', 'time-area-chart', 'bar-line-chart', 'pie-chart', 'doughnut-chart', 'funnel-chart', 'kanban', 'gallery', 'data-grid', 'pivot-table', 'pagination', 'card', 'cards', 'hero', 'contact'] }
  ];
  paletteGroups() {
    if (this.paletteTab() === 'blocks') return this.elementGroups.filter(group => group.title === 'elements.containers');
    if (this.paletteTab() === 'widgets') return this.elementGroups.filter(group => group.title === 'elements.business');
    return this.elementGroups.filter(group => group.title !== 'elements.business');
  }
  readonly elementSearch = signal('');
  updateElementSearch(event: Event): void { this.elementSearch.set((event.target as HTMLInputElement).value); }
  hasMatchingElements(): boolean { return this.paletteGroups().some(group => this.groupBlocks(group.keys, group.title).length > 0); }

  readonly blockIcons = {
    row: faGripLines, 'app-header': faWindowMaximize, horizontal: faGripLinesVertical, vertical: faGripLines,
    text: faFont, button: faRectangleList, 'floating-button': faCirclePlus, 'text-input': faKeyboard, icon: faIcons, table: faTable, form: faFileLines,
    stepper: faListOl, 'app-footer': faWindowMaximize, panel: faWindowMaximize, collapse: faChevronDown, tabs: faFolder,
    container: faLayerGroup, 'app-grid': faGrip, 'app-layout': faTableColumns, calendar: faCalendarDays, 'date-time-picker': faCalendarCheck, 'flippable-card': faWindowMaximize, 'app-sidenav': faBars,
    badge: faCircleInfo, 'barcode-reader': faKeyboard, countdown: faClock, countup: faGauge, 'qr-renderer': faIcons, stopwatch: faClock,
    timeline: faClock, tooltip: faCircleInfo, image: faImage, markdown: faParagraph, thumbnail: faImage, heading: faHeading,
    kpi: faGauge, chart: faChartColumn, 'line-chart': faChartLine, 'area-chart': faChartLine, 'time-area-chart': faChartLine, 'bar-line-chart': faChartColumn, 'pie-chart': faChartPie, 'doughnut-chart': faChartPie, 'funnel-chart': faFilter, kanban: faTableColumns, gallery: faImage, 'data-grid': faTable, 'pivot-table': faTableColumns, pagination: faListOl, card: faWindowMaximize, cards: faGrip, hero: faWindowMaximize, contact: faFileLines
  };

  groupBlocks(keys: string[], groupTitle?: string) {
    const term = this.elementSearch().trim().toLocaleLowerCase();
    const matchesGroup = !!term && !!groupTitle && this.translations.translate(groupTitle).toLocaleLowerCase().includes(term);
    return keys.flatMap(key => this.blocks.filter(block => block.key === key &&
      (!term || matchesGroup || key.toLocaleLowerCase().includes(term) ||
        this.translations.translate(block.name).toLocaleLowerCase().includes(term))));
  }
  blockIcon(key: string) { return this.blockIcons[key as keyof typeof this.blockIcons] ?? faLayerGroup; }
  readonly gridSizes = [1, 2, 3, 4, 6, 12];
  readonly spans = [1, 2, 3, 4, 6, 12];
  readonly devices = ['desktop', 'tablet', 'mobile'] as const;
  readonly columnPresets = [[24], [12, 12], [8, 8, 8], [6, 6, 6, 6], [8, 16], [16, 8]];

  setResponsiveColumns(device: 'desktop' | 'tablet' | 'mobile', values: number[]): void {
    const node = this.selected();
    if (!node || node.type !== 'container' || !this.editable() || values.length > 12 || values.some(value => !Number.isFinite(value) || value <= 0 || value > 24)) return;
    node.responsiveColumns = { ...node.responsiveColumns, [device]: [...values] };
    this.setStyle('display', 'grid');
    this.setStyle('grid-template-columns', '');
  }

  updateColumnRatio(device: 'desktop' | 'tablet' | 'mobile', index: number, value: string): void {
    const values = [...(this.selected()?.responsiveColumns?.[device] ?? [24])];
    values[index] = Number(value); this.setResponsiveColumns(device, values);
  }

  gridColumns(node: PageNode): number {
    if (node.responsiveColumns?.desktop) return node.responsiveColumns.desktop.length;
    return node.styling?.['grid-template-columns']?.split(' ').filter(Boolean).length ?? 1;
  }

  setGridColumns(value: string): void {
    const count = Number(value);
    if (!this.gridSizes.includes(count)) return;
    this.setResponsiveColumns('desktop', Array(count).fill(1));
    if (!this.selected()?.styling?.['gap']) this.setStyle('gap', '16px');
  }

  constructor() {
    effect(() => {
      const serialized = JSON.stringify(this.nodes());
      if (serialized === this.historySnapshot) return;
      this.undoStack.update(stack => [...stack.slice(-49), this.historySnapshot]);
      this.historySnapshot = serialized;
    });
    this.load();
  }

  editable(): boolean {
    return !this.renameBusy() && !this.saving() && !this.creatingPage() && this.app()?.status === 'Draft' &&
      (this.auth.hasAnyRole(['SystemAdmin', 'TenantAdmin']) || !!this.auth.userId() && this.app()?.createdByUserId === this.auth.userId());
  }

  load(): void {
    forkJoin({
      app: this.api.designerApplication(this.tenantId, this.applicationId),
      pages: this.api.applicationScreens(this.tenantId, this.applicationId),
      menus: this.api.applicationMenuItems(this.tenantId, this.applicationId)
    }
    ).subscribe({
      next: data => {
        this.app.set(data.app);
        this.pages.set(data.pages);
        this.setApplicationMenus(data.menus);
        if (!this.current() && data.pages.length) this.selectPage(data.pages[0]);
      },
      error: () => this.error.set('Application could not be loaded.')
    });
  }

  async selectPage(page: BuilderDesignScreen): Promise<void> {
    if (this.renameBusy()) return;
    this.renamingPageId.set(null);
    this.pageEditPosition.set(null);
    if (this.saving() || this.creatingPage()) return;
    if (this.dirty && !await this.confirmation.confirm({ title: 'Discard page changes?', message: 'This page has unsaved changes. Discard them and switch pages?', confirmText: 'Discard changes', cancelText: 'Keep editing', tone: 'warning' })) return;
    this.sidebarPanel.set('elements');
    this.paletteTab.set('elements');
    this.current.set(page);
    this.selectedId.set(null);
    this.dirty = false;
    this.undoStack.set([]);
    try {
      this.nodes.set(page.definitionJson ? parsePageDefinition(page.definitionJson).children : page.formId && page.objectId ? [{ id: createClientId(), type: 'form', objectId: page.objectId, formId: page.formId }] : []);
      this.historySnapshot = JSON.stringify(this.nodes());
    }
    catch {
      this.nodes.set([]);
      this.historySnapshot = '[]';
      this.undoStack.set([]);
      this.error.set('This page definition is invalid.');
    }
  }

  selected(): PageNode | undefined { const find = (items: PageNode[]): PageNode | undefined => { for (const node of items) { if (node.id === this.selectedId()) return node; const child = find(node.children ?? []); if (child) return child; } return undefined; }; return find(this.nodes()); }

  selectionPath(id = this.selectedId()): PageNode[] {
    if (!id) return [];
    const find = (items: PageNode[], ancestors: PageNode[]): PageNode[] | undefined => {
      for (const node of items) {
        const path = [...ancestors, node];
        if (node.id === id) return path;
        const nested = find(node.children ?? [], path);
        if (nested) return nested;
      }
      return undefined;
    };
    return find(this.nodes(), []) ?? [];
  }

  isInlineEditable(node: PageNode): boolean { return ['text', 'heading', 'button'].includes(node.type); }

  beginInlineEdit(node: PageNode, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.editable() || !this.isInlineEditable(node)) return;
    const origin = event.currentTarget as HTMLElement;
    const target = origin.matches('[data-inline-edit-target]')
      ? origin
      : origin.closest('.node')?.querySelector<HTMLElement>('[data-inline-edit-target]');
    if (!target) return;
    this.selectedId.set(node.id);
    this.inlineEditOriginal = node.text ?? '';
    this.inlineEditingId.set(node.id);
    target.textContent = this.inlineEditOriginal;
    target.setAttribute('contenteditable', 'true');
    target.focus();
    const range = this.document.createRange();
    range.selectNodeContents(target);
    range.collapse(false);
    const selection = this.document.defaultView?.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  finishInlineEdit(node: PageNode, event: Event): void {
    if (this.inlineEditingId() !== node.id) return;
    const target = event.currentTarget as HTMLElement;
    const value = (target.innerText ?? target.textContent ?? '').replace(/\r/g, '').slice(0, 10_000);
    target.removeAttribute('contenteditable');
    if (value !== this.inlineEditOriginal) {
      node.text = value;
      this.nodes.update(items => [...items]);
      this.dirty = true;
    }
    this.inlineEditingId.set(null);
  }

  handleInlineEditKeydown(node: PageNode, event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      (event.currentTarget as HTMLElement).textContent = this.inlineEditOriginal;
      this.inlineEditingId.set(null);
      (event.currentTarget as HTMLElement).removeAttribute('contenteditable');
      return;
    }
    if (event.key === 'Enter' && (node.type !== 'text' || !event.shiftKey)) {
      event.preventDefault();
      (event.currentTarget as HTMLElement).blur();
    }
  }

  selectCanvasNode(id: string): void {
    this.selectedId.set(id);
    this.selectionActionsOpen.set(false);
  }

  selectCanvasParent(): void {
    const path = this.selectionPath();
    this.selectedId.set(path.length > 1 ? path[path.length - 2].id : null);
    this.selectionActionsOpen.set(false);
  }

  duplicateSelectedNode(): void {
    const id = this.selectedId();
    const siblings = id ? this.siblings(id) : undefined;
    const index = siblings?.findIndex(node => node.id === id) ?? -1;
    if (!this.editable() || !siblings || index < 0) return;
    const clone = JSON.parse(JSON.stringify(siblings[index])) as PageNode;
    const renewIds = (node: PageNode): void => {
      node.id = createClientId();
      node.children?.forEach(renewIds);
    };
    renewIds(clone);
    siblings.splice(index + 1, 0, clone);
    this.nodes.update(items => [...items]);
    this.selectedId.set(clone.id);
    this.selectionActionsOpen.set(false);
    this.dirty = true;
  }

  setChartDataLabels(node: PageNode, event: Event): void {
    if (!this.editable() || node.type !== 'chart') return;
    node.showDataLabels = (event.target as HTMLInputElement).checked;
    this.nodes.update(items => [...items]);
    this.dirty = true;
  }

  setChartLegendPosition(node: PageNode, value: string): void {
    if (!this.editable() || node.type !== 'chart' || !['', 'top', 'bottom', 'left', 'right'].includes(value)) return;
    node.legendPosition = value ? value as NonNullable<PageNode['legendPosition']> : undefined;
    this.nodes.update(items => [...items]);
    this.dirty = true;
  }

  isTreeExpanded(id: string): boolean { return !this.collapsedTreeNodes().has(id); }

  toggleTreeNode(id: string, event: Event): void {
    event.stopPropagation();
    this.collapsedTreeNodes.update(current => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  beginTreeRename(node: PageNode, event: Event): void {
    event.stopPropagation();
    if (!this.editable()) return;
    this.selectedId.set(node.id);
    this.editingNodeId.set(node.id);
  }

  finishTreeRename(node: PageNode, event: Event): void {
    event.stopPropagation();
    if (this.editingNodeId() !== node.id) return;
    const value = (event.target as HTMLInputElement).value.trim();
    if (value && value !== node.text) {
      node.text = value;
      this.nodes.update(items => [...items]);
      this.dirty = true;
    }
    this.editingNodeId.set(null);
  }

  cancelTreeRename(event: Event): void {
    event.stopPropagation();
    this.editingNodeId.set(null);
    (event.target as HTMLInputElement).blur();
  }

  canMoveTreeNode(id: string, offset: number): boolean {
    const items = this.siblings(id);
    if (!items) return false;
    const target = items.findIndex(item => item.id === id) + offset;
    return target >= 0 && target < items.length;
  }

  moveTreeNode(id: string, offset: number): void {
    if (!this.editable()) return;
    const items = this.siblings(id);
    if (!items) return;
    const index = items.findIndex(item => item.id === id);
    const target = index + offset;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    this.nodes.update(nodes => [...nodes]);
    this.selectedId.set(id);
    this.dirty = true;
  }

  removeTreeNode(id: string): void {
    if (!this.editable()) return;
    const remove = (items: PageNode[]): PageNode[] => items.filter(node => node.id !== id)
      .map(node => ({ ...node, children: node.children ? remove(node.children) : undefined }));
    this.nodes.set(remove(this.nodes()));
    if (this.selectedId() === id) this.selectedId.set(null);
    this.dirty = true;
  }

  isNavigationGroup(node: PageNode): boolean {
    if (node.type !== 'container' || node.presentation !== 'collapse') return false;
    const root = this.menuEditorRootFor(node.id);
    const contains = (item: PageNode, id: string): boolean => item.id === id || (item.children ?? []).some(child => contains(child, id));
    return !!root && node.id !== root.id && contains(root, node.id);
  }

  isNavigationItem(node: PageNode): boolean {
    if (node.type !== 'button') return false;
    const root = this.menuEditorRootFor(node.id);
    const contains = (item: PageNode, id: string): boolean => item.id === id || (item.children ?? []).some(child => contains(child, id));
    return !!root && contains(root, node.id);
  }

  menuEditorRoot(): PageNode | undefined {
    return this.menuEditorRootFor(this.selectedId());
  }

  private menuEditorRootFor(selectedId: string | null): PageNode | undefined {
    if (!selectedId) return undefined;
    const selected = this.selected();
    const contains = (node: PageNode, id: string = selectedId): boolean => node.id === id || (node.children ?? []).some(child => contains(child, id));
    const find = (items: PageNode[]): PageNode | undefined => {
      for (const item of items) {
        if (this.isNavigationRoot(item)
          && (contains(item) || !!selected && contains(selected) && contains(selected, item.id))) return item;
        const nested = find(item.children ?? []);
        if (nested) return nested;
      }
      return undefined;
    };
    return find(this.nodes());
  }

  isNavigationRoot(node: PageNode): boolean { return node.type === 'container' && node.text === 'Side navigation'; }
  navigationPlacement(nodes: readonly PageNode[]): 'left' | 'right' | 'top' | null {
    const navigation = nodes.find(node => this.isNavigationRoot(node));
    return navigation ? navigation.navigationPlacement ?? 'left' : null;
  }
  navigationLogo(node: PageNode): string { return node.navigationLogoUrl?.trim() || '/images/logo/small-logo.png'; }
  navigationBrand(node: PageNode): string { return node.children?.find(child => child.type === 'heading')?.text?.trim() || 'Application'; }
  navigationChildren(node: PageNode): PageNode[] {
    const children = node.children ?? [];
    return this.isNavigationRoot(node) && children[0]?.type === 'heading' ? children.slice(1) : children;
  }
  setNavigationPlacement(root: PageNode, value: string): void {
    if (!this.editable() || !this.isNavigationRoot(root) || !['left', 'right', 'top'].includes(value)) return;
    root.navigationPlacement = value as PageNode['navigationPlacement'];
    root.styling = { ...root.styling, display: value === 'top' ? 'flex' : 'grid', width: '100%', ...(value === 'top' ? { 'min-height': '64px' } : { 'min-height': '100vh' }) };
    this.nodes.update(items => [...items]); this.dirty = true;
  }
  setNavigationLogo(root: PageNode, value: string): void {
    if (!this.editable() || !this.isNavigationRoot(root)) return;
    const logo = value.trim();
    let safeRemote = false;
    try { const url = new URL(logo); safeRemote = url.protocol === 'https:' && !!url.hostname && !url.username && !url.password; } catch { /* local asset path */ }
    if (logo && !(logo.startsWith('/') && !logo.startsWith('//') && !logo.includes('\\') || safeRemote)) {
      this.error.set('Use a secure HTTPS URL or a local /assets/ path for the company logo.'); return;
    }
    root.navigationLogoUrl = logo || undefined;
    this.error.set(''); this.nodes.update(items => [...items]); this.dirty = true;
  }

  menuGroups(root: PageNode): PageNode[] { return (root.children ?? []).filter(node => this.isNavigationGroup(node)); }
  menuItems(group: PageNode): PageNode[] { return (group.children ?? []).filter(node => node.type === 'button'); }
  menuSubgroups(group: PageNode): PageNode[] { return (group.children ?? []).filter(node => this.isNavigationGroup(node)); }

  addMenuGroup(): void {
    const root = this.menuEditorRoot(); if (!this.editable() || !root) return;
    const group: PageNode = { id: createClientId(), type: 'container', presentation: 'collapse', text: 'New group', children: [] };
    root.children = [...root.children ?? [], group]; this.nodes.update(items => [...items]); this.selectedId.set(group.id); this.dirty = true;
  }

  addMenuItem(groupId?: string): void {
    const root = this.menuEditorRoot();
    const find = (items: PageNode[]): PageNode | undefined => items.find(item => item.id === groupId) ?? items.map(item => find(item.children ?? [])).find(Boolean);
    const selected = this.selected();
    const group = root && groupId ? find([root])
      : selected && this.isNavigationGroup(selected) ? selected
        : this.menuGroups(root ?? { id: '', type: 'container' })[0];
    if (!this.editable() || !group || !this.isNavigationGroup(group)) return;
    const page = this.pages()[0];
    const item: PageNode = { id: createClientId(), type: 'button', text: page?.title ?? 'New menu item', pageKey: page?.key };
    group.children = [...group.children ?? [], item]; this.nodes.update(items => [...items]); this.selectedId.set(item.id); this.dirty = true;
  }

  addMenuSubgroup(parentId: string): void {
    const root = this.menuEditorRoot();
    const find = (items: PageNode[]): PageNode | undefined => items.find(item => item.id === parentId) ?? items.map(item => find(item.children ?? [])).find(Boolean);
    const parent = root && find([root]);
    if (!this.editable() || !parent || !this.isNavigationGroup(parent)) return;
    const group: PageNode = { id: createClientId(), type: 'container', presentation: 'collapse', text: 'New submenu', children: [] };
    parent.children = [...parent.children ?? [], group]; this.nodes.update(items => [...items]); this.selectedId.set(group.id); this.dirty = true;
  }

  updateMenuText(node: PageNode, value: string): void {
    if (!this.editable()) return;
    node.text = value.trim() || (node.type === 'button' ? 'Menu item' : 'Menu group');
    this.nodes.update(items => [...items]); this.dirty = true;
  }

  updateMenuPage(node: PageNode, pageKey: string): void {
    if (!this.editable() || !this.isNavigationItem(node)) return;
    node.actionType = 'page';
    node.actionValue = pageKey;
    node.pageKey = undefined;
    this.nodes.update(items => [...items]); this.dirty = true;
  }

  removeMenuNode(node: PageNode): void {
    if (!this.editable()) return;
    const remove = (items: PageNode[]): PageNode[] => items.filter(item => item.id !== node.id).map(item => ({ ...item, children: item.children ? remove(item.children) : undefined }));
    this.nodes.set(remove(this.nodes()));
    if (this.selectedId() === node.id) this.selectedId.set(null);
    this.dirty = true;
  }

  containers(): PageNode[] {
    const visit = (items: PageNode[]): PageNode[] => items.flatMap(item => [...(item.type === 'container' ? [item] : []), ...visit(item.children ?? [])]);
    const selected = this.selected();
    const contains = (node: PageNode, id: string): boolean => node.id === id || !!node.children?.some(child => contains(child, id));
    return visit(this.nodes()).filter(item => !selected || !contains(selected, item.id));
  }

  moveSelectedTo(containerId: string): void {
    const id = this.selectedId(); if (!id || !this.editable()) return;
    const parent = containerId ? this.containers().find(item => item.id === containerId) : undefined;
    if (containerId && !parent) return;
    this.reparent(id, parent);
  }

  addNode(type: string, parent?: PageNode, root = false): void {
    if (!this.editable() || !this.current()) return;
    const pages = this.pages().map(page => ({ key: page.key, title: page.title }));
    const node = type === 'app-sidenav' ? createSideNavigation(pages) : createPageBlock(type);
    if (type === 'app-layout' && node.children?.[1]?.children?.[0]) node.children[1].children[0] = createSideNavigation(pages);
    const target = root ? undefined : parent ?? this.selected();
    if (target?.type === 'container') (target.children ??= []).push(node);
    else this.nodes.update(items => [...items, node]);
    this.nodes.update(items => [...items]); this.selectedId.set(node.id); this.dirty = true;
  }

  drag(event: DragEvent, type: string): void { event.dataTransfer?.setData('application/antsoft-block', type); }

  drop(event: DragEvent, parent?: PageNode): void { event.preventDefault(); event.stopPropagation(); const type = event.dataTransfer?.getData('application/antsoft-block'); const moving = event.dataTransfer?.getData('application/antsoft-node'); if (moving) { this.reparent(moving, parent); return; } if (this.blocks.some(block => block.key === type)) this.addNode(type!, parent, !parent); }

  updateText(text: string): void {
    if (!this.editable()) return;
    const node = this.selected();
    if (node) { node.text = text; this.nodes.update(items => [...items]); this.dirty = true; }
  }

  bindForm(id: string): void {
    if (!this.editable()) return;
    const node = this.selected(); const form = this.availableForms().find(item => item.id === id);
    const obj = form ? this.app()?.objects.find(item => item.id === form.objectId) : undefined;
    if (node) {
      node.formId = form?.id; node.objectId = form?.objectId;
      if (node.type === 'crud') {
        node.tableColumns = obj?.fields.slice(0, 8).map(field => ({ field: field.key, title: field.label, align: 'left', format: 'text' }));
        node.columns = node.tableColumns?.map(column => column.field);
      }
      this.nodes.update(items => [...items]);
      this.dirty = true;
    }
  }

  removeNode(): void {
    if (!this.editable()) return;
    const remove = (items: PageNode[]): PageNode[] => items.filter(node => node.id !== this.selectedId()).map(node => ({ ...node, children: node.children ? remove(node.children) : undefined }));
    this.nodes.set(remove(this.nodes()));
    this.selectedId.set(null);
    this.selectionActionsOpen.set(false);
    this.dirty = true;
  }

  beginNewPage(): void {
    if (!this.editable()) return;
    this.newPageError.set('');
    this.newPageOpen.set(true);
  }

  cancelNewPage(): void {
    if (this.creatingPage() || this.saving()) return;
    this.newPageOpen.set(false); this.newPageError.set(''); this.newPageButton()?.nativeElement.focus();
  }

  addPage(title: string): void {
    if (!this.editable() || this.creatingPage() || !title.trim() || title.trim().length > 100) return;
    this.newPageError.set('');
    const definitionJson = JSON.stringify({ schemaVersion: 1, children: [createPageBlock('data-grid')] });
    const create = () => {
      this.creatingPage.set(true);
      this.api.createApplicationScreen(this.applicationId, {
        tenantId: this.tenantId, key: `page-${createClientId()}`,
        title: title.trim(), htmlContent: ''
      }
      ).subscribe({
        next: page => {
          this.api.savePageDefinition(this.applicationId, page.id, this.tenantId, definitionJson).subscribe({
            next: () => void this.finishNewPage(page, definitionJson),
            error: response => void this.finishNewPage(page, definitionJson,
              response?.error?.detail ?? 'Page created, but its default DataGrid could not be saved. Save the page again to keep it.')
          });
        },
        error: response => {
          this.creatingPage.set(false);
          this.newPageError.set(response?.error?.detail ?? 'Page could not be created. Try again.');
        }
      });
    };
    // Preserve canvas edits before moving to the new page.
    if (this.dirty) this.save(create); else create();
  }

  private async finishNewPage(page: BuilderDesignScreen, definitionJson: string, saveError?: string): Promise<void> {
    page.definitionJson = definitionJson;
    this.pages.update(items => [...items, page]);
    this.refreshApplicationMenus();
    this.creatingPage.set(false);
    await this.selectPage(page);
    this.cancelNewPage();
    if (saveError) {
      this.dirty = true;
      this.error.set(saveError);
    } else {
      this.notice.set('Page created with a DataGrid.');
    }
  }

  save(afterSave?: () => void): void {
    const page = this.current();
    if (!page || !this.editable() || this.saving()) return;
    this.error.set('');
    const json = JSON.stringify({
      schemaVersion: 1,
      children: this.nodes()
    });

    this.saving.set(true);
    this.api.savePageDefinition(this.applicationId, page.id, this.tenantId, json)
      .subscribe({
        next: () => {
          page.definitionJson = json;
          this.dirty = false;
          this.saving.set(false);

          // this.notice.set('Page tree saved.');
          afterSave?.();
        },
        error: response => {
          this.saving.set(false);
          this.error.set(response?.error?.detail ?? 'Page could not be saved. Check its form bindings.');
        }
      });
  }

  nodeStyle(node: PageNode): Record<string, string> {
    return { ...sanitizeElementStyle(node.styling), ...responsiveNodeStyle(node) };
  }

  setProperty(
    key: 'imageUrl' | 'pageKey' | 'objectId' | 'chartKind' |
      'valueField' | 'secondaryValueField' | 'titleField' | 'legendPosition' |
      'imageField' | 'targetNodeId' | 'calendarTitleField' | 'calendarStartField' | 'calendarEndField', value: string): void {

    if (!this.editable()) return;
    const node = this.selected(); if (!node) return;

    if (key === 'chartKind') {
      if (!['bar', 'line', 'area', 'time-area', 'bar-line', 'pie', 'doughnut', 'funnel'].includes(value)) return;
      node.chartKind = value as PageNode['chartKind'];
    } else if (key === 'legendPosition') {
      if (!['', 'top', 'bottom', 'left', 'right'].includes(value)) return;
      node.legendPosition = value ? value as NonNullable<PageNode['legendPosition']> : undefined;
    } else node[key] = value || undefined;

    if (key === 'objectId' && (node.type === 'chart' || node.type === 'kanban')) {
      node.columns = undefined;
      node.valueField = undefined;
      node.secondaryValueField = undefined;
      node.titleField = undefined;
    }

    if (key === 'objectId' && node.type === 'gallery') {
      node.tableJson = undefined;
      node.imageField = undefined;
      node.titleField = undefined;
    }

    if (key === 'objectId' && node.type === 'pivot-table') {
      node.pivotRows = undefined;
      node.pivotColumns = undefined;
      node.pivotValues = undefined;
    }

    if (key === 'objectId' && node.type === 'calendar') {
      node.calendarTitleField = undefined;
      const fields = this.app()?.objects.find(object => object.id === value)?.fields ?? [];
      node.calendarTitleField = fields.find(field => /title|name|subject/i.test(`${field.key} ${field.label}`))?.key;
      node.calendarStartField = fields.find(field => field.type === 'Date' || field.type === 'DateTime')?.key;
      node.calendarEndField = undefined;
    }

    if (key === 'objectId' && (node.type === 'table' || node.type === 'data-grid')) {
      node.tableJson = undefined;
      const fields = this.app()?.objects.find(object => object.id === value)?.fields ?? [];
      node.tableColumns = fields.slice(0, 8).map(field => ({ field: field.key, title: field.label, align: 'left', format: 'text' }));
      node.columns = node.tableColumns.map(column => column.field);
    }

    this.nodes.update(items => this.replaceNode(items, node.id, { ...node })); this.dirty = true;

  }

  private replaceNode(nodes: PageNode[], id: string, replacement: PageNode): PageNode[] {
    let changed = false;
    const next = nodes.map(node => {
      if (node.id === id) { changed = true; return replacement; }
      if (!node.children?.length) return node;
      const children = this.replaceNode(node.children, id, replacement);
      if (children === node.children) return node;
      changed = true;
      return { ...node, children };
    });
    return changed ? next : nodes;
  }

  setColumns(value: string): void {
    const node = this.selected();
    if (!node || !this.editable()) return;
    node.columns = value.split(',').map(value => value.trim()).filter(Boolean);
    this.nodes.update(items => [...items]); this.dirty = true;
  }

  setStyle(key: string, value: string): void {
    const node = this.selected();
    if (!node || !this.editable()) return;
    if (value && !CSS.supports(key, value)) {
      this.error.set('Invalid CSS value.'); return;
    }

    const style = { ...node.styling };
    if (value) style[key] = value;
    else delete style[key];
    node.styling = sanitizeElementStyle(style); this.nodes.update(items => [...items]);
    this.dirty = true;
  }

  dragNode(event: DragEvent, node: PageNode): void {
    event.stopPropagation();
    if (this.inlineEditingId() === node.id || (event.target as HTMLElement | null)?.closest?.('[contenteditable="true"]')) {
      event.preventDefault();
      return;
    }
    if (this.editable()) event.dataTransfer?.setData('application/antsoft-node', node.id);
  }

  private siblings(id: string, items = this.nodes()): PageNode[] | undefined {
    if (items.some(item => item.id === id)) return items;
    for (const item of items) {
      const found = this.siblings(id, item.children ?? []);
      if (found) return found;
    } return undefined;
  }

  moveNode(offset: number): void {
    if (!this.editable()) return;
    const id = this.selectedId();
    if (!id) return;
    const items = this.siblings(id);
    if (!items) return;
    const index = items.findIndex(item => item.id === id);
    const target = index + offset; if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    this.nodes.update(nodes => [...nodes]); this.dirty = true;
  }

  reparent(id: string, parent?: PageNode): void {
    if (!this.editable() || parent && parent.type !== 'container') return;
    const items = this.siblings(id);
    const node = items?.find(node => node.id === id);
    if (!items || !node) return;
    const contains = (item: PageNode): boolean => item.id === parent?.id || (item.children ?? []).some(contains);
    if (parent && contains(node)) {
      this.error.set('A component cannot contain itself or an ancestor.');
      return;
    }

    items.splice(items.indexOf(node), 1);
    if (parent) (parent.children ??= []).push(node);
    else this.nodes().push(node); this.nodes.update(nodes => [...nodes]);
    this.dirty = true;
  }

  openForm(node: PageNode): void {
    const navigate = () => {
      void this.router.navigate(['/builder/applications', this.applicationId, 'forms'],
        {
          queryParams: { tenantId: this.tenantId, pageId: this.current()?.id, objectId: node.objectId, pageNodeId: node.id }
        });
    };
    if (this.dirty) this.save(navigate); else navigate();
  }

  async canLeave(): Promise<boolean> {
    if (this.renameBusy() || this.saving() || this.creatingPage()) return false;
    if (!this.dirty) return true;
    return this.confirmation.confirm({ title: 'Discard page changes?', message: 'This page has unsaved changes. Leave the designer and discard them?', confirmText: 'Discard changes', cancelText: 'Stay on page', tone: 'warning' });
  }

}
