import { Injectable, signal, WritableSignal } from '@angular/core';

export interface PlatformMenuContribution {
  id: string;
  label: string;
  route: string;
  icon?: string;
  order?: number;
  requiredRole?: string;
}

export interface PlatformFieldContribution {
  type: string;
  label: string;
  component: unknown;
}

export interface PlatformWidgetContribution {
  type: string;
  label: string;
  component: unknown;
}

export interface PlatformActionContribution {
  id: string;
  label: string;
  execute: (payload: unknown) => unknown;
}

export interface PlatformPlugin {
  id: string;
  version: string;
  register(context: PlatformPluginContext): void;
}

export interface PlatformPluginContext {
  registerMenu(item: PlatformMenuContribution): void;
  registerField(field: PlatformFieldContribution): void;
  registerWidget(widget: PlatformWidgetContribution): void;
  registerAction(action: PlatformActionContribution): void;
}

/** Runtime registry for logical plugins inside the single Angular application. */
@Injectable({ providedIn: 'root' })
export class PlatformRegistryService {
  private readonly menuItems = signal<PlatformMenuContribution[]>([]);
  private readonly fields = signal<PlatformFieldContribution[]>([]);
  private readonly widgets = signal<PlatformWidgetContribution[]>([]);
  private readonly actions = signal<PlatformActionContribution[]>([]);

  readonly menus = this.menuItems.asReadonly();
  readonly registeredFields = this.fields.asReadonly();
  readonly registeredWidgets = this.widgets.asReadonly();
  readonly registeredActions = this.actions.asReadonly();

  registerPlugin(plugin: PlatformPlugin): void {
    if (!plugin.id.trim() || !plugin.version.trim()) {
      throw new Error('A plugin id and version are required.');
    }
    if (this.plugins().some(item => item.id.toLowerCase() === plugin.id.trim().toLowerCase())) {
      throw new Error(`A plugin with id '${plugin.id}' is already registered.`);
    }
    plugin.register({
      registerMenu: item => this.registerMenu(item),
      registerField: field => this.registerField(field),
      registerWidget: widget => this.registerWidget(widget),
      registerAction: action => this.registerAction(action)
    });
    this.plugins.update(items => [...items, { id: plugin.id, version: plugin.version }]);
  }

  readonly plugins = signal<Array<Pick<PlatformPlugin, 'id' | 'version'>>>([]);

  registerMenu(item: PlatformMenuContribution): void {
    this.replace(this.menuItems, item, current => current.id);
  }

  registerField(field: PlatformFieldContribution): void {
    this.replace(this.fields, field, current => current.type);
  }

  registerWidget(widget: PlatformWidgetContribution): void {
    this.replace(this.widgets, widget, current => current.type);
  }

  registerAction(action: PlatformActionContribution): void {
    this.replace(this.actions, action, current => current.id);
  }

  private replace<T>(store: WritableSignal<T[]>, value: T, key: (item: T) => string): void {
    const valueKey = key(value).trim();
    if (!valueKey) throw new Error('A registry contribution key is required.');
    if (store().some(item => key(item).trim().toLowerCase() === valueKey.toLowerCase())) {
      throw new Error(`A registry contribution with key '${valueKey}' is already registered.`);
    }
    store.update(items => [...items, value]);
  }
}
