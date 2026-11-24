export interface BuilderTemplate {
    id: string;
    key?: string;
    category?: string;
    blueprintVersion?: string;
    previewImageUrl?: string | null;
    name: string;
    description?: string;
    htmlContent: string;
    scssContent: string;
    manifestJson?: string | null;
    themeJson?: string | null;
    manifestVersion?: number;
    isBuiltIn?: boolean;
    baseTemplate?: string | null;
}
