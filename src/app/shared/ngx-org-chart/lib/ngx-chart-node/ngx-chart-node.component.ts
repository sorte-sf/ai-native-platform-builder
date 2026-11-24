import { Component, EventEmitter, inject, Input, Output } from '@angular/core';

import { INode } from '../node';
import { CommonModule, NgClass, NgIf, NgStyle } from '@angular/common';
import { GetPhotoService } from '@app/core/services/get-photo.service';

@Component({
  selector: 'ngx-chart-node',
  templateUrl: './ngx-chart-node.component.html',
  styleUrls: ['./ngx-chart-node.component.scss'],
  standalone: true,
  imports: [CommonModule, NgClass, ]
})
export class NgxChartNodeComponent {

  @Input()
  node?: INode;

  @Input()
  hasParent = false;

  @Input()
  direction: 'vertical' | 'horizontal' = 'vertical';

  @Output() itemClick = new EventEmitter<INode>();

  private _getPhotoService = inject(GetPhotoService);

  public getPhoto(item: any): string {
    return this._getPhotoService.photoLink(item.id);
  }

}
