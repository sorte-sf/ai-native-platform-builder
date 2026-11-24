import { TranslocoModule, TranslocoPipe } from '@jsverse/transloco';
import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import * as solidIcons from '@fortawesome/free-solid-svg-icons';
import { faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, switchMap, tap } from 'rxjs';
import { AuthService } from '@core/services/auth/auth.service';
import { BuilderDesignScreen, BuildersApiService } from '@core/builders/builders-api.service';
import { DesignerApplication } from '@core/builders/interfaces/designer-application';
import { BrandColorPickerComponent } from '@shared/components/brand-color-picker.component';
import { ConfirmationService } from '@shared/confirmation/confirmation.service';
import { parsePageDefinition } from '@core/builders/page-definition';
import type { PageNode } from '@core/builders/page-blocks';
import { PageTreeRuntimeComponent } from '../template-screen/page-tree-runtime/page-tree-runtime.component';
import { BuilderMenuItem } from '@core/builders/interfaces/builder-menuItem';

type Viewport = 'web' | 'tablet' | 'mobile';
interface Theme { primaryColor: string; backgroundColor: string; surfaceColor: string; textColor: string; logoUrl: string; fontScale: number; }
interface PreviewMenuNode { item: BuilderMenuItem; children: PreviewMenuNode[]; }

@Component({
  selector: 'ant-application-design',
  standalone: true,
  templateUrl: './application-design.component.html',
  styleUrl: './application-design.component.scss',
  imports: [TranslocoModule, RouterLink, BrandColorPickerComponent, PageTreeRuntimeComponent, NgTemplateOutlet, FontAwesomeModule],

})
export class ApplicationDesignComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(BuildersApiService);
  private readonly auth = inject(AuthService);
  private readonly confirmation = inject(ConfirmationService);
  private frame: HTMLIFrameElement | null = null;

  @ViewChild('previewFrame') set previewFrame(value: ElementRef<HTMLIFrameElement> | undefined) {
    this.frame = value?.nativeElement ?? null;
    this.renderPreview();
  }

  readonly applicationId = this.route.snapshot.paramMap.get('id') ?? '';
  readonly tenantId = this.route.snapshot.queryParamMap.get('tenantId') ?? this.auth.tenantId() ?? '';
  readonly application = signal<DesignerApplication | null>(null);
  readonly previewUserName = this.auth.displayName;
  readonly screens = signal<BuilderDesignScreen[]>([]);
  readonly navigation = signal<PreviewMenuNode[]>([]);
  readonly currentScreen = signal<BuilderDesignScreen | null>(null);
  readonly pageNodes = signal<PageNode[]>([]);
  readonly previewNodes = signal<PageNode[]>([]);
  readonly previewTitle = signal('');
  readonly previewKey = signal('');
  readonly definitionPreview = signal(false);
  readonly title = signal('');
  readonly key = signal('');
  readonly html = signal('');
  readonly theme = signal<Theme>({ primaryColor: '#5e4fa2', backgroundColor: '#f2f2f2', surfaceColor: '#ffffff', textColor: '#1f2937', logoUrl: '', fontScale: 1 });
  readonly viewport = signal<Viewport>('web');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly dirty = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  menuIcon(value?: string | null): IconDefinition {
    const name = value?.match(/^\['fas','([a-z0-9-]+)'\]$/)?.[1] ?? value?.replace(/^fa-/, '');
    return Object.values(solidIcons).find((icon): icon is IconDefinition =>
      !!icon && typeof icon === 'object' && 'iconName' in icon && icon.iconName === name) ?? faLayerGroup;
  }

  constructor() {
    if (!this.applicationId || !this.tenantId) {
      this.error.set('Application or tenant context is missing. Open the designer from an application card.');
      this.loading.set(false);
      return;
    }
    this.load();
  }

  get readOnly(): boolean {
    return this.application()?.status !== 'Draft' || !this.auth.hasAnyRole(['SystemAdmin', 'TenantAdmin', 'Developer']);
  }

  load(): void {
    this.loading.set(true);
    forkJoin({
      application: this.api.designerApplication(this.tenantId, this.applicationId),
      screens: this.api.applicationScreens(this.tenantId, this.applicationId),
      menus: this.api.applicationMenuItems(this.tenantId, this.applicationId)
    }).subscribe({
      next: ({ application, screens, menus }) => {
        this.application.set(application);
        this.screens.set(screens);
        this.navigation.set(this.buildNavigation(menus));
        if (screens.length) this.selectScreen(screens[0]);
        else this.newScreen();
        this.loading.set(false);
      },
      error: response => {
        this.error.set(response?.error?.detail ?? 'Could not load the application design. Check access and try again.');
        this.loading.set(false);
      }
    });
  }

  private buildNavigation(items: BuilderMenuItem[]): PreviewMenuNode[] {
    if (!items.length) {
      const app = this.application();
      items = this.screens().map((screen, index) => ({
        id: `fallback-${screen.id}`, tenantId: app?.tenantId ?? this.tenantId, applicationId: this.applicationId,
        key: screen.key, label: screen.title, route: `/builder/applications/${this.applicationId}/screens/${screen.key}`,
        icon: "['fas','layer-group']", sortOrder: index, visible: true
      }));
    }
    const nodes = new Map(items.filter(item => item.visible).map(item => [item.id, { item, children: [] as PreviewMenuNode[] }]));
    const roots: PreviewMenuNode[] = [];
    for (const node of nodes.values()) {
      const parent = node.item.parentId ? nodes.get(node.item.parentId) : undefined;
      if (parent) parent.children.push(node);
      else if (!node.item.parentId) roots.push(node);
    }
    const sort = (siblings: PreviewMenuNode[]) => {
      siblings.sort((a, b) => a.item.sortOrder - b.item.sortOrder);
      siblings.forEach(node => sort(node.children));
    };
    sort(roots);
    return roots;
  }

  previewNavigate(item: BuilderMenuItem): void {
    const screen = this.screens().find(candidate => item.route?.endsWith(`/${candidate.key}`));
    if (!screen?.definitionJson) return;
    try {
      this.previewNodes.set(parsePageDefinition(screen.definitionJson).children);
      this.previewTitle.set(screen.title);
      this.previewKey.set(screen.key);
    } catch { this.error.set('This template page definition is not supported by this Builder version.'); }
  }

  async selectScreen(screen: BuilderDesignScreen): Promise<void> {
    if (this.dirty() && !await this.confirmation.confirm({ title: 'Discard unsaved changes?', message: 'Your application design has unsaved changes. Discard them and switch screens?', confirmText: 'Discard changes', cancelText: 'Keep editing', tone: 'warning' })) return;
    this.currentScreen.set(screen);
    this.key.set(screen.key);
    this.title.set(screen.title);
    this.html.set(screen.htmlContent);
    this.pageNodes.set([]);
    this.definitionPreview.set(false);
    if (screen.definitionJson) {
      try {
        const nodes = parsePageDefinition(screen.definitionJson).children;
        this.pageNodes.set(nodes);
        this.previewNodes.set(nodes);
        this.previewTitle.set(screen.title);
        this.previewKey.set(screen.key);
        this.definitionPreview.set(true);
      } catch {
        this.error.set('This template page definition is not supported by this Builder version.');
      }
    }
    this.dirty.set(false);
    this.notice.set('');
    this.error.set('');
    this.renderPreview();
    this.api.applicationScreen(this.tenantId, this.applicationId, screen.key).subscribe({
      next: detail => {
        if (detail.themeJson && !this.dirty()) {
          try { this.theme.update(theme => ({ ...theme, ...JSON.parse(detail.themeJson!) })); this.renderPreview(); }
          catch { /* Keep the brand defaults if a legacy theme is invalid. */ }
        }
      }
    });
  }

  async newScreen(): Promise<void> {
    if (this.dirty() && !await this.confirmation.confirm({ title: 'Discard unsaved changes?', message: 'Your application design has unsaved changes. Discard them and create a new screen?', confirmText: 'Discard changes', cancelText: 'Keep editing', tone: 'warning' })) return;
    this.currentScreen.set(null);
    const existing = new Set(this.screens().map(screen => screen.key));
    let key = 'new-screen';
    let suffix = 2;
    while (existing.has(key)) key = `new-screen-${suffix++}`;
    this.key.set(key);
    this.title.set('New screen');
    this.html.set(this.application()?.templateHtml || '<section><h1>New screen</h1><p>Start building your application here.</p></section>');
    this.dirty.set(false);
    this.notice.set('');
    this.error.set('');
    this.renderPreview();
  }

  inputValue(event: Event): string { return (event.target as HTMLInputElement).value; }
  setTitle(event: Event): void { this.title.set(this.inputValue(event)); this.dirty.set(true); }
  setKey(event: Event): void { this.key.set(this.inputValue(event)); this.dirty.set(true); }
  setHtml(event: Event): void { this.html.set(this.inputValue(event)); this.definitionPreview.set(false); this.dirty.set(true); this.renderPreview(); }
  setColor(property: keyof Pick<Theme, 'primaryColor' | 'backgroundColor' | 'surfaceColor' | 'textColor'>, color: string): void {
    this.theme.update(theme => ({ ...theme, [property]: color }));
    this.dirty.set(true);
    this.renderPreview();
  }
  setLogo(event: Event): void { this.theme.update(theme => ({ ...theme, logoUrl: this.inputValue(event) })); this.dirty.set(true); this.renderPreview(); }
  setFontScale(event: Event): void { this.theme.update(theme => ({ ...theme, fontScale: Number(this.inputValue(event)) })); this.dirty.set(true); this.renderPreview(); }
  setViewport(viewport: Viewport): void { this.viewport.set(viewport); }

  addBlock(kind: 'heading' | 'paragraph' | 'card' | 'button'): void {
    if (this.readOnly) return;
    const blocks = {
      heading: '<h2>Section heading</h2>',
      paragraph: '<p>Describe this part of your application.</p>',
      card: '<article class="app-card"><h3>Card title</h3><p>Add your content here.</p></article>',
      button: '<button type="button">Action</button>'
    };
    this.html.update(html => `${html}\n${blocks[kind]}`);
    this.dirty.set(true);
    this.renderPreview();
  }

  save(): void {
    if (this.saving() || this.readOnly) return;
    if (!/^[a-z][a-z0-9-]{0,79}$/.test(this.key()) || !this.title().trim() || this.title().length > 120 || this.html().length > 100_000) {
      this.error.set('Enter a title and a lowercase screen key; HTML must be under 100 KB.');
      return;
    }
    const request = { tenantId: this.tenantId, key: this.key(), title: this.title().trim(), htmlContent: this.html() };
    const current = this.currentScreen();
    this.saving.set(true);
    this.error.set('');
    this.notice.set('');
    const operation = current
      ? this.api.updateApplicationScreen(this.applicationId, current.key, request)
      : this.api.createApplicationScreen(this.applicationId, request);
    operation.pipe(
      tap(screen => {
        this.screens.update(screens => [...screens.filter(item => item.id !== screen.id), screen]);
        this.currentScreen.set(screen);
      }),
      switchMap(() => this.api.updateApplicationTheme(this.tenantId, this.applicationId, JSON.stringify(this.theme())))
    ).subscribe({
      next: () => {
        this.dirty.set(false);
        this.saving.set(false);
        this.notice.set('Design saved. Continue with data and forms, or open the application.');
      },
      error: response => {
        this.saving.set(false);
        this.error.set(response?.error?.detail ?? response?.error?.error ?? 'Could not finish saving the design. Please retry.');
      }
    });
  }

  openFormDesigner(): void {
    void this.router.navigate(['/builder/applications', this.applicationId, 'forms'], { queryParams: { tenantId: this.tenantId } });
  }

  private renderPreview(): void {
    if (!this.frame) return;
    const theme = this.theme();
    const escape = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
    const html = this.html().replaceAll('{{application.name}}', escape(this.application()?.name ?? 'Application')).replaceAll('{{records.count}}', '0');
    const baseCss = (this.application()?.templateScss ?? '').replace(/<\/style/gi, '<\\/style');
    const css = `:root{--app-primary:${theme.primaryColor};--app-bg:${theme.backgroundColor};--app-surface:${theme.surfaceColor};--app-text:${theme.textColor};font-size:${theme.fontScale}rem}body{margin:0;padding:24px;background:var(--app-bg);color:var(--app-text);font-family:system-ui,sans-serif}button{background:var(--app-primary);color:white;border:0;border-radius:8px;padding:10px 16px}.app-card{background:var(--app-surface);padding:18px;border-radius:12px}${baseCss}`;
    this.frame.srcdoc = `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body>${html}</body></html>`;
  }
}
