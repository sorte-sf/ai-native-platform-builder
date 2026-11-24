import '@angular/compiler';
import { describe, it, expect } from 'vitest';
import { ApplicationCreateComponent } from './application-create.component';

describe('unified application creation', () => {
  for (const templateId of [null, 'starter-id']) {
    it(`creates ${templateId ? 'a template application without a blank-page override' : 'a blank application with its home page'}`, () => {
      let payload: Record<string, unknown> | undefined;
      const context = {
        saving: Object.assign(() => false, { set: () => {} }), loadingTemplate: () => false,
        templateAvailable: () => true, templateId, canCreate: true,
        error: { set: () => {} }, auth: { tenantId: () => 'tenant-id' },
        form: { markAllAsTouched: () => {}, invalid: false, controls: { name: { value: 'CRM' } },
          getRawValue: () => ({ name: 'CRM', key: 'crm', applicationType: 'Web', versionNo: '0.0.1' }) },
        api: { createApplication: (request: Record<string, unknown>) => {
          payload = request; return { subscribe: () => {} };
        } }
      };
      ApplicationCreateComponent.prototype.create.call(context as unknown as ApplicationCreateComponent);
      expect(payload?.['templateId']).toBe(templateId);
      expect(payload?.['versionNo']).toBe('0.0.1');
      if (templateId) expect(payload).not.toHaveProperty('initialScreen');
      else expect(payload?.['initialScreen']).toEqual({ key: 'home', title: 'HomePage', htmlContent: '' });
      expect(payload).not.toHaveProperty('initialForm');
    });
  }
});
