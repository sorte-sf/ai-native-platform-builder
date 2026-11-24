
export interface BuilderApplication {
    id: string;
    tenantId: string;
    key: string;
    name: string;
    icon?: string | null;
    description?: string;
    status: string;
    operationalState?: 'Active' | 'Passive' | 'Deleted' | 'Cancelled' | 'Pending';
    canEdit?: boolean;
    createdByUserId?: string | null;
    publishedVersion: string;
    versionNo?: string;
    appliedTemplateVersion?: string | null;
    templateReleaseId?: string | null;
    applicationType?: 'Web' | 'Mobile';
    templateId?: string | null;
    createdAt?: string;
    updatedAt?: string;
    startScreenKey?: string | null;
    pendingDeletion?: { id: string; reason: string; requestedByUserId: string; createdAt: string } | null;
}
