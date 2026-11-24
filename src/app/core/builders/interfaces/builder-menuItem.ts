export interface BuilderMenuItem {
    id: string;
    tenantId: string;
    applicationId: string;
    parentId?: string | null;
    moduleId?: string | null;
    key: string;
    label: string;
    route?: string;
    icon?: string;
    sortOrder: number;
    visible: boolean;
    permissionKey?: string;
}
