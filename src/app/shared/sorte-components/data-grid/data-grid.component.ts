import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, computed, inject, signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import {
  faAngleDoubleLeft,
  faAngleDoubleRight,
  faAngleDown,
  faAngleLeft,
  faAngleRight,
  faAngleUp,
  faFileCsv,
  faFileExcel,
  faFilePdf,
  faFilter,
  faEye,
  faMagnifyingGlass,
  faPenToSquare,
  faPlus,
  faRotateLeft,
  faTrashCan,
  faXmark
} from '@fortawesome/free-solid-svg-icons';

import { formatDisplayDate, isIsoDateLike } from '@core/utils/date.utils';
import { DataGridFilterPanelComponent } from './data-grid-filter-panel.component';

export type DataGridAlign = 'left' | 'center' | 'right';

export type DataGridColumn<T = any> = {
  field: keyof T | string;
  caption: string;
  width?: string;
  align?: DataGridAlign;
  visible?: boolean;
  sortable?: boolean;
  sticky?: boolean;
  format?: (value: any, row: T) => string;
  value?: (row: T) => any;
};

export type DataGridRowAction = 'view' | 'create' | 'edit' | 'delete';
export type SortDirection = 'asc' | 'desc';
export type DataGridFilterOperator = 'contains' | 'notContains' | 'equals' | 'notEquals' | 'startsWith' | 'endsWith' | 'empty' | 'notEmpty';

export type DataGridColumnFilter = {
  operator: DataGridFilterOperator;
  value: string;
};

export type DataGridQuery = {
  search: string;
  filters: Record<string, DataGridColumnFilter>;
  sortField: string | null;
  sortDirection: SortDirection;
  page: number;
  pageSize: number;
};

export type DataGridPreferences = {
  groupedFields: string[];
  hiddenColumns: string[];
  columnWidths?: Record<string, number>;
  filters?: Record<string, DataGridColumnFilter>;
  pageSize?: number;
  search?: string;
  sortDirection?: SortDirection;
  sortField?: string | null;
};
export type DataGridPreferencesLoader = (gridKey: string) => Promise<DataGridPreferences>;
export type DataGridPreferencesSaver = (gridKey: string, preferences: DataGridPreferences) => Promise<void>;
export type DataGridRowsLoader = (query: DataGridQuery) => Promise<any[]>;

type GroupDisplayItem =
  | { kind: 'group'; key: string; field: string; value: string; count: number; level: number; collapsed: boolean }
  | { kind: 'row'; row: any; level: number };

@Component({
  standalone: true,
  selector: 'ant-data-grid',
  templateUrl: './data-grid.component.html',
  imports: [CommonModule, TranslocoPipe, FontAwesomeModule, DataGridFilterPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataGridComponent implements OnChanges, OnDestroy {
  private readonly transloco = inject(TranslocoService);

  @Input() title = 'Data';
  @Input() rows: any[] = [];
  @Input() columns: DataGridColumn[] = [];
  @Input() fileName = 'data-grid';
  @Input() pageSizes = [30, 50, 100, 200];
  @Input() enableSearch = true;
  @Input() loading = false;
  @Input() enablePaging = true;
  @Input() enableColumnChooser = true;
  @Input() enableColumnFilters = true;
  @Input() enableExport = true;
  @Input() enableCreate = false;
  @Input() enableEditing = false;
  @Input() enableRowActions = true;
  @Input() rowActions: DataGridRowAction[] = ['view', 'create', 'edit', 'delete'];
  @Input() rowActionsForRow: (row: any) => DataGridRowAction[] = (row) => this.rowActions;
  @Input() enableGrouping = true;
  @Input() enableServerQuery = false;
  @Input() loadRows?: DataGridRowsLoader;
  @Input() loadPreferences?: DataGridPreferencesLoader;
  @Input() savePreferences?: DataGridPreferencesSaver;
  @Input() selectedRowId: string | null = null;
  @Output() rowSelected = new EventEmitter<any>();

  // The toolbar create action emits no row; a row-level create action emits
  // its row so consumers can use row context when opening a dialog.

  @Output() createRequested = new EventEmitter<any>();
  @Output() viewRequested = new EventEmitter<any>();
  @Output() editRequested = new EventEmitter<any>();
  @Output() deleteRequested = new EventEmitter<any>();
  @Output() queryChanged = new EventEmitter<DataGridQuery>();
  @Output() refreshRequested = new EventEmitter<void>();

  readonly search = signal('');
  readonly icons = {
    add: faPlus,
    clear: faRotateLeft,
    close: faXmark,
    csv: faFileCsv,
    delete: faTrashCan,
    edit: faPenToSquare,
    excel: faFileExcel,
    filter: faFilter,
    first: faAngleDoubleLeft,
    last: faAngleDoubleRight,
    next: faAngleRight,
    pdf: faFilePdf,
    previous: faAngleLeft,
    search: faMagnifyingGlass,
    sortAsc: faAngleUp,
    sortDesc: faAngleDown,
    view: faEye
  };

  readonly page = signal(1);
  readonly pageSize = signal(30);
  readonly sortField = signal<string | null>(null);
  readonly sortDirection = signal<SortDirection>('asc');
  readonly hiddenColumns = signal(new Set<string>());
  readonly columnFilters = signal<Record<string, DataGridColumnFilter>>({});
  readonly selectedRow = signal<any | null>(null);
  readonly groupedFields = signal<string[]>([]);
  readonly collapsedGroups = signal(new Set<string>());
  readonly groupDropActive = signal(false);
  readonly columnWidths = signal<Record<string, number>>({});
  readonly activeFilterMenu = signal<string | null>(null);
  readonly filterMenuPosition = signal<{ left: number; top: number } | null>(null);
  readonly filterPanelOpen = signal(false);
  readonly serverRows = signal<any[] | null>(null);
  readonly serverLoading = signal(false);
  readonly serverError = signal<string | null>(null);
  private readonly inputRevision = signal(0);
  private serverQueryTimer: ReturnType<typeof setTimeout> | null = null;
  private loadedGroupingModule: string | null = null;
  private activeResize: { field: string; startX: number; startWidth: number } | null = null;
  private readonly resizeMoveHandler = (event: MouseEvent) => this.resizeColumn(event);
  private readonly resizeEndHandler = () => this.stopColumnResize();

  readonly filterOperators: Array<{ value: DataGridFilterOperator; label: string }> = [
    { value: 'contains', label: 'grid.contains' },
    { value: 'notContains', label: 'grid.notContains' },
    { value: 'equals', label: 'grid.equals' },
    { value: 'notEquals', label: 'grid.notEquals' },
    { value: 'startsWith', label: 'grid.startsWith' },
    { value: 'endsWith', label: 'grid.endsWith' },
    { value: 'empty', label: 'grid.empty' },
    { value: 'notEmpty', label: 'grid.notEmpty' }
  ];

  readonly visibleColumns = computed(() => {
    this.inputRevision();
    return this.columns.filter(column => this.isColumnVisible(column));
  });

  readonly filteredRows = computed(() => {
    this.inputRevision();
    const serverRows = this.serverRows();
    if (this.enableServerQuery && serverRows !== null) {
      return this.sortRows([...serverRows]);
    }

    const term = this.search().trim().toLowerCase();
    const visible = this.visibleColumns();
    const filters = this.columnFilters();
    const activeFilters = Object.entries(filters).filter(([, filter]) => this.isFilterActive(filter));
    const source = this.rows.filter(row => {
      const matchesGlobalSearch = !term || visible.some(column => this.filterText(row, column).includes(term));
      const matchesColumnFilters = activeFilters.every(([field, filter]) => {
        const column = this.columns.find(item => String(item.field) === field);
        return this.matchesColumnFilter(this.filterText(row, column), filter);
      });

      return matchesGlobalSearch && matchesColumnFilters;
    });

    return this.sortRows(source);
  });

  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filteredRows().length / this.pageSize())));

  readonly pagedRows = computed(() => {
    const currentPage = Math.min(this.page(), this.pageCount());
    const start = (currentPage - 1) * this.pageSize();
    return this.enablePaging ? this.filteredRows().slice(start, start + this.pageSize()) : this.filteredRows();
  });

  readonly groupedDisplayRows = computed<GroupDisplayItem[]>(() => {
    const fields = this.groupedFields();
    if (fields.length === 0) return [];
    return this.buildGroupedItems(this.filteredRows(), fields, 0, '');
  });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['pageSizes'] && this.pageSizes.length && !this.pageSizes.includes(this.pageSize())) this.pageSize.set(this.pageSizes[0]);
    if (changes['rows'] || changes['columns']) {
      this.inputRevision.update(value => value + 1);
      this.page.set(1);
      if (!this.hasActiveServerQuery()) {
        this.serverRows.set(null);
      }
    }
    if (changes['selectedRowId'] && !this.selectedRowId) this.selectedRow.set(null);
    if ((changes['fileName'] || changes['columns']) && this.fileName && this.loadedGroupingModule !== this.fileName) void this.loadGridProperty();
  }

  ngOnDestroy() {
    if (this.serverQueryTimer) {
      clearTimeout(this.serverQueryTimer);
    }
    this.removeResizeListeners();
  }

  requestEdit(row = this.selectedRow()) {
    if (row) this.editRequested.emit(row);
  }

  requestDelete(event: MouseEvent, row: any) {
    event.preventDefault();
    event.stopPropagation();
    this.deleteRequested.emit(row);
  }

  requestView(event: MouseEvent, row: any) {
    event.preventDefault();
    event.stopPropagation();
    this.viewRequested.emit(row);
  }

  requestCreate(event: MouseEvent, row: any) {
    event.preventDefault();
    event.stopPropagation();
    this.createRequested.emit(row);
  }

  requestRowEdit(event: MouseEvent, row: any) {
    event.preventDefault();
    event.stopPropagation();
    this.requestEdit(row);
  }

  setSearch(event: Event) {
    this.search.set((event.target as HTMLInputElement).value);
    this.page.set(1);
    this.emitQueryChanged();
  }

  setColumnFilterValue(column: DataGridColumn, event: Event) {
    const field = String(column.field);
    const value = (event.target as HTMLInputElement).value;
    const next = { ...this.columnFilters() };
    const current = next[field] ?? { operator: 'contains', value: '' };

    next[field] = { ...current, value };
    if (!this.isFilterActive(next[field])) {
      delete next[field];
    }

    this.columnFilters.set(next);
    this.page.set(1);
    this.emitQueryChanged();
  }

  setColumnFilterOperator(column: DataGridColumn, event: Event) {
    const field = String(column.field);
    const operator = (event.target as HTMLSelectElement).value as DataGridFilterOperator;
    this.applyColumnFilterOperator(column, operator);
  }

  applyColumnFilterOperator(column: DataGridColumn, operator: DataGridFilterOperator) {
    const field = String(column.field);
    const next = { ...this.columnFilters() };
    const current = next[field] ?? { operator, value: '' };

    next[field] = { ...current, operator };
    if (!this.isFilterActive(next[field])) {
      delete next[field];
    }

    this.columnFilters.set(next);
    this.closeFilterMenu();
    this.page.set(1);
    this.emitQueryChanged();
  }

  columnFilterValue(column: DataGridColumn) {
    return this.columnFilters()[String(column.field)]?.value ?? '';
  }

  columnFilterOperator(column: DataGridColumn) {
    return this.columnFilters()[String(column.field)]?.operator ?? 'contains';
  }

  columnFilterNeedsNoValue(column: DataGridColumn) {
    const operator = this.columnFilterOperator(column);
    return operator === 'empty' || operator === 'notEmpty';
  }

  hasColumnFilters() {
    return Object.values(this.columnFilters()).some(filter => this.isFilterActive(filter));
  }

  clearColumnFilters() {
    this.columnFilters.set({});
    this.search.set('');
    this.closeFilterMenu();
    this.page.set(1);
    this.emitQueryChanged();
  }

  toggleFilterPanel() {
    this.filterPanelOpen.update(value => !value);
    this.closeFilterMenu();
  }

  clearColumnFilter(column: DataGridColumn) {
    const next = { ...this.columnFilters() };
    delete next[String(column.field)];
    this.columnFilters.set(next);
    this.closeFilterMenu();
    this.page.set(1);
    this.emitQueryChanged();
  }

  toggleFilterMenu(event: MouseEvent, column: DataGridColumn) {
    event.preventDefault();
    event.stopPropagation();
    const field = String(column.field);
    if (this.activeFilterMenu() === field) {
      this.closeFilterMenu();
      return;
    }

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.filterMenuPosition.set({
      left: Math.min(rect.left, window.innerWidth - 240),
      top: Math.min(rect.bottom + 6, window.innerHeight - 330)
    });
    this.activeFilterMenu.set(field);
  }

  closeFilterMenu() {
    this.activeFilterMenu.set(null);
    this.filterMenuPosition.set(null);
  }

  setPageSize(event: Event) {
    this.pageSize.set(Number((event.target as HTMLSelectElement).value));
    this.page.set(1);
    this.emitQueryChanged();
  }

  goToPage(page: number) {
    this.page.set(Math.min(Math.max(1, page), this.pageCount()));
    this.emitQueryChanged();
  }

  startColumnDrag(event: DragEvent, column: DataGridColumn) {
    if (!this.enableGrouping || !event.dataTransfer) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-hotel-grid-column', String(column.field));
  }

  startColumnResize(event: MouseEvent, column: DataGridColumn) {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    const header = target.closest('th');
    this.activeResize = {
      field: String(column.field),
      startX: event.clientX,
      startWidth: header?.getBoundingClientRect().width ?? this.columnWidthValue(column)
    };
    document.body.classList.add('select-none', 'cursor-col-resize');
    window.addEventListener('mousemove', this.resizeMoveHandler);
    window.addEventListener('mouseup', this.resizeEndHandler);
  }

  columnWidth(column: DataGridColumn) {
    const resized = this.columnWidths()[String(column.field)];
    return resized ? `${resized}px` : column.width;
  }

  gridMinWidth() {
    const total = this.visibleColumns().reduce((sum, column) => sum + this.columnWidthValue(column), 0);
    return `${Math.max(total + this.actionColumnWidth(), 720)}px`;
  }

  showActionsColumn() {
    return this.enableRowActions && this.enableEditing && this.rowActions.length > 0;
  }

  actionColumnWidth() {
    return this.showActionsColumn() ? Math.max(34, this.rowActions.length * 26 + 8) : 0;
  }

  isCancelledRow(row: any): boolean {
    return String(row?.status ?? row?.reservationStatus ?? '').toLowerCase() === 'cancelled';
  }

  isOptionRow(row: any): boolean {
    return String(row?.status ?? row?.reservationStatus ?? '').toLowerCase() === 'option';
  }

  tableColspan() {
    return this.visibleColumns().length + (this.showActionsColumn() ? 1 : 0) || 1;
  }

  allowGroupDrop(event: DragEvent) {
    if (!this.enableGrouping) return;
    event.preventDefault();
    this.groupDropActive.set(true);
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  dropGroup(event: DragEvent) {
    event.preventDefault();
    this.groupDropActive.set(false);
    const field = event.dataTransfer?.getData('application/x-hotel-grid-column');
    if (!field || !this.columnForField(field) || this.groupedFields().includes(field)) return;
    this.groupedFields.update(fields => [...fields, field]);
    this.collapsedGroups.set(new Set());
    void this.persistGridProperty();
  }

  removeGroup(field: string) {
    this.groupedFields.update(fields => fields.filter(item => item !== field));
    this.collapsedGroups.set(new Set());
    void this.persistGridProperty();
  }

  clearGroups() {
    this.groupedFields.set([]);
    this.collapsedGroups.set(new Set());
    void this.persistGridProperty();
  }

  toggleGroup(key: string) {
    const next = new Set(this.collapsedGroups());
    next.has(key) ? next.delete(key) : next.add(key);
    this.collapsedGroups.set(next);
  }

  columnForField(field: string) {
    return this.columns.find(column => String(column.field) === field);
  }

  displayItemIdentity(item: GroupDisplayItem, index: number) {
    return item.kind === 'group' ? item.key : `row:${this.rowIdentity(item.row, index)}`;
  }

  sortBy(column: DataGridColumn) {
    if (column.sortable === false) {
      return;
    }

    const field = String(column.field);
    if (this.sortField() === field) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortField.set(field);
      this.sortDirection.set('asc');
    }
    this.emitQueryChanged();
  }

  toggleColumn(column: DataGridColumn) {
    const next = new Set(this.hiddenColumns());
    const field = String(column.field);
    if (next.has(field)) {
      next.delete(field);
    } else {
      next.add(field);
    }
    this.hiddenColumns.set(next);
    void this.persistGridProperty();
  }

  isColumnVisible(column: DataGridColumn) {
    return column.visible !== false && !this.hiddenColumns().has(String(column.field));
  }

  displayValue(row: any, column: DataGridColumn) {
    const value = this.rawValue(row, column);
    if (column.format) {
      return column.format(value, row);
    }

    return isIsoDateLike(value) ? formatDisplayDate(value, this.transloco.getActiveLang()) : String(value ?? '');
  }

  filterText(row: any, column?: DataGridColumn) {
    return String(column ? this.displayValue(row, column) : '').toLowerCase();
  }

  private isFilterActive(filter: DataGridColumnFilter) {
    return filter.operator === 'empty' || filter.operator === 'notEmpty' || !!filter.value.trim();
  }

  private matchesColumnFilter(cellText: string, filter: DataGridColumnFilter) {
    const value = filter.value.trim().toLowerCase();
    switch (filter.operator) {
      case 'contains':
        return cellText.includes(value);
      case 'notContains':
        return !cellText.includes(value);
      case 'equals':
        return cellText === value;
      case 'notEquals':
        return cellText !== value;
      case 'startsWith':
        return cellText.startsWith(value);
      case 'endsWith':
        return cellText.endsWith(value);
      case 'empty':
        return cellText.trim().length === 0;
      case 'notEmpty':
        return cellText.trim().length > 0;
    }
  }

  rawValue(row: any, column?: DataGridColumn) {
    if (!column) {
      return '';
    }

    if (column.value) {
      return column.value(row);
    }

    return String(column.field).split('.').reduce((value, key) => value?.[key], row);
  }

  initials(row: any) {
    return `${row?.firstName?.[0] ?? ''}${row?.lastName?.[0] ?? ''}`.toUpperCase() || '?';
  }

  rowIdentity(row: any, index: number) {
    return row?.id ?? index;
  }

  selectRow(row: any, index: number) {
    this.selectedRow.set(row);
    this.rowSelected.emit(row);
  }

  private buildGroupedItems(rows: any[], fields: string[], level: number, parentKey: string): GroupDisplayItem[] {
    const field = fields[level];
    const column = this.columnForField(field);
    const buckets = new Map<string, any[]>();
    for (const row of rows) {
      const value = String(this.rawValue(row, column) ?? '');
      buckets.set(value, [...(buckets.get(value) ?? []), row]);
    }

    return [...buckets.entries()].sort(([left], [right]) => compareGridValues(left, right)).flatMap(([value, groupRows]) => {
      const key = `${parentKey}/${field}:${value}`;
      const collapsed = this.collapsedGroups().has(key);
      const header: GroupDisplayItem = { kind: 'group', key, field, value: value || '(Blank)', count: groupRows.length, level, collapsed };
      if (collapsed) return [header];
      if (level < fields.length - 1) return [header, ...this.buildGroupedItems(groupRows, fields, level + 1, key)];
      return [header, ...groupRows.map(row => ({ kind: 'row' as const, row, level: level + 1 }))];
    });
  }

  private async loadGridProperty() {
    if (!this.fileName || !this.loadPreferences || this.columns.length === 0 || this.loadedGroupingModule === this.fileName) return;
    try {
      const property = await this.loadPreferences(this.fileName);
      this.loadedGroupingModule = this.fileName;
      this.groupedFields.set(property.groupedFields.filter(field => !!this.columnForField(field)));
      this.hiddenColumns.set(new Set(property.hiddenColumns.filter(field => !!this.columnForField(field))));
      this.columnWidths.set(property.columnWidths ?? {});
      this.columnFilters.set(this.validColumnFilters(property.filters ?? {}));
      this.pageSize.set(this.pageSizes.includes(property.pageSize ?? 0) ? property.pageSize! : this.pageSize());
      this.search.set(property.search ?? '');
      this.sortField.set(property.sortField && this.columnForField(property.sortField) ? property.sortField : null);
      this.sortDirection.set(property.sortDirection === 'desc' ? 'desc' : 'asc');
    } catch (error: any) {
      this.loadedGroupingModule = this.fileName;
      if (error?.status !== 404) {
        this.groupedFields.set([]);
        this.hiddenColumns.set(new Set());
        this.columnWidths.set({});
        this.columnFilters.set({});
        this.search.set('');
        this.sortField.set(null);
        this.sortDirection.set('asc');
      }
    }
  }

  private async persistGridProperty() {
    if (!this.fileName || !this.savePreferences) return;
    await this.savePreferences(this.fileName, {
      columnWidths: this.columnWidths(),
      filters: this.columnFilters(),
      groupedFields: this.groupedFields(),
      hiddenColumns: [...this.hiddenColumns()],
      pageSize: this.pageSize(),
      search: this.search(),
      sortDirection: this.sortDirection(),
      sortField: this.sortField()
    });
  }

  private resizeColumn(event: MouseEvent) {
    if (!this.activeResize) {
      return;
    }

    const width = Math.max(72, Math.round(this.activeResize.startWidth + event.clientX - this.activeResize.startX));
    this.columnWidths.update(widths => ({ ...widths, [this.activeResize!.field]: width }));
  }

  private stopColumnResize() {
    this.activeResize = null;
    this.removeResizeListeners();
    void this.persistGridProperty();
  }

  private emitQueryChanged() {
    const query = {
      search: this.search().trim(),
      filters: this.columnFilters(),
      sortField: this.sortField(),
      sortDirection: this.sortDirection(),
      page: this.page(),
      pageSize: this.pageSize()
    };
    this.queryChanged.emit(query);
    void this.persistGridProperty();
    this.queueServerQuery(query);
  }

  private validColumnFilters(filters: Record<string, DataGridColumnFilter>) {
    return Object.entries(filters).reduce<Record<string, DataGridColumnFilter>>((result, [field, filter]) => {
      if (this.columnForField(field) && this.isFilterActive(filter)) {
        result[field] = filter;
      }
      return result;
    }, {});
  }

  private sortRows(rows: any[]) {
    const field = this.sortField();
    if (!field) {
      return rows;
    }

    const column = this.columns.find(item => item.field === field);
    return rows.sort((left, right) => {
      const leftValue = this.rawValue(left, column);
      const rightValue = this.rawValue(right, column);
      const result = compareGridValues(leftValue, rightValue);
      return this.sortDirection() === 'asc' ? result : -result;
    });
  }

  private queueServerQuery(query: DataGridQuery) {
    if (this.serverQueryTimer) {
      clearTimeout(this.serverQueryTimer);
    }

    if (!this.shouldUseServerQuery(query)) {
      this.serverRows.set(null);
      this.serverLoading.set(false);
      return;
    }

    this.serverLoading.set(true);
    this.serverQueryTimer = setTimeout(() => void this.loadServerRows(query), 350);
  }

  private async loadServerRows(query: DataGridQuery) {
    if (!this.loadRows) return;
    try {
      this.serverError.set(null);
      const rows = await this.loadRows(query);
      this.serverRows.set(rows);
      this.inputRevision.update(value => value + 1);
    } catch (error) {
      this.serverRows.set(null);
      this.serverError.set(error instanceof Error ? error.message : 'Unable to load grid data.');
    } finally {
      this.serverLoading.set(false);
    }
  }

  private shouldUseServerQuery(query: DataGridQuery) {
    return this.enableServerQuery
      && !!this.loadRows
      && (!!query.search || Object.values(query.filters).some(filter => this.isFilterActive(filter)));
  }

  private hasActiveServerQuery() {
    return this.shouldUseServerQuery({
      search: this.search().trim(),
      filters: this.columnFilters(),
      sortField: this.sortField(),
      sortDirection: this.sortDirection(),
      page: this.page(),
      pageSize: this.pageSize()
    });
  }

  private removeResizeListeners() {
    document.body.classList.remove('select-none', 'cursor-col-resize');
    window.removeEventListener('mousemove', this.resizeMoveHandler);
    window.removeEventListener('mouseup', this.resizeEndHandler);
  }

  private columnWidthValue(column: DataGridColumn) {
    const resized = this.columnWidths()[String(column.field)];
    if (resized) {
      return resized;
    }

    const parsed = Number.parseFloat(column.width ?? '');
    return Number.isFinite(parsed) ? parsed : 160;
  }

  rangeLabel() {
    const total = this.filteredRows().length;
    if (total === 0) {
      return '0 of 0';
    }

    const start = (Math.min(this.page(), this.pageCount()) - 1) * this.pageSize() + 1;
    const end = Math.min(total, start + this.pageSize() - 1);
    return `${start}-${end} of ${total}`;
  }

  exportCsv() {
    this.downloadText(`${this.fileName}.csv`, this.toDelimitedText(','));
  }

  exportExcel() {
    const html = `<table>${this.exportHeaderHtml()}${this.filteredRows().map(row => this.exportRowHtml(row)).join('')}</table>`;
    this.downloadBlob(`${this.fileName}.xls`, 'application/vnd.ms-excel;charset=utf-8', html);
  }

  exportPdf() {
    const html = `
      <html>
        <head>
          <title>${escapeHtml(this.title)}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            table { border-collapse: collapse; width: 100%; font-size: 12px; }
            th, td { border: 1px solid #d0d5dd; padding: 8px; text-align: left; }
            th { background: #f2f4f7; }
          </style>
        </head>
        <body>
          <h2>${escapeHtml(this.title)}</h2>
          <table>${this.exportHeaderHtml()}${this.filteredRows().map(row => this.exportRowHtml(row)).join('')}</table>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>`;
    const printWindow = window.open('', '_blank');
    printWindow?.document.write(html);
    printWindow?.document.close();
  }

  private toDelimitedText(separator: string) {
    const columns = this.visibleColumns();
    const lines = [
      columns.map(column => csvValue(column.caption, separator)).join(separator),
      ...this.filteredRows().map(row => columns.map(column => csvValue(this.displayValue(row, column), separator)).join(separator))
    ];
    return lines.join('\r\n');
  }

  private exportHeaderHtml() {
    return `<thead><tr>${this.visibleColumns().map(column => `<th>${escapeHtml(column.caption)}</th>`).join('')}</tr></thead>`;
  }

  private exportRowHtml(row: any) {
    return `<tr>${this.visibleColumns().map(column => `<td>${escapeHtml(this.displayValue(row, column))}</td>`).join('')}</tr>`;
  }

  private downloadText(fileName: string, text: string) {
    this.downloadBlob(fileName, 'text/plain;charset=utf-8', text);
  }

  private downloadBlob(fileName: string, type: string, content: string) {
    const blob = new Blob([content], { type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}

function compareGridValues(left: any, right: any) {
  const leftText = String(left ?? '').toLocaleLowerCase();
  const rightText = String(right ?? '').toLocaleLowerCase();
  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
    return leftNumber - rightNumber;
  }
  return leftText.localeCompare(rightText);
}

function csvValue(value: any, separator: string) {
  const text = String(value ?? '');
  if (text.includes(separator) || text.includes('"') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function escapeHtml(value: any) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
