import { TranslocoPipe } from '@jsverse/transloco';
import { parsePageDefinition } from '@core/builders/page-definition';
import { composePreviewPage, containsNavigation } from '@core/builders/preview-navigation-layout';
import { runtimeNavigationTree, runtimeNavigationGroupIds, RuntimeMenuNode } from '@core/builders/runtime-navigation';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { faBars, faChevronDown, faChevronLeft, faChevronRight, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import * as solidIcons from '@fortawesome/free-solid-svg-icons';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, Subscription } from 'rxjs';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { BuildersApiService, BuilderApplicationScreen, PublishedApplication, PublishedUiResult, UserFavouriteLink } from '@core/builders/builders-api.service';
import { BuilderRecord } from '@core/builders/interfaces/builder-record';
import { AuthService } from '@core/services/auth/auth.service';
import { RuntimeFormComponent } from '../runtime-form/runtime-form.component';
import { RuntimeFormDefinition } from '@core/builders/interfaces/runtime-form-definition';
import { PageTreeRuntimeComponent, RuntimePageNode } from './page-tree-runtime/page-tree-runtime.component';

interface ApplicationShell {
  brand: string; logoUrl: string; profileName: string; profileRole: string; language: string;
  showSearch: boolean; showMegaMenu: boolean; showNotifications: boolean; showSettings: boolean; showThemeToggle: boolean;
  themeMode: 'light' | 'dark'; sidebarCollapsed: boolean; sidebarPosition: 'left' | 'right'; sidebarWidth: number;
  headerPosition: 'top' | 'bottom'; headerHeight: number; sidebarBackground: string; sidebarTextColor: string;
  headerBackground: string; headerTextColor: string;
}
interface Theme {
  primaryColor: string; backgroundColor: string; surfaceColor: string; textColor: string; logoUrl: string;
  fontScale: number; fontFamily: string; fontSize: number; shell?: Partial<ApplicationShell>;
}

@Component({
  selector: 'ant-template-screen',
  templateUrl: './template-screen.component.html',
  styleUrl: './template-screen.component.scss',
  imports: [TranslocoPipe, RouterLink, RuntimeFormComponent, PageTreeRuntimeComponent, FontAwesomeModule, NgTemplateOutlet, FormsModule, DecimalPipe],

})
export class TemplateScreenComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(BuildersApiService);
  private readonly auth = inject(AuthService);
  readonly collapsed = signal(false);
  readonly shellIcons = { menu: faBars, collapse: faChevronLeft, expand: faChevronDown, expandCollapsed: faChevronRight, fallback: faLayerGroup };
  menuChildrenId(id: string): string { return `runtime-menu-children-${id.replace(/[^a-zA-Z0-9_-]/g, '-')}`; }
  readonly version = signal('');
  readonly userName = this.auth.displayName;
  menuIcon(value?: string | null): IconDefinition {
    const name = value?.match(/^\['fas','([a-z0-9-]+)'\]$/)?.[1] ?? value?.replace(/^fa-/, '');
    return Object.values(solidIcons).find((icon): icon is IconDefinition =>
      !!icon && typeof icon === 'object' && 'iconName' in icon && icon.iconName === name) ?? faLayerGroup;
  }
  toggleMenu(id: string): void {
    if (this.collapsed()) {
      this.collapsed.set(false);
      this.expandedMenuIds.update(expanded => new Set(expanded).add(id));
      return;
    }
    this.expandedMenuIds.update(expanded => {
      const next = new Set(expanded);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  isCurrentRoute(route: string | null): boolean { return !!route && route.endsWith('/' + this.screen()?.key); }
  private menuRoutes(node: RuntimeMenuNode): PublishedApplication['Menus'] {
    return [...(node.item.Route ? [node.item] : []), ...node.children.flatMap(child => this.menuRoutes(child))];
  }
  applicationId = this.route.snapshot.paramMap.get('id') ?? '';
  tenantId = this.route.snapshot.queryParamMap.get('tenantId') ?? localStorage.getItem('tenantId') ?? localStorage.getItem('companyId') ?? '';
  private pageSubscription?: Subscription;
  private recordsSubscription?: Subscription;
  readonly screen = signal<BuilderApplicationScreen | null>(null);
  readonly records = signal<BuilderRecord[]>([]);
  readonly formDefinition = signal<RuntimeFormDefinition | null>(null);
  readonly recordCreateAllowed = signal(false);
  readonly entryDialogOpen = signal(false);
  readonly pageNodes = signal<RuntimePageNode[] | null>(null);
  readonly authoredShell = signal(false);
  readonly embeddedNavigation = signal(false);
  readonly pageForms = signal<Record<string, RuntimeFormDefinition>>({});
  readonly navigation = signal<PublishedApplication['Menus']>([]);
  readonly navigationTree = signal<RuntimeMenuNode[]>([]);
  readonly expandedMenuIds = signal<ReadonlySet<string>>(new Set());
  readonly availablePages = signal<Array<{ key: string; title: string }>>([]);
  readonly introHtml = signal('');
  readonly error = signal('');
  readonly assistantOpen = signal(false);
  readonly assistantPrompt = signal('');
  readonly assistantBusy = signal(false);
  readonly assistantError = signal('');
  readonly generatedUi = signal<PublishedUiResult | null>(null);
  readonly favouriteName = signal('');
  readonly favourites = signal<UserFavouriteLink[]>([]);
  readonly favouritesBusy = signal(false);
  readonly draftPreview = signal(false);
  readonly theme = signal<Theme>({ primaryColor: '#5e4fa2', backgroundColor: '#f2f2f2', surfaceColor: '#ffffff', textColor: '#1f2937', logoUrl: '', fontScale: 1, fontFamily: 'Inter, Arial, sans-serif', fontSize: 16 });

  constructor() {
    combineLatest([this.route.paramMap, this.route.queryParamMap]).pipe(takeUntilDestroyed()).subscribe(([params, query]) => {
      this.applicationId = params.get('id') ?? ''; this.tenantId = query.get('tenantId') ?? this.auth.tenantId() ?? '';
      this.draftPreview.set(query.get('preview') === 'draft');
      this.loadPage(params.get('screenKey') ?? '');
    });
  }
  ngOnDestroy(): void { this.pageSubscription?.unsubscribe(); this.recordsSubscription?.unsubscribe(); }
  private loadPage(key: string): void {
    this.pageSubscription?.unsubscribe(); this.recordsSubscription?.unsubscribe();
    this.screen.set(null); this.records.set([]); this.pageNodes.set(null); this.authoredShell.set(false); this.embeddedNavigation.set(false); this.formDefinition.set(null); this.recordCreateAllowed.set(false); this.entryDialogOpen.set(false); this.error.set(''); this.navigation.set([]); this.navigationTree.set([]); this.expandedMenuIds.set(new Set()); this.availablePages.set([]);
    this.introHtml.set(''); this.version.set(''); this.pageForms.set({});
    this.theme.set({ primaryColor: '#5e4fa2', backgroundColor: '#f2f2f2', surfaceColor: '#ffffff', textColor: '#1f2937', logoUrl: '', fontScale: 1, fontFamily: 'Inter, Arial, sans-serif', fontSize: 16 });
    if (!this.tenantId || !this.applicationId || !key) { this.error.set('Application context is missing.'); return; }
    const source = this.draftPreview() ? this.api.draftPreview(this.tenantId, this.applicationId) : this.api.publishedApplication(this.tenantId, this.applicationId);
    this.pageSubscription = source.subscribe({
      next: bundle => {
        const publishedScreen = bundle.Screens?.find(screen => screen.Key === key);
        const selectedModuleId = this.route.snapshot.queryParamMap.get('moduleId');
        const module = bundle.Modules?.find(module => module.ScreenId === publishedScreen?.Id && (!selectedModuleId || module.Id === selectedModuleId));
        const form = bundle.Forms?.find(form => form.Id === (publishedScreen?.FormId ?? module?.FormId));
        const obj = bundle.Objects?.find(obj => obj.Id === (publishedScreen?.ObjectId ?? module?.ObjectId));
        if (!publishedScreen) { this.error.set('This page has no published design.'); return; }
        const menu = runtimeNavigationTree(bundle, this.applicationId, this.auth.session()?.permissions ?? [], this.auth.hasAnyRole(['SystemAdmin', 'TenantAdmin']));
        this.navigationTree.set(menu);
        this.navigation.set(menu.flatMap(item => this.menuRoutes(item)));
        this.expandedMenuIds.set(new Set(runtimeNavigationGroupIds(menu)));
        const visibleRoutes = new Set(this.navigation().map(item => item.Route));
        this.availablePages.set((bundle.Screens ?? []).filter(page => visibleRoutes.has(`/builder/applications/${this.applicationId}/screens/${page.Key}`))
          .map(page => ({ key: page.Key, title: page.Title })));
        this.version.set(bundle.PublishedVersion ?? '');
        const definitions: Record<string, RuntimeFormDefinition> = {};
        for (const definition of bundle.Forms ?? []) {
          const object = bundle.Objects.find(object => object.Id === definition.ObjectId);
          if (object) definitions[definition.Id] = { formId: definition.Id, objectId: definition.ObjectId, key: definition.Key, name: definition.Name, layoutJson: definition.LayoutJson,
            fields: object.Fields.map(field => ({ key: field.Key, label: field.Label, type: field.Type, sortOrder: field.SortOrder, required: field.Required, readOnly: field.ReadOnly, configurationJson: field.ConfigurationJson })) };
        }
        this.pageForms.set(definitions);
        if (publishedScreen.DefinitionJson) {
          try {
            const content = parsePageDefinition(publishedScreen.DefinitionJson).children;
            const shellScreen = bundle.Screens.find(page => page.DefinitionJson?.includes('Side navigation'));
            const shell = shellScreen?.DefinitionJson ? parsePageDefinition(shellScreen.DefinitionJson).children : [];
            const authoredShell = content.some(node => node.shellRole === 'application-shell' || this.isLegacyAuthoredShell(node));
            this.authoredShell.set(authoredShell);
            this.embeddedNavigation.set(authoredShell || shell.some(containsNavigation));
            this.pageNodes.set(!authoredShell && shell.some(containsNavigation) ? composePreviewPage(shell, content) : content);
          } catch { this.error.set('Invalid or unsupported page definition.'); return; }
        }
        const screen: BuilderApplicationScreen = { id: publishedScreen.Id, key: publishedScreen.Key, title: publishedScreen.Title,
          htmlContent: publishedScreen.HtmlContent, objectId: publishedScreen.ObjectId, formKey: form?.Key ?? null, applicationName: bundle.Name, themeJson: bundle.ThemeJson };
        if (form && obj) this.formDefinition.set({ formId: form.Id, objectId: obj.Id, key: form.Key, name: form.Name, layoutJson: form.LayoutJson,
          fields: obj.Fields.map(field => ({ key: field.Key, label: field.Label, type: field.Type, sortOrder: field.SortOrder,
            required: field.Required, readOnly: field.ReadOnly, configurationJson: field.ConfigurationJson })) });
        this.screen.set(screen);
        if (screen.objectId && !this.draftPreview()) this.api.recordCapabilities(this.tenantId, screen.objectId).subscribe({
          next: capabilities => this.recordCreateAllowed.set(capabilities.create),
          error: () => this.recordCreateAllowed.set(false)
        });
        if (screen.themeJson) {
          try { this.theme.update(theme => ({ ...theme, ...JSON.parse(screen.themeJson!) })); } catch { /* use defaults */ }
        }
        this.updateIntro();
        if (screen.objectId && !this.pageNodes()) this.recordsSubscription = this.api.records(this.tenantId, screen.objectId).subscribe({
          next: records => { this.records.set(records); this.updateIntro(); },
          error: () => this.error.set('Records could not be loaded. Check access to this application.')
        });
      },
      error: () => this.error.set(this.draftPreview() ? 'preview.loadError' : 'This published application could not be loaded. Complete and publish the application, then check your access.')
    });
  }

  entries(record: BuilderRecord): [string, string][] {
    try {
      return Object.entries(JSON.parse(record.dataJson) as Record<string, unknown>)
        .filter(([key]) => !key.startsWith('_')).map(([key, value]) => [key, String(value ?? '')]);
    }
    catch { return []; }
  }

  openEntryDialog(): void { if (this.formDefinition() && this.screen()?.objectId && (this.draftPreview() || this.recordCreateAllowed())) this.entryDialogOpen.set(true); }
  closeEntryDialog(): void { this.entryDialogOpen.set(false); }
  saveListRecord(record: BuilderRecord): void {
    this.entryDialogOpen.set(false);
    this.records.update(records => [record, ...records.filter(existing => existing.id !== record.id)]);
    this.updateIntro();
  }

  shell(): ApplicationShell {
    return {
      brand: this.screen()?.applicationName ?? 'Application',
      profileName: this.userName() || 'User', profileRole: 'Member', language: 'EN',
      showSearch: true, showMegaMenu: false, showNotifications: true, showSettings: true, showThemeToggle: true,
      themeMode: 'light', sidebarCollapsed: this.collapsed(), sidebarPosition: 'left', sidebarWidth: 224,
      headerPosition: 'top', headerHeight: 64, sidebarBackground: '#ffffff', sidebarTextColor: '#253044',
      headerBackground: '#ffffff', headerTextColor: '#253044', ...this.theme().shell,
      logoUrl: this.theme().shell?.logoUrl ?? this.theme().logoUrl
    };
  }

  private updateIntro(): void {
    const screen = this.screen(); if (!screen) return;
    const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    this.introHtml.set(screen.htmlContent.replaceAll('{{application.name}}', escape(screen.applicationName))
      .replaceAll('{{records.count}}', String(this.records().length)));
  }

  togglePublishedAssistant(): void {
    if (this.draftPreview()) return;
    this.assistantOpen.update(open => !open);
    this.assistantError.set('');
    if (this.assistantOpen()) this.loadFavourites();
  }

  generatePublishedUi(): void {
    const prompt = this.assistantPrompt().trim();
    if (!prompt || this.assistantBusy()) return;
    this.assistantBusy.set(true); this.assistantError.set(''); this.generatedUi.set(null);
    this.api.generatePublishedUi(this.applicationId, prompt).subscribe({
      next: result => { this.generatedUi.set(result); this.favouriteName.set(result.specification.answer.slice(0, 80) || 'My view'); this.assistantBusy.set(false); },
      error: error => { this.assistantError.set(error?.error?.detail ?? 'Could not generate this view. Check AI settings and your application access.'); this.assistantBusy.set(false); }
    });
  }

  loadFavourites(): void {
    if (!this.applicationId || this.draftPreview()) return;
    this.favouritesBusy.set(true);
    this.api.userFavouriteLinks(this.applicationId).subscribe({
      next: favourites => { this.favourites.set(favourites); this.favouritesBusy.set(false); },
      error: () => { this.favourites.set([]); this.favouritesBusy.set(false); }
    });
  }

  openFavourite(item: UserFavouriteLink): void {
    this.assistantBusy.set(true); this.assistantError.set('');
    this.api.openUserFavourite(this.applicationId, item.id).subscribe({
      next: result => { this.generatedUi.set(result); this.favouriteName.set(result.name ?? item.name); this.assistantBusy.set(false);
        if (result.versionChanged) this.assistantError.set('This favourite was revalidated against a newer published version.'); },
      error: error => { this.generatedUi.set(null); this.assistantError.set(error?.error?.detail ?? 'This favourite is no longer compatible with your access or the published application.'); this.assistantBusy.set(false); }
    });
  }

  saveFavourite(): void {
    const result = this.generatedUi(); const name = this.favouriteName().trim();
    if (!result || !name) return;
    this.favouritesBusy.set(true);
    this.api.saveUserFavourite(this.applicationId, name, result.specification, result.id).subscribe({
      next: saved => { this.generatedUi.update(current => current ? { ...current, id: saved.id, name: saved.name } : current); this.loadFavourites(); this.favouritesBusy.set(false); },
      error: error => { this.assistantError.set(error?.error?.detail ?? 'Could not save this favourite.'); this.favouritesBusy.set(false); }
    });
  }

  deleteFavourite(item: UserFavouriteLink): void {
    this.api.deleteUserFavourite(this.applicationId, item.id).subscribe({ next: () => this.loadFavourites(),
      error: () => this.assistantError.set('Could not remove this favourite.') });
  }

  chartWidth(value: number, groups: Array<{ label: string; value: number }> = []): number {
    const maximum = Math.max(1, ...groups.map(group => group.value));
    return Math.max(4, Math.min(100, value / maximum * 100));
  }

  private isLegacyAuthoredShell(node: RuntimePageNode): boolean {
    const children = node.children ?? [];
    const sidebar = children[0];
    const main = children[1];
    return node.type === 'container' && !!node.responsiveColumns && children.length === 2 &&
      sidebar?.type === 'container' && sidebar.children?.some(child => child.type === 'heading') === true &&
      main?.type === 'container' && main.children?.length === 2 &&
      main.children[0].type === 'container' && main.children[1].type === 'container';
  }
}
