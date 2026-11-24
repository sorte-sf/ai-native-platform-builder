import { DesignerField } from './designer-field';

export interface FormDesignerSeed {
  objectKey: string;
  objectName: string;
  formKey: string;
  formName: string;
  fields: DesignerField[];
}

export interface FormDesignerDraft extends FormDesignerSeed {
  layoutJson: string;
}
