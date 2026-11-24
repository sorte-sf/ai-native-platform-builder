import { TranslocoPipe } from '@jsverse/transloco';
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { IconModel } from '../../models/icon-model';
import { IconService } from '../../services/icon.service';
import { FilterPipe } from '@app/shared/pipe/filter.pipe';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  standalone: true,
  selector: 'ant-icon-list',
  templateUrl: './fa-icon-list.component.html',
  styleUrls: ['./fa-icon-list.component.scss'],
  imports: [TranslocoPipe, 
    CommonModule,
    FormsModule,

    MatInputModule,
    MatDividerModule,
    MatButtonModule,

    FontAwesomeModule,

    FilterPipe,
  ]
})
export class FaIconListComponent implements OnInit, AfterViewInit {

  searchTerm: string = '';

  constructor(
    public iconService: IconService,
    public dialogRef: MatDialogRef<FaIconListComponent>,
    @Inject(MAT_DIALOG_DATA) public icon: IconModel) {

  }

  ngAfterViewInit(): void {

    setTimeout(() => {
      this.searchTerm = this.icon?.name === 'icons' ? '' : (this.icon?.displayName ?? '');
    }, 500);

  }

  ngOnInit(): void {
  }

  select(icon: IconModel): void {
    this.dialogRef.close(icon);
  }


}
