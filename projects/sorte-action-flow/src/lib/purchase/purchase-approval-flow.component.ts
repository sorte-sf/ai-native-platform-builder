import { Component } from '@angular/core';
import { FFlowModule } from '@foblex/flow';

/** Sample approval journey with purpose-built purchase and decision nodes. */
@Component({
  selector: 'sorte-purchase-approval-flow',
  templateUrl: 'purchase-approval-flow.component.html',
  styleUrl: 'purchase-approval-flow.component.scss',
  imports: [FFlowModule],

})
export class PurchaseApprovalFlowComponent { }
