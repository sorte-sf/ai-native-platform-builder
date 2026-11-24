import { BooleanInput, coerceBooleanProperty } from '@angular/cdk/coercion';
import { CommonModule, NgClass } from '@angular/common';

import {
    Component,
    HostBinding,
    Input,
    OnChanges,
    SimpleChanges,
    ViewEncapsulation,
} from '@angular/core';

import { antsoftAnimations } from '@shared/animations';

import { AntsoftCardFace } from './flippable-card.types';

@Component({
    selector: 'antsoft-card',
    templateUrl: './flippable-card.component.html',
    styleUrls: ['./flippable-card.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: antsoftAnimations,
    exportAs: 'antsoftCard',
    imports: [],
})
export class AntsoftCardComponent implements OnChanges {
    /* eslint-disable @typescript-eslint/naming-convention */
    static ngAcceptInputType_expanded: BooleanInput;
    static ngAcceptInputType_flippable: BooleanInput;
    /* eslint-enable @typescript-eslint/naming-convention */

    @Input() expanded: boolean = false;
    @Input() face: AntsoftCardFace = 'front';
    @Input() flippable: boolean = false;

    @Input() dropShadow: boolean = false;

    @HostBinding('class') get classList(): any {
        /* eslint-disable @typescript-eslint/naming-convention */
        return {
            'antsoft-card-expanded': this.expanded,
            'antsoft-card-face-back': this.flippable && this.face === 'back',
            'antsoft-card-face-front': this.flippable && this.face === 'front',
            'antsoft-card-flippable': this.flippable,
        };
        /* eslint-enable @typescript-eslint/naming-convention */
    }

    ngOnChanges(changes: SimpleChanges): void {
        // Expanded
        if ('expanded' in changes) {
            // Coerce the value to a boolean
            this.expanded = coerceBooleanProperty(
                changes['expanded'].currentValue
            );
        }

        // Flippable
        if ('flippable' in changes) {
            // Coerce the value to a boolean
            this.flippable = coerceBooleanProperty(
                changes['flippable'].currentValue
            );
        }
    }
}
