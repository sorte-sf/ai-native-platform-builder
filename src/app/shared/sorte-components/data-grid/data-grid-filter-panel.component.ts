import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faCheck, faMagnifyingGlass, faRotateLeft, faXmark } from '@fortawesome/free-solid-svg-icons';
import type { DataGridColumn, DataGridColumnFilter, DataGridFilterOperator } from './data-grid.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  standalone: true,
  selector: 'ant-data-grid-filter-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './data-grid-filter-panel.component.html',
  imports: [
    CommonModule, 
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,

    TranslocoModule,    
    FontAwesomeModule
  ],
})
export class DataGridFilterPanelComponent {
  readonly icons = {
    accept: faCheck,
    close: faXmark,
    reset: faRotateLeft,
    search: faMagnifyingGlass
  };
  @Input() open = false;
  @Input() search = '';
  @Input() columns: DataGridColumn[] = [];
  @Input() filters: Record<string, DataGridColumnFilter> = {};
  @Input() operators: Array<{ value: DataGridFilterOperator; label: string }> = [];

  @Output() closed = new EventEmitter<void>();
  @Output() searchChanged = new EventEmitter<Event>();
  @Output() filterValueChanged = new EventEmitter<{ column: DataGridColumn; event: Event }>();
  @Output() filterOperatorChanged = new EventEmitter<{ column: DataGridColumn; event: Event }>();
  @Output() filterCleared = new EventEmitter<DataGridColumn>();
  @Output() allFiltersCleared = new EventEmitter<void>();

  columnFilterValue(column: DataGridColumn) {
    return this.filters[String(column.field)]?.value ?? '';
  }

  columnFilterOperator(column: DataGridColumn) {
    return this.filters[String(column.field)]?.operator ?? 'contains';
  }

  columnFilterNeedsNoValue(column: DataGridColumn) {
    const operator = this.columnFilterOperator(column);
    return operator === 'empty' || operator === 'notEmpty';
  }

  hasFilter(column: DataGridColumn) {
    const filter = this.filters[String(column.field)];
    return !!filter && (filter.operator === 'empty' || filter.operator === 'notEmpty' || !!filter.value.trim());
  }
}
