import { BuilderFieldType } from '../designer-data-type.adapter';

export interface DesignerField {
    id?: string;
    key: string;
    label: string;
    type: BuilderFieldType;
    sortOrder: number;
    required: boolean;
    searchable: boolean;
    readOnly: boolean;
    configurationJson?: string | null;
}

