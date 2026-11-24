import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SignalRState } from '@app/core/enums/signalr-state';
import { SignalRService } from '@app/core/services/signalr.service';
import { TranslocoModule } from '@jsverse/transloco';

import { Observable } from 'rxjs';

@Component({
    selector: 'signalr-connection',
    templateUrl: './signalr-connection.component.html',
    styleUrls: ['./signalr-connection.component.scss'],
    imports: [
        CommonModule,
        MatTooltipModule,
        TranslocoModule
    ]
})
export class SignalRConnectionComponent implements OnInit {

    signalRState$!: Observable<SignalRState>;
    signalRState = SignalRState;

    private signalRService = inject(SignalRService);

    ngOnInit(): void {
        this.signalRState$ = this.signalRService.signalRStatus$;
    }

}
