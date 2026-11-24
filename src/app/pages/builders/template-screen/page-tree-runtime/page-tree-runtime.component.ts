import { Component, inject, input, output, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CommonModule } from '@angular/common';
import { NgComponentOutlet } from '@angular/common';
import { runtimeComponentRegistry } from '@core/builders/runtime-component-registry';
import { actionForNode, navigationTarget } from '@core/builders/component-actions';
import { RouterLink } from '@angular/router';
import type { RuntimeFormDefinition } from '@core/builders/interfaces/runtime-form-definition';
import { PageNode, responsiveNodeStyle } from '@core/builders/page-blocks';
import { sanitizeElementStyle } from '@core/builders/element-styling';
import { SectionBlockComponent } from '@shared/components/section-block.component';
import { BlockPaginationService } from '@shared/components/block-pagination.service';
import { BuildersApiService } from '@core/builders/builders-api.service';
import { RuntimeFormComponent } from '../../runtime-form/runtime-form.component';
import type { BuilderRecord } from '@core/builders/interfaces/builder-record';

export type RuntimePageNode = PageNode;

@Component({
  selector: 'ant-page-tree-runtime',
  templateUrl: './page-tree-runtime.component.html',
  styleUrl: './page-tree-runtime.component.scss',
  providers: [BlockPaginationService],
  styles: [`p{white-space:pre-wrap}img{max-width:100%}a,button{display:inline-block;padding:10px 18px;border:1px solid currentColor;border-radius:6px;color:inherit}`],
  imports: [CommonModule, NgComponentOutlet, RouterLink, SectionBlockComponent, TranslocoPipe, RuntimeFormComponent],
})
export class PageTreeRuntimeComponent {
  private readonly api = inject(BuildersApiService);
  readonly activeForm = signal<RuntimeFormDefinition | null>(null);
  readonly formDialogLoading = signal(false);
  readonly formDialogError = signal('');
  readonly recordSaved = output<BuilderRecord>();

  openFormDialog(node: PageNode): void {
    const definition = node.formId ? this.definitions()[node.formId] : undefined;
    if (!node.floatingButton || node.actionType !== 'form' || !definition || definition.objectId !== node.objectId) return;
    this.formDialogError.set('');
    if (this.preview() || this.localOnly()) { this.activeForm.set(definition); return; }
    if (!this.tenantId()) return;
    this.formDialogLoading.set(true);
    this.api.recordCapabilities(this.tenantId(), definition.objectId).subscribe({
      next: capabilities => {
        this.formDialogLoading.set(false);
        if (capabilities.create) this.activeForm.set(definition);
        else this.formDialogError.set('crud.createDenied');
      },
      error: () => { this.formDialogLoading.set(false); this.formDialogError.set('crud.createDenied'); }
    });
  }

  closeFormDialog(record?: BuilderRecord): void {
    this.activeForm.set(null);
    if (record) this.recordSaved.emit(record);
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
  pageKeyFor(node: PageNode): string | null {
    if (node.type !== 'button') return null;
    if (node.actionType === 'none' || node.actionType === 'url') return null;
    if (node.actionType === 'page') return node.actionValue && /^[a-z][a-z0-9-]{0,79}$/.test(node.actionValue) ? node.actionValue : null;
    if (node.pageKey) return node.pageKey;
    const matches = this.availablePages().filter(page => page.title.trim().toLocaleLowerCase() === node.text?.trim().toLocaleLowerCase());
    return matches.length === 1 ? matches[0].key : null;
  }
  navigation(node: PageNode) {
    const key = this.pageKeyFor(node);
    const action = key ? actionForNode({ ...node, pageKey: key }) : null;
    return action?.kind === 'navigate-page' ? navigationTarget(action, { applicationId: this.applicationId(), tenantId: this.tenantId(), preview: this.preview() }) : null;
  }

  externalUrl(node: PageNode): string | null {
    const action = actionForNode(node);
    return action?.kind === 'open-url' ? action.url : null;
  }

  runtime(node: PageNode) { return runtimeComponentRegistry.get(node.type); }

  runtimeInputs(node: PageNode) {
    return this.runtime(node)?.inputs(node, {
      tenantId: this.tenantId(),
      preview: this.preview(),
      localOnly: this.localOnly(),
      definitions: this.definitions()
    }) ?? null;
  }

  readonly localOnly = input(false);
  readonly navigatePage = output<string>();
  readonly availablePages = input<ReadonlyArray<{ key: string; title: string }>>([]);
  readonly preview = input(false);
  readonly nodes = input<RuntimePageNode[]>([]);
  readonly definitions = input<Record<string, RuntimeFormDefinition>>({});
  readonly tenantId = input.required<string>();
  readonly applicationId = input.required<string>();

  style(node: PageNode): Record<string, string> {
    return { ...sanitizeElementStyle(node.styling), ...responsiveNodeStyle(node) };
  }

}
