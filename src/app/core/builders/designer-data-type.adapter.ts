import { IDataTypeEnum } from '@core/enums/data-type-enum';

/** Builder API serializes BuilderFieldType as its C# enum name, not as IDataTypeEnum's number. */
export type BuilderFieldType =
  | 'Text' | 'LongText' | 'Integer' | 'Decimal' | 'Boolean' | 'Date' | 'DateTime' | 'Time'
  | 'Email' | 'Phone' | 'Url' | 'SelectionBox' | 'Checkbox' | 'RadioButton' | 'Lookup'
  | 'File' | 'UploadFile' | 'Choice' | 'MultiChoice' | 'User';

const toApi: Partial<Record<IDataTypeEnum, BuilderFieldType>> = {
  [IDataTypeEnum.Text]: 'Text',
  [IDataTypeEnum.TextArea]: 'LongText',
  [IDataTypeEnum.Number]: 'Decimal',
  [IDataTypeEnum.Boolean]: 'Boolean',
  [IDataTypeEnum.DateOnly]: 'Date',
  [IDataTypeEnum.DateTime]: 'DateTime',
  [IDataTypeEnum.TimeOnly]: 'Time',
  [IDataTypeEnum.Email]: 'Email',
  [IDataTypeEnum.Phone]: 'Phone',
  [IDataTypeEnum.Url]: 'Url',
  [IDataTypeEnum.MultipleSelection]: 'Choice',
  [IDataTypeEnum.File]: 'File',
  [IDataTypeEnum.FileUpload]: 'UploadFile',
  [IDataTypeEnum.Image]: 'File'
};

const fromApi: Record<BuilderFieldType, IDataTypeEnum> = {
  Text: IDataTypeEnum.Text, LongText: IDataTypeEnum.TextArea,
  Integer: IDataTypeEnum.Number, Decimal: IDataTypeEnum.Number,
  Boolean: IDataTypeEnum.Boolean, Date: IDataTypeEnum.DateOnly,
  DateTime: IDataTypeEnum.DateTime, Time: IDataTypeEnum.TimeOnly,
  Email: IDataTypeEnum.Email, Phone: IDataTypeEnum.Phone, Url: IDataTypeEnum.Url,
  SelectionBox: IDataTypeEnum.MultipleSelection, Checkbox: IDataTypeEnum.Boolean,
  RadioButton: IDataTypeEnum.MultipleSelection, Lookup: IDataTypeEnum.Text,
  File: IDataTypeEnum.File, UploadFile: IDataTypeEnum.FileUpload,
  Choice: IDataTypeEnum.MultipleSelection, MultiChoice: IDataTypeEnum.MultipleSelection,
  User: IDataTypeEnum.Text
};

export function fromBuilderFieldType(type: BuilderFieldType): IDataTypeEnum {
  return fromApi[type] ?? IDataTypeEnum.Text;
}

export function toBuilderFieldType(type: IDataTypeEnum, unchangedType?: BuilderFieldType): BuilderFieldType {
  if (unchangedType && fromBuilderFieldType(unchangedType) === type) return unchangedType;
  const mapped = toApi[type];
  if (!mapped) throw new Error(`Data type ${IDataTypeEnum[type]} is not supported by the Builder API.`);
  return mapped;
}
