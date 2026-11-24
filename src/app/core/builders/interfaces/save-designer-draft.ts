import { DesignerField } from "./designer-field";

export interface SaveDesignerDraft {
    tenantId: string;
    applicationId: string;
    moduleId?: string | null;
    pageId?: string | null;
    pageNodeId?: string | null;
    objectId?: string | null;
    objectKey: string;
    objectName: string;
    formId?: string | null;
    formKey: string;
    formName: string;
    layoutJson?: string | null; fields: DesignerField[];
}
