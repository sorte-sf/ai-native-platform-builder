import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UtilityService } from '@core/services/utility.service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

@Component({
    selector: 'ant-icon-resolver',
    templateUrl: './icon-resolver.component.html',
    styleUrls: ['./icon-resolver.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,

        FontAwesomeModule,
    ]
})
export class IconResolverComponent {

    @Input() icon: any;
    @Input() iconSize: any;
    @Input() iconColor: any = '#000000';

    private utilityService = inject(UtilityService);

    get(): any {
        return this.utilityService.resolveIcon(this.icon);
    }

}
