import { Injectable } from '@angular/core';
import type { FormConfig } from '@ng-forge/dynamic-forms';
import { dropdownConfiguration, staticDropdownOptions } from '@core/builders/dropdown-options.service';
import { fieldStyleClass, sanitizeElementStyle } from '@core/builders/element-styling';

export type PlatformFieldType = 'text' | 'textarea' | 'email' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect';

export interface PlatformFieldDefinition {
  key: string;
  type: PlatformFieldType;
  label: string;
  value?: unknown;
  required?: boolean;
  options?: Array<{ label: string; value: string | number | boolean }>;
  props?: Record<string, unknown>;
}

export interface PlatformFormDefinition {
  fields: PlatformFieldDefinition[];
}

export interface BuilderFormFieldDefinition {
  key: string;
  label: string;
  type: string;
  required: boolean;
  readOnly: boolean;
  configurationJson?: string | null;
}

/** Converts platform-owned metadata into ng-forge configuration.
 * The backend remains independent of ng-forge's types and API.
 */
@Injectable({ providedIn: 'root' })
export class PlatformFormService {
  /** The same conversion is used by the designer when saving and the runtime when rendering. */
  fromBuilderFields(fields: BuilderFormFieldDefinition[]): FormConfig {
    const config = this.toDynamicFormConfig({ fields: fields.filter(field => !this.isDisplayImage(field)).map(field => {
      const configuration = this.parseConfiguration(field.configurationJson);
      return {
        key: field.key,
        label: field.label,
        type: this.builderType(field.type),
        required: field.required,
        options: configuration.options,
        props: { ...configuration.props, disabled: field.readOnly }
      };
    }) });
    return { ...config, designerFieldStyles: Object.fromEntries(fields.map(field => {
      try { return [field.key, sanitizeElementStyle(JSON.parse(field.configurationJson ?? '{}').styling)]; }
      catch { return [field.key, {}]; }
    })) } as FormConfig;
  }

  private isDisplayImage(field: BuilderFormFieldDefinition): boolean {
    if (field.type !== 'File' || !field.configurationJson) return false;
    try { return (JSON.parse(field.configurationJson) as { kind?: string }).kind === 'image'; }
    catch { return false; }
  }

  private builderType(type: string): PlatformFieldType {
    if (type === 'LongText') return 'textarea';
    if (type === 'Integer' || type === 'Decimal') return 'number';
    if (type === 'Boolean') return 'boolean';
    if (type === 'Choice' || type === 'SelectionBox' || type === 'RadioButton' || type === 'Lookup') return 'select';
    if (type === 'MultiChoice') return 'multiselect';
    if (type === 'Date' || type === 'DateTime') return 'date';
    if (type === 'Email') return 'email';
    return 'text';
  }

  private parseConfiguration(value?: string | null): { options?: PlatformFieldDefinition['options']; props: Record<string, unknown> } {
    if (!value) return { props: {} };
    try {
      const config = JSON.parse(value) as { options?: Array<string | { label: string; value: string | number | boolean }>; placeholder?: string; min?: number; max?: number; minLength?: number; maxLength?: number; pattern?: string };
      const dropdown = dropdownConfiguration(value);
      const options = dropdown.source === 'api' ? [] : staticDropdownOptions(dropdown);
      return { options, props: { placeholder: config.placeholder, min: config.min, max: config.max, minLength: config.minLength, maxLength: config.maxLength, pattern: config.pattern } };
    } catch { return { props: {} }; }
  }
  toDynamicFormConfig(definition: PlatformFormDefinition): FormConfig {
    return {
      fields: [
        ...definition.fields.map(field => ({
        key: field.key,
        className: fieldStyleClass(field.key),
        type: this.resolveType(field.type),
        label: field.label,
        value: field.value,
        required: field.required,
        options: field.options,
        props: { ...this.defaultProps(field.type), ...field.props }
      })),
      { type: 'submit', key: 'submit', label: 'Save', props: { color: 'primary' } }
      ]
    } as FormConfig;
  }

  private resolveType(type: PlatformFieldType): string {
    return type === 'text' || type === 'email' || type === 'number' ? 'input' : type === 'date' ? 'datepicker' : type === 'boolean' ? 'checkbox' : type === 'multiselect' ? 'multi-checkbox' : type;
  }

  private defaultProps(type: PlatformFieldType): Record<string, unknown> {
    if (type === 'email') return { type: 'email' };
    if (type === 'number') return { type: 'number' };
    return {};
  }
}
