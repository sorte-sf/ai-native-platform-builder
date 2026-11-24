import { DesignerField } from "./designer-field";

export interface DesignerObject {
    id: string;
    key: string;
    name: string;
    status: string;
    formId?: string | null;
    formKey?: string | null;
    formName?: string | null;
    layoutJson?: string | null;
    forms?: { id: string; key: string; name: string; layoutJson?: string | null }[];
    fields: DesignerField[];
}

