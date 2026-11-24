import type { BuilderFieldType } from '../designer-data-type.adapter';
export interface RuntimeFormField {
    key: string;
    label: string;
    type: BuilderFieldType;
    sortOrder: number;
    required: boolean;
    readOnly: boolean;
    configurationJson?: string | null;
}
