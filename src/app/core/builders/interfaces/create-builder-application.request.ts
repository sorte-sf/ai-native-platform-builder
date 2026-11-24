
import { BuilderFieldType } from '../designer-data-type.adapter';
export interface InitialApplicationModule { key: string; name: string; screenKey: string; icon?: string; description?: string; visible: boolean; }

export interface CreateBuilderApplicationRequest {
    tenantId: string;
    key: string;
    name: string;
    description?: string;
    applicationType: 'Web' | 'Mobile';
    templateId?: string | null;
    icon?: string | null;
    versionNo?: string;
    initialScreen?: { key: string; title: string; htmlContent: string };
    themeJson?: string;
    modules?: InitialApplicationModule[];
    initialForm?: {
        objectKey: string;
        objectName: string;
        formKey: string;
        formName: string;
        layoutJson: string;
        fields: Array<{
            key: string; label: string; type: BuilderFieldType; sortOrder: number;
            required: boolean; searchable: boolean; readOnly: boolean;
            configurationJson?: string | null;
        }>;
    };
}
