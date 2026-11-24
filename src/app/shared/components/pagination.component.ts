import { Component, inject, input, output } from '@angular/core';
import { TranslocoModule, TranslocoPipe } from '@jsverse/transloco';
import { BlockPaginationService } from './block-pagination.service';
import type { PageNode } from '@core/builders/page-blocks';
@Component({
  selector: 'ant-block-pagination',
  templateUrl: './pagination.component.html',
  imports: [TranslocoModule,],
})
export class PaginationComponent {
  readonly node = input<PageNode | null>(null);
  readonly page = input(1);
  readonly pageSize = input(10);
  readonly total = input(0);
  readonly pageChange = output<number>();
  readonly paging = inject(BlockPaginationService);
  state() {
    const node = this.node();
    return node ? this.paging.state()[node.targetNodeId ?? node.id] : { page: this.page(), pageSize: this.pageSize(), total: this.total() };
  }
  move(offset: number) {
    const node = this.node();
    if (node) this.paging.move(node.targetNodeId ?? node.id, offset);
    else this.pageChange.emit(Math.max(1, Math.min(this.page() + offset, Math.max(1, Math.ceil(this.total() / this.pageSize())))));
  }
}
