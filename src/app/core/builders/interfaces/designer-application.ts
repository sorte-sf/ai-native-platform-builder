import { DesignerObject } from "./designer-object";

export interface DesignerApplication {
    id: string;
    tenantId: string;
    key: string;
    name: string;
    status: string;
    createdByUserId?: string | null;
    objects: DesignerObject[];
    modules?: { id: string; key: string; name: string; screenId?: string | null; objectId?: string | null; formId?: string | null; design?: DesignerObject | null }[];
    templateId?: string | null;
    templateHtml?: string | null;
    templateScss?: string | null;
}
