import { CurrencyPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import {
  MOCK_ELITE_CREDIT_BUNDLES,
  MOCK_SUBSCRIPTION_PLANS,
  type MockPlan
} from './subscription-mock.data';

@Component({
  selector: 'ant-subscription-page',
  templateUrl: './subscription-page.component.html',
  styleUrl: './subscription-page.component.scss',
  imports: [TranslocoModule, RouterLink, CurrencyPipe]
})
export class SubscriptionPageComponent {
  readonly plans = MOCK_SUBSCRIPTION_PLANS;
  readonly eliteBundles = MOCK_ELITE_CREDIT_BUNDLES;
  readonly selectedEliteBundleId = signal(this.eliteBundles[0].id);
  readonly selectedEliteBundle = computed(() =>
    this.eliteBundles.find(bundle => bundle.id === this.selectedEliteBundleId()) ?? this.eliteBundles[0]
  );
  readonly selectedPlanId = signal('');

  selectEliteBundle(event: Event): void {
    this.selectedEliteBundleId.set((event.target as HTMLSelectElement).value);
  }

  messageCredits(plan: MockPlan): string {
    return plan.elite ? this.selectedEliteBundle().messageCredits : plan.messageCredits;
  }

  integrationCredits(plan: MockPlan): string {
    return plan.elite ? this.selectedEliteBundle().integrationCredits : plan.integrationCredits;
  }

  requestPlan(plan: MockPlan): void {
    this.selectedPlanId.set(plan.id);
  }
}
