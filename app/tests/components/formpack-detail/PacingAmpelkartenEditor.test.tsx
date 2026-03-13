import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import PacingAmpelkartenEditor, {
  type PacingAmpelkartenEditorProps,
} from '../../../src/pages/formpack-detail/components/PacingAmpelkartenEditor';
import pacingUiSchema from '../../../public/formpacks/pacing-ampelkarten/ui.schema.json';

type CardFieldView = {
  'ui:widget'?: string;
};

type CardView = CardFieldView & {
  canDo?: CardFieldView;
  needHelp?: CardFieldView;
  hint?: CardFieldView;
};

type VariantView = CardFieldView & {
  cards?: {
    green?: CardView;
    yellow?: CardView;
    red?: CardView;
  };
};

type EditorUiSchemaView = {
  meta?: CardFieldView;
  adult?: VariantView;
  child?: VariantView;
};

const MOCK_RJSF_FORM_TEST_ID = 'mock-rjsf-form';
const PREVIEW_HEADING_KEY = 'formpackDocumentPreviewHeading';
const PAGE_WARNING_TITLE_KEY = 'pacing-ampelkarten.editor.pageWarning.title';
const PAGE_WARNING_BODY_KEY = 'pacing-ampelkarten.editor.pageWarning.body';
const ADULT_GREEN_ITEM = 'Adult green';
const CHILD_GREEN_ITEM = 'Child green';

const DummyForm = ({
  children,
  className,
  uiSchema,
}: {
  children?: React.ReactNode;
  className?: string;
  uiSchema?: unknown;
}) => (
  <div data-testid={MOCK_RJSF_FORM_TEST_ID} className={className}>
    <div data-testid="ui-schema">{JSON.stringify(uiSchema)}</div>
    {children}
  </div>
);

const introTexts = {
  title: 'Intro title',
  body: 'Intro body',
  checkboxLabel: 'Accept',
  reopenButtonLabel: 'Hinweise anzeigen',
  startButtonLabel: 'Weiter',
} as const;

const defaultEditorActions = {
  onApplyDummyData: vi.fn(),
  onApplyProfile: vi.fn(),
  onCloseIntroModal: vi.fn(),
  onConfirmIntroGate: vi.fn(),
  onFormChange: vi.fn(),
  onFormSubmit: vi.fn(),
  onOpenIntroModal: vi.fn(),
  onProfileSaveToggle: vi.fn(),
};

const createProps = (
  overrides: Partial<PacingAmpelkartenEditorProps> = {},
): PacingAmpelkartenEditorProps => ({
  FormComponent: DummyForm as never,
  activeRecordExists: true,
  closeLabel: 'Schließen',
  documentPreview: <div>preview-body</div>,
  emptyMessage: 'No record',
  emptyPreviewLabel: 'empty-preview',
  exportActions: <div>export-actions</div>,
  formClassName: 'formpack-form formpack-form--pacing-ampelkarten',
  formContentRef: { current: null },
  formContext: { t: ((key: string) => key) as never },
  formData: {
    meta: { variant: 'adult' },
    adult: { cards: { green: { canDo: [ADULT_GREEN_ITEM] } } },
    child: { cards: { green: { canDo: [CHILD_GREEN_ITEM] } } },
    sender: { signature: 'Family' },
  },
  formSchema: { type: 'object', properties: {} },
  hasDocumentContent: true,
  introGateEnabled: true,
  introTexts,
  isIntroGateVisible: false,
  isIntroModalOpen: false,
  loadingLabel: 'Loading',
  profileApplyDummyLabel: 'Dummy',
  profileApplyLabel: 'Apply',
  profileHasSavedData: true,
  profileSaveEnabled: false,
  profileStatus: null,
  profileStatusSuccessText: 'success',
  profileToggleLabel: 'Save profile',
  showDevSections: false,
  t: (key) => key,
  tFormpack: (key) => key,
  templates: {},
  uiSchema: pacingUiSchema,
  validator: {} as never,
  ...defaultEditorActions,
  ...overrides,
});

const parseRenderedUiSchema = (): EditorUiSchemaView => {
  const uiSchemaText = screen.getByTestId('ui-schema').textContent;
  if (!uiSchemaText) {
    throw new Error('Expected rendered ui schema');
  }
  return JSON.parse(uiSchemaText) as EditorUiSchemaView;
};

describe('PacingAmpelkartenEditor', () => {
  it('renders the empty state when no active record exists', () => {
    render(
      <PacingAmpelkartenEditor
        {...createProps({ activeRecordExists: false })}
      />,
    );

    expect(screen.getByText('No record')).toBeInTheDocument();
  });

  it('renders the intro gate before the editor flow', () => {
    render(
      <PacingAmpelkartenEditor
        {...createProps({ isIntroGateVisible: true })}
      />,
    );

    expect(screen.getByText('Intro title')).toBeInTheDocument();
    expect(
      screen.queryByTestId(MOCK_RJSF_FORM_TEST_ID),
    ).not.toBeInTheDocument();
  });

  it('returns null while required form dependencies are missing', () => {
    const { container } = render(
      <PacingAmpelkartenEditor {...createProps({ validator: null })} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('keeps preview hidden until the final step', async () => {
    render(<PacingAmpelkartenEditor {...createProps()} />);

    expect(
      screen.getByRole('radio', {
        name: /pacing-ampelkarten\.meta\.variant\.option\.adult/,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('export-actions')).not.toBeInTheDocument();
    expect(
      screen.queryByText('formpackDocumentPreviewHeading'),
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', {
        name: /pacing-ampelkarten\.editor\.steps\.green\.label/,
      }),
    );

    expect(
      screen.getByRole('heading', {
        name: 'pacing-ampelkarten.adult.cards.green.title',
      }),
    ).toBeInTheDocument();

    const greenSchema = parseRenderedUiSchema();
    expect(
      greenSchema.adult?.cards?.green?.canDo?.['ui:widget'],
    ).toBeUndefined();
    expect(
      greenSchema.adult?.cards?.green?.needHelp?.['ui:widget'],
    ).toBeUndefined();
    expect(greenSchema.adult?.cards?.green?.hint?.['ui:widget']).toBe(
      'textarea',
    );

    await userEvent.click(
      screen.getByRole('button', {
        name: /pacing-ampelkarten\.editor\.steps\.preview\.label/,
      }),
    );

    expect(
      screen.queryByTestId(MOCK_RJSF_FORM_TEST_ID),
    ).not.toBeInTheDocument();
    expect(screen.getByText('export-actions')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: PREVIEW_HEADING_KEY }),
    ).toBeInTheDocument();
    expect(screen.getByText('preview-body')).toBeInTheDocument();
  });

  it('assigns pacing-specific tone classes to each navigation step', () => {
    render(<PacingAmpelkartenEditor {...createProps()} />);

    const variantStep = screen.getByRole('button', {
      name: /pacing-ampelkarten\.editor\.steps\.variant\.label/,
    });
    const greenStep = screen.getByRole('button', {
      name: /pacing-ampelkarten\.editor\.steps\.green\.label/,
    });
    const yellowStep = screen.getByRole('button', {
      name: /pacing-ampelkarten\.editor\.steps\.yellow\.label/,
    });
    const redStep = screen.getByRole('button', {
      name: /pacing-ampelkarten\.editor\.steps\.red\.label/,
    });
    const previewStep = screen.getByRole('button', {
      name: /pacing-ampelkarten\.editor\.steps\.preview\.label/,
    });

    expect(variantStep).toHaveClass('pacing-editor__step--variant');
    expect(greenStep).toHaveClass('pacing-editor__step--green');
    expect(yellowStep).toHaveClass('pacing-editor__step--yellow');
    expect(redStep).toHaveClass('pacing-editor__step--red');
    expect(previewStep).toHaveClass('pacing-editor__step--preview');
    expect(greenStep).toHaveStyle({
      '--pacing-step-accent': 'var(--pacing-green)',
    });
    expect(redStep).toHaveStyle({
      '--pacing-step-accent': 'var(--pacing-red)',
    });
  });

  it('renders modern variant cards and marks the active selection', async () => {
    const onFormChange = vi.fn();
    render(
      <PacingAmpelkartenEditor
        {...createProps({
          onFormChange,
        })}
      />,
    );

    const adultCard = screen.getByRole('radio', {
      name: /pacing-ampelkarten\.meta\.variant\.option\.adult/,
    });
    const childCard = screen.getByRole('radio', {
      name: /pacing-ampelkarten\.meta\.variant\.option\.child/,
    });

    expect(adultCard).toHaveAttribute('aria-checked', 'true');
    expect(adultCard).toHaveClass('pacing-editor__variant-card--selected');
    expect(
      within(adultCard).getByText(
        'pacing-ampelkarten.editor.variant.adult.badge',
      ),
    ).toBeInTheDocument();
    expect(
      within(childCard).getByText(
        'pacing-ampelkarten.editor.variant.child.badge',
      ),
    ).toBeInTheDocument();

    await userEvent.click(childCard);

    const lastCall = onFormChange.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    const changeArg = lastCall?.[0] as {
      formData?: {
        meta?: {
          variant?: string;
        };
      };
    };
    expect(changeArg.formData?.meta?.variant).toBe('child');
  });

  it('renders the child variant as selected when the stored variant is child', async () => {
    render(
      <PacingAmpelkartenEditor
        {...createProps({
          formData: {
            meta: { variant: 'child' },
            adult: { cards: { green: { canDo: [ADULT_GREEN_ITEM] } } },
            child: { cards: { green: { canDo: [CHILD_GREEN_ITEM] } } },
          },
        })}
      />,
    );

    const childCard = screen.getByRole('radio', {
      name: /pacing-ampelkarten\.meta\.variant\.option\.child/,
    });

    expect(childCard).toHaveAttribute('aria-checked', 'true');
    expect(childCard).toHaveClass('pacing-editor__variant-card--selected');

    await userEvent.click(
      screen.getByRole('button', {
        name: /pacing-ampelkarten\.editor\.steps\.green\.label/,
      }),
    );

    expect(
      screen.getByRole('heading', {
        name: 'pacing-ampelkarten.child.cards.green.title',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('pacing-ampelkarten.card.animal.green'),
    ).not.toBeInTheDocument();
  });

  it('normalizes a missing meta object when selecting a variant card', async () => {
    const onFormChange = vi.fn();
    render(
      <PacingAmpelkartenEditor
        {...createProps({
          formData: {
            meta: 'invalid-meta',
            adult: { cards: { green: { canDo: [ADULT_GREEN_ITEM] } } },
            child: { cards: { green: { canDo: [CHILD_GREEN_ITEM] } } },
          },
          onFormChange,
        })}
      />,
    );

    await userEvent.click(
      screen.getByRole('radio', {
        name: /pacing-ampelkarten\.meta\.variant\.option\.child/,
      }),
    );

    const lastCall = onFormChange.mock.calls.at(-1);
    expect(lastCall).toBeDefined();
    expect(lastCall?.[0]).toMatchObject({
      formData: {
        meta: {
          variant: 'child',
        },
      },
    });
  });

  it('shows the page-fit warning on card steps with too many entries', async () => {
    const longItems = ['1', '2', '3', '4', '5'];

    render(
      <PacingAmpelkartenEditor
        {...createProps({
          formData: {
            meta: { variant: 'adult' },
            adult: {
              cards: {
                green: {
                  canDo: longItems,
                  needHelp: ['6', '7', '8', '9'],
                  hint: 'Kurz.',
                },
              },
            },
          },
        })}
      />,
    );

    expect(screen.queryByText(PAGE_WARNING_TITLE_KEY)).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', {
        name: /pacing-ampelkarten\.editor\.steps\.green\.label/,
      }),
    );

    expect(screen.getByText(PAGE_WARNING_TITLE_KEY)).toBeInTheDocument();
    expect(screen.getByText(PAGE_WARNING_BODY_KEY)).toBeInTheDocument();
  });

  it('keeps the page-fit warning hidden for compact card content', async () => {
    render(<PacingAmpelkartenEditor {...createProps()} />);

    await userEvent.click(
      screen.getByRole('button', {
        name: /pacing-ampelkarten\.editor\.steps\.green\.label/,
      }),
    );

    expect(screen.queryByText(PAGE_WARNING_TITLE_KEY)).not.toBeInTheDocument();
  });

  it('moves through the flow with the previous and next action buttons', async () => {
    render(<PacingAmpelkartenEditor {...createProps()} />);

    expect(
      screen.queryByRole('button', {
        name: 'pacing-ampelkarten.editor.navigation.previous',
      }),
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', {
        name: 'pacing-ampelkarten.editor.navigation.next',
      }),
    );

    expect(
      screen.getByRole('heading', {
        name: 'pacing-ampelkarten.adult.cards.green.title',
      }),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', {
        name: 'pacing-ampelkarten.editor.navigation.previous',
      }),
    );

    expect(
      screen.getByRole('heading', {
        name: 'pacing-ampelkarten.editor.variant.title',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', {
        name: /pacing-ampelkarten\.meta\.variant\.option\.adult/,
      }),
    ).toBeInTheDocument();
  });
});
