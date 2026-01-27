import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type {
  ArrayFieldDescriptionProps,
  ArrayFieldItemButtonsTemplateProps,
  ArrayFieldItemTemplateProps,
  ArrayFieldTemplateProps,
  ArrayFieldTitleProps,
  IconButtonProps,
  Registry,
  UiSchema,
} from '@rjsf/utils';
import type { ComponentType } from 'react';
import { buttonId } from '@rjsf/utils';
import { formpackTemplates } from '../../../src/lib/rjsfTemplates';

const ArrayFieldTemplate =
  formpackTemplates.ArrayFieldTemplate as ComponentType<ArrayFieldTemplateProps>;
const ArrayFieldItemTemplate =
  formpackTemplates.ArrayFieldItemTemplate as ComponentType<ArrayFieldItemTemplateProps>;
const AddButton = formpackTemplates.ButtonTemplates
  ?.AddButton as ComponentType<IconButtonProps>;
const RemoveButton = formpackTemplates.ButtonTemplates
  ?.RemoveButton as ComponentType<IconButtonProps>;
const MoveUpButton = formpackTemplates.ButtonTemplates
  ?.MoveUpButton as ComponentType<IconButtonProps>;
const MoveDownButton = formpackTemplates.ButtonTemplates
  ?.MoveDownButton as ComponentType<IconButtonProps>;
const CopyButton = formpackTemplates.ButtonTemplates
  ?.CopyButton as ComponentType<IconButtonProps>;

const createTemplateButton = (
  label: string,
): ComponentType<IconButtonProps> => {
  return ({ children, className, id, onClick, disabled }: IconButtonProps) => (
    <button
      type="button"
      id={id}
      className={className}
      onClick={onClick}
      disabled={disabled}
    >
      {children ?? label}
    </button>
  );
};

const defaultTitleTemplate = ({
  title,
  optionalDataControl,
}: ArrayFieldTitleProps) => (
  <div data-testid="array-title">
    <span data-testid="array-title-text">{title}</span>
    {optionalDataControl}
  </div>
);

const defaultDescriptionTemplate = ({
  description,
}: ArrayFieldDescriptionProps) => (
  <div data-testid="array-description">{description}</div>
);

const createRegistry = ({
  formContext = {},
  titleTemplate = defaultTitleTemplate,
  descriptionTemplate = defaultDescriptionTemplate,
}: {
  formContext?: unknown;
  titleTemplate?: ComponentType<ArrayFieldTitleProps>;
  descriptionTemplate?: ComponentType<ArrayFieldDescriptionProps>;
} = {}): Registry =>
  ({
    fields: {},
    templates: {
      ArrayFieldTemplate,
      ArrayFieldItemButtonsTemplate: (() =>
        null) as ComponentType<ArrayFieldItemButtonsTemplateProps>,
      ArrayFieldItemTemplate,
      ArrayFieldTitleTemplate: titleTemplate,
      ArrayFieldDescriptionTemplate: descriptionTemplate,
      BaseInputTemplate: (() => null) as ComponentType<unknown>,
      DescriptionFieldTemplate: (() => null) as ComponentType<unknown>,
      ErrorListTemplate: (() => null) as ComponentType<unknown>,
      FallbackFieldTemplate: (() => null) as ComponentType<unknown>,
      FieldErrorTemplate: (() => null) as ComponentType<unknown>,
      FieldHelpTemplate: (() => null) as ComponentType<unknown>,
      FieldTemplate: (() => null) as ComponentType<unknown>,
      GridTemplate: (() => null) as ComponentType<unknown>,
      MultiSchemaFieldTemplate: (() => null) as ComponentType<unknown>,
      ObjectFieldTemplate: (() => null) as ComponentType<unknown>,
      OptionalDataControlsTemplate: (() => null) as ComponentType<unknown>,
      TitleFieldTemplate: (() => null) as ComponentType<unknown>,
      UnsupportedFieldTemplate: (() => null) as ComponentType<unknown>,
      WrapIfAdditionalTemplate: (() => null) as ComponentType<unknown>,
      ButtonTemplates: {
        AddButton: createTemplateButton('Add'),
        RemoveButton: createTemplateButton('Remove'),
        MoveUpButton,
        MoveDownButton,
        CopyButton,
        SubmitButton: () => null,
        ClearButton: () => null,
      },
    },
    widgets: {},
    formContext,
    rootSchema: {},
    schemaUtils: {} as Registry['schemaUtils'],
    translateString: (key: string) => key,
    globalFormOptions: { idPrefix: 'root', idSeparator: '_' },
  }) as unknown as Registry;

const createArrayFieldProps = (
  registry: Registry,
  overrides: Partial<ArrayFieldTemplateProps> = {},
): ArrayFieldTemplateProps => ({
  canAdd: true,
  className: 'array-class',
  disabled: false,
  fieldPathId: { $id: 'root_array', path: ['array'] },
  items: [<div key="item-0">Item</div>],
  onAddClick: vi.fn(),
  readonly: false,
  registry,
  required: false,
  schema: { type: 'array', description: 'Schema description' },
  title: 'Array title',
  uiSchema: {},
  ...overrides,
});

const createItemButtonsProps = (
  registry: Registry,
  overrides: Partial<ArrayFieldItemButtonsTemplateProps> = {},
): ArrayFieldItemButtonsTemplateProps => ({
  schema: {},
  uiSchema: {},
  registry,
  fieldPathId: { $id: 'root_array_0', path: ['array', 0] },
  canAdd: false,
  hasCopy: false,
  hasMoveDown: false,
  hasMoveUp: false,
  hasRemove: true,
  index: 0,
  totalItems: 1,
  onAddItem: vi.fn(),
  onCopyItem: vi.fn(),
  onMoveDownItem: vi.fn(),
  onMoveUpItem: vi.fn(),
  onRemoveItem: vi.fn(),
  ...overrides,
});

const createArrayItemProps = (
  registry: Registry,
  overrides: Partial<ArrayFieldItemTemplateProps> = {},
): ArrayFieldItemTemplateProps => ({
  schema: {},
  uiSchema: {},
  registry,
  children: <div data-testid="array-item-content">Content</div>,
  buttonsProps: createItemButtonsProps(registry),
  className: 'item-class',
  hasToolbar: true,
  index: 0,
  totalItems: 1,
  itemKey: 'item-0',
  ...overrides,
});

describe('rjsfTemplates', () => {
  const addTranslationKey = 'translated:common.add';
  const addMedicationLabel = 'add:Medication';
  const optionalControlTestId = 'optional-control';

  it('uses the fallback translator when no form context is provided', () => {
    const registry = createRegistry();
    render(<AddButton registry={registry} />);

    const button = screen.getByRole('button', { name: 'common.add' });
    expect(button).toHaveClass('app__button', 'formpack-array-button');
  });

  it('uses translated labels for add/remove buttons', () => {
    const addTranslation = addTranslationKey;
    const removeTranslation = 'translated:common.remove';
    const t = vi.fn((key: string) => `translated:${key}`);
    const registry = createRegistry({ formContext: { t } });
    const { rerender } = render(<AddButton registry={registry} />);

    expect(
      screen.getByRole('button', { name: addTranslation }),
    ).toBeInTheDocument();

    rerender(<RemoveButton registry={registry} />);
    expect(
      screen.getByRole('button', { name: removeTranslation }),
    ).toBeInTheDocument();
  });

  it('prefers custom children for translated buttons and merges class names', () => {
    const t = vi.fn((key: string) => `translated:${key}`);
    const registry = createRegistry({ formContext: { t } });
    render(
      <AddButton registry={registry} className="custom-class">
        Custom label
      </AddButton>,
    );

    const button = screen.getByRole('button', { name: 'Custom label' });
    expect(button).toHaveClass(
      'app__button',
      'formpack-array-button',
      'custom-class',
    );
  });

  it('renders array template with translated add label and optional control in the title', () => {
    const t = vi.fn((key: string, options?: { item?: string }) => {
      if (key === 'common.addItemWithTitle') {
        return `add:${options?.item ?? 'unknown'}`;
      }
      return key;
    });
    const optionalControl = <span data-testid={optionalControlTestId} />;
    const registry = createRegistry({ formContext: { t } });
    const uiSchema: UiSchema = {
      'ui:title': 'Medication',
      'ui:description': 'Ui description',
    };
    const props = createArrayFieldProps(registry, {
      uiSchema,
      optionalDataControl: optionalControl,
      items: [<div key="item-0">Item</div>],
    });

    render(<ArrayFieldTemplate {...props} />);

    expect(screen.getByTestId('array-title')).toHaveTextContent('Medication');
    expect(
      screen.getByRole('button', { name: addMedicationLabel }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('array-description')).toHaveTextContent(
      'Ui description',
    );
    expect(screen.getByTestId(optionalControlTestId)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: addMedicationLabel }),
    ).toHaveAttribute('id', buttonId(props.fieldPathId, 'add'));
  });

  it('renders optional control outside the title when readonly and hides add button', () => {
    const t = vi.fn((key: string) => key);
    const optionalControl = <span data-testid={optionalControlTestId} />;
    const registry = createRegistry({ formContext: { t } });
    const props = createArrayFieldProps(registry, {
      readonly: true,
      canAdd: false,
      optionalDataControl: optionalControl,
    });

    render(<ArrayFieldTemplate {...props} />);

    const title = screen.getByTestId('array-title');
    expect(
      within(title).queryByTestId(optionalControlTestId),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId(optionalControlTestId)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'common.add' })).toBeNull();
  });

  it('renders array item title using parent ui:title and disables remove button', () => {
    const t = vi.fn(
      (key: string, options?: { item?: string; index?: number }) => {
        if (key === 'common.item') {
          return 'Item';
        }
        if (key === 'common.itemWithIndex') {
          return `${options?.item ?? 'Item'} ${options?.index ?? 0}`;
        }
        if (key === 'common.remove') {
          return 'Remove';
        }
        return key;
      },
    );
    const registry = createRegistry({ formContext: { t } });
    const props = createArrayItemProps(registry, {
      index: 1,
      buttonsProps: createItemButtonsProps(registry, {
        hasRemove: true,
        readonly: true,
      }),
      parentUiSchema: { 'ui:title': 'Medication' },
    });

    render(<ArrayFieldItemTemplate {...props} />);

    expect(
      screen.getByText('Medication 2', { selector: 'p' }),
    ).toBeInTheDocument();
    const removeButton = screen.getByRole('button', { name: 'Remove' });
    expect(removeButton).toBeDisabled();
  });

  it('uses the generic add label when no array title is provided', () => {
    const addTranslation = addTranslationKey;
    const t = vi.fn((key: string) => `translated:${key}`);
    const registry = createRegistry({ formContext: { t } });
    const props = createArrayFieldProps(registry, { title: '' });

    render(<ArrayFieldTemplate {...props} />);

    expect(
      screen.getByRole('button', { name: addTranslation }),
    ).toBeInTheDocument();
  });

  it('renders item title with default translation when no parent title exists', () => {
    const t = vi.fn(
      (key: string, options?: { item?: string; index?: number }) => {
        if (key === 'common.item') {
          return 'Item';
        }
        if (key === 'common.itemWithIndex') {
          return `${options?.item ?? 'Item'} ${options?.index ?? 0}`;
        }
        return key;
      },
    );
    const registry = createRegistry({ formContext: { t } });
    const props = createArrayItemProps(registry, {
      index: 0,
      parentUiSchema: undefined,
    });

    render(<ArrayFieldItemTemplate {...props} />);

    expect(screen.getByText('Item 1', { selector: 'p' })).toBeInTheDocument();
  });

  it('omits the remove button when it is not available', () => {
    const t = vi.fn((key: string) => key);
    const registry = createRegistry({ formContext: { t } });
    const props = createArrayItemProps(registry, {
      buttonsProps: createItemButtonsProps(registry, {
        hasRemove: false,
      }),
    });

    render(<ArrayFieldItemTemplate {...props} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('disables copy and move buttons in the template registry', () => {
    const registry = createRegistry();
    const props = { registry } as IconButtonProps;

    const { container: moveUpContainer } = render(<MoveUpButton {...props} />);
    expect(moveUpContainer).toBeEmptyDOMElement();
    const { container: moveDownContainer } = render(
      <MoveDownButton {...props} />,
    );
    expect(moveDownContainer).toBeEmptyDOMElement();
    const { container: copyContainer } = render(<CopyButton {...props} />);
    expect(copyContainer).toBeEmptyDOMElement();
  });
});
