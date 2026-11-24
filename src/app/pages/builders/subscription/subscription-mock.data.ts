import type { TenantSubscriptionUsage } from '@core/builders/builders-api.service';

export interface MockPlan {
  id: string;
  titleKey: string;
  monthlyPrice: number;
  regularPrice?: number;
  messageCredits: string;
  integrationCredits: string;
  featureKeys: string[];
  popular?: boolean;
  elite?: boolean;
}

const starterFeatures = [
  'subscription.features.freeDomain',
  'subscription.features.unlimitedApps',
  'subscription.features.collaborators',
  'subscription.features.customDomain',
  'subscription.features.removeBranding'
];

const builderFeatures = [
  ...starterFeatures,
  'subscription.features.builtInIntegrations',
  'subscription.features.workflows',
  'subscription.features.chooseAiModel',
  'subscription.features.codeEditing',
  'subscription.features.githubSync'
];

const proFeatures = [
  ...builderFeatures,
  'subscription.features.privateTemplates',
  'subscription.features.managedConnections',
  'subscription.features.aiVisibility',
  'subscription.features.earlyAccess'
];

export const MOCK_SUBSCRIPTION_PLANS: MockPlan[] = [
  {
    id: 'starter', titleKey: 'subscription.plans.starter', monthlyPrice: 16,
    messageCredits: '100', integrationCredits: '2k', featureKeys: starterFeatures
  },
  {
    id: 'builder', titleKey: 'subscription.plans.builder', monthlyPrice: 28, regularPrice: 40,
    messageCredits: '250', integrationCredits: '10k', featureKeys: builderFeatures, popular: true
  },
  {
    id: 'pro', titleKey: 'subscription.plans.pro', monthlyPrice: 56, regularPrice: 80,
    messageCredits: '500', integrationCredits: '20k', featureKeys: proFeatures
  },
  {
    id: 'elite', titleKey: 'subscription.plans.elite', monthlyPrice: 112, regularPrice: 160,
    messageCredits: '1.2k', integrationCredits: '50k', featureKeys: [...proFeatures, 'subscription.features.prioritySupport'], elite: true
  }
];

export const MOCK_ELITE_CREDIT_BUNDLES = [
  { id: 'standard', messageCredits: '1.2k', integrationCredits: '50k' },
  { id: 'plus', messageCredits: '2.5k', integrationCredits: '100k' },
  { id: 'max', messageCredits: '5k', integrationCredits: '250k' }
];

export function createMockSubscriptionUsage(tenantId: string): TenantSubscriptionUsage {
  return {
    tenantId,
    hasActiveSubscription: true,
    startsOn: '2026-11-01T00:00:00Z',
    endsOn: '2026-12-01T00:00:00Z',
    applicationsUsed: 1,
    applicationsLimit: 25,
    usersUsed: 0,
    usersLimit: 5,
    integrationsConfigured: 2,
    aiRequestsThisMonth: 12
  };
}
