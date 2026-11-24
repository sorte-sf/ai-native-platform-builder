import { RuntimeFormField } from "./runtime-form-field";
 
export interface RuntimeFormDefinition {
    formId: string;
    objectId: string;
    key: string;
    name: string;
    layoutJson?: string | null;
    fields: RuntimeFormField[];
}

