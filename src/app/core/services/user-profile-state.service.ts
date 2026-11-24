import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { DataGridPreferences } from '@app/shared/sorte-components/data-grid/data-grid.component';
import { firstValueFrom } from 'rxjs'; 
export interface UserProfileAppState {
  appearance?: {
    language?: 'en' | 'tr';
    theme?: 'dark' | 'light';
  };
  menu?: {
    collapsedItems?: Record<string, boolean>;
  };
  dataGrids?: Record<string, DataGridPreferences>;
}

@Injectable({ providedIn: 'root' })
export class UserProfileStateService {
  private readonly http = inject(HttpClient);
  private readonly state = signal<UserProfileAppState>({});
  private readonly loadedState = signal(false);
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private loadPromise: Promise<void> | null = null;

  readonly loaded = this.loadedState.asReadonly();
  readonly appState = this.state.asReadonly();

  async load(): Promise<void> {
    if (this.loadedState()) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = firstValueFrom(this.http.get<UserProfileAppState>('/api/v1/me/profile/app-state'))
      .then(state => {
        this.state.set(this.normalize(state));
        this.loadedState.set(true);
      })
      .finally(() => { this.loadPromise = null; });
    return this.loadPromise;
  }

  async ensureLoaded(): Promise<void> {
    await this.load();
  }

  reset(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    this.state.set({});
    this.loadedState.set(false);
    this.loadPromise = null;
  }

  menuItemOpen(key: string, fallback = true): boolean {
    return this.state().menu?.collapsedItems?.[key] ?? fallback;
  }

  setMenuItemOpen(key: string, open: boolean): void {
    this.patch({
      menu: {
        ...this.state().menu,
        collapsedItems: { ...(this.state().menu?.collapsedItems ?? {}), [key]: open }
      }
    });
  }

  dataGridPreferences(gridKey: string): DataGridPreferences {
    return this.normalizeGridPreferences(this.state().dataGrids?.[gridKey]);
  }

  setDataGridPreferences(gridKey: string, preferences: DataGridPreferences): void {
    this.patch({
      dataGrids: {
        ...(this.state().dataGrids ?? {}),
        [gridKey]: {
          groupedFields: [...preferences.groupedFields],
          hiddenColumns: [...preferences.hiddenColumns],
          columnWidths: { ...(preferences.columnWidths ?? {}) },
          filters: { ...(preferences.filters ?? {}) },
          pageSize: preferences.pageSize,
          search: preferences.search ?? '',
          sortDirection: preferences.sortDirection,
          sortField: preferences.sortField ?? null
        }
      }
    });
  }

  setLanguage(language: 'en' | 'tr'): void {
    this.patch({ appearance: { ...(this.state().appearance ?? {}), language } });
  }

  setTheme(theme: 'dark' | 'light'): void {
    this.patch({ appearance: { ...(this.state().appearance ?? {}), theme } });
  }

  private patch(partial: UserProfileAppState): void {
    this.state.update(current => this.normalize({ ...current, ...partial }));
    this.scheduleSave();
  }

  private scheduleSave(): void {
    if (!this.loadedState()) return;
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => void this.save(), 500);
  }

  private async save(): Promise<void> {
    this.saveTimer = null;
    if (!this.loadedState()) return;
    await firstValueFrom(this.http.put<void>('/api/v1/me/profile/app-state', {
      appStateJson: JSON.stringify(this.normalize(this.state()))
    }));
  }

  private normalize(value?: UserProfileAppState | null): UserProfileAppState {
    const dataGrids = Object.entries(value?.dataGrids ?? {}).reduce<Record<string, DataGridPreferences>>((result, [key, preferences]) => {
      result[key] = this.normalizeGridPreferences(preferences);
      return result;
    }, {});

    return {
      appearance: {
        language: value?.appearance?.language === 'tr' ? 'tr' : value?.appearance?.language === 'en' ? 'en' : undefined,
        theme: value?.appearance?.theme === 'dark' ? 'dark' : value?.appearance?.theme === 'light' ? 'light' : undefined
      },
      menu: { collapsedItems: { ...(value?.menu?.collapsedItems ?? {}) } },
      dataGrids
    };
  }

  private normalizeGridPreferences(value?: Partial<DataGridPreferences>): DataGridPreferences {
    return {
      columnWidths: { ...(value?.columnWidths ?? {}) },
      filters: { ...(value?.filters ?? {}) },
      groupedFields: [...(value?.groupedFields ?? [])],
      hiddenColumns: [...(value?.hiddenColumns ?? [])],
      pageSize: value?.pageSize,
      search: value?.search ?? '',
      sortDirection: value?.sortDirection === 'desc' ? 'desc' : 'asc',
      sortField: value?.sortField ?? null
    };
  }
}
