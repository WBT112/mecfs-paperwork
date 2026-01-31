import type { TemplatesType } from '@rjsf/utils';
import {
  ArrayAddButton,
  ArrayFieldItemTemplate,
  ArrayFieldTemplate,
  ArrayRemoveButton,
  DescriptionFieldTemplate,
  FieldHelpTemplate,
} from './rjsfTemplateComponents';

export type { FormpackFormContext } from './rjsfTemplateComponents';

/**
 * Templates for array actions to keep controls labeled and accessible.
 */
type FormpackTemplates = Partial<Omit<TemplatesType, 'ButtonTemplates'>> & {
  ButtonTemplates?: Partial<TemplatesType['ButtonTemplates']>;
};

export const formpackTemplates: FormpackTemplates = {
  ArrayFieldTemplate,
  ArrayFieldItemTemplate,
  DescriptionFieldTemplate,
  FieldHelpTemplate,
  // RATIONALE: Array item reordering and copying are disabled by design.
  // The UI prioritizes simplicity and predictable data entry over complex
  // array management. Most use cases involve append-only data entry.
  ButtonTemplates: {
    AddButton: ArrayAddButton,
    RemoveButton: ArrayRemoveButton,
    MoveUpButton: () => null,
    MoveDownButton: () => null,
    CopyButton: () => null,
  },
};
