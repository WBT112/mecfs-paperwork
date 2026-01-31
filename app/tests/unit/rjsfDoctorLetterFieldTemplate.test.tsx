const TEST_INFOBOX_KEY = 'test.infobox.key';
const FIELD_ID = 'root_decision_q1';
const DECISION_Q1_ANCHOR = 'decision.q1';
const DECISION_DIVIDER_SELECTOR = '.formpack-decision-divider';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { FieldTemplateProps, RJSFSchema } from '@rjsf/utils';
import { DoctorLetterFieldTemplate } from '../../src/lib/rjsfDoctorLetterFieldTemplate';
import type { InfoBoxConfig } from '../../src/formpacks/types';

// Mock InfoBox component
vi.mock('../../src/components/InfoBox', () => ({
  InfoBox: ({
    message,
    format,
  }: {
    message: string;
    format?: 'text' | 'markdown';
  }) => (
    <div data-testid="infobox" data-format={format}>
      {message}
    </div>
  ),
}));

describe('DoctorLetterFieldTemplate', () => {
  type FormContext = {
    t?: (key: string) => string;
    formpackId?: string;
    infoBoxes?: InfoBoxConfig[];
    formData?: Record<string, unknown>;
  };

  type DoctorLetterTemplateProps = FieldTemplateProps<
    unknown,
    RJSFSchema,
    FormContext
  >;

  type MockOverrides = Partial<DoctorLetterTemplateProps> & {
    formContext?: FormContext;
  };

  const createMockProps = (
    overrides: MockOverrides = {},
  ): DoctorLetterTemplateProps =>
    (() => {
      const formContext = overrides.formContext ?? {};
      const registry =
        overrides.registry ??
        ({
          formContext,
        } as DoctorLetterTemplateProps['registry']);
      const { formContext: _formContext, ...restOverrides } = overrides;

      return {
        id: FIELD_ID,
        classNames: 'test-class',
        label: 'Test Label',
        help: <div>Help text</div>,
        required: false,
        description: <div>Description</div>,
        errors: <div>Errors</div>,
        children: <input />,
        schema: {},
        uiSchema: {},
        registry,
        formData: undefined,
        disabled: false,
        readonly: false,
        displayLabel: true,
        ...restOverrides,
      } as DoctorLetterTemplateProps;
    })();

  it('renders without crashing', () => {
    const props = createMockProps();
    const { container } = render(<DoctorLetterFieldTemplate {...props} />);
    expect(container).toBeInTheDocument();
  });

  it('renders the label when provided', () => {
    const props = createMockProps({ label: 'My Label' });
    const { container } = render(<DoctorLetterFieldTemplate {...props} />);
    expect(container.textContent).toContain('My Label');
  });

  it('does not render label when label is empty', () => {
    const props = createMockProps({ label: '' });
    const { container } = render(<DoctorLetterFieldTemplate {...props} />);
    expect(container.querySelector('label')).not.toBeInTheDocument();
  });

  it('renders required indicator when field is required', () => {
    const props = createMockProps({ label: 'Required Field', required: true });
    const { container } = render(<DoctorLetterFieldTemplate {...props} />);
    expect(container.textContent).toContain('*');
  });

  it('renders children (form control)', () => {
    const props = createMockProps({
      children: <input data-testid="test-input" />,
    });
    const { getByTestId } = render(<DoctorLetterFieldTemplate {...props} />);
    expect(getByTestId('test-input')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    const props = createMockProps({
      description: <div data-testid="description">Field description</div>,
    });
    const { getByTestId } = render(<DoctorLetterFieldTemplate {...props} />);
    expect(getByTestId('description')).toBeInTheDocument();
  });

  it('renders errors when provided', () => {
    const props = createMockProps({
      errors: <div data-testid="errors">Validation errors</div>,
    });
    const { getByTestId } = render(<DoctorLetterFieldTemplate {...props} />);
    expect(getByTestId('errors')).toBeInTheDocument();
  });

  it('renders help text when provided', () => {
    const props = createMockProps({
      help: <div data-testid="help">Help information</div>,
    });
    const { getByTestId } = render(<DoctorLetterFieldTemplate {...props} />);
    expect(getByTestId('help')).toBeInTheDocument();
  });

  it('applies custom classNames', () => {
    const props = createMockProps({ classNames: 'custom-class another-class' });
    const { container } = render(<DoctorLetterFieldTemplate {...props} />);
    const fieldWrapper = container.firstChild as HTMLElement;
    expect(fieldWrapper.className).toContain('custom-class');
  });

  it('renders infoBox when enabled and anchor matches', () => {
    const props = createMockProps({
      id: FIELD_ID,
      formContext: {
        t: (key: string) => `translated:${key}`,
        infoBoxes: [
          {
            id: 'q1-info',
            anchor: DECISION_Q1_ANCHOR,
            enabled: true,
            i18nKey: TEST_INFOBOX_KEY,
          },
        ],
      },
    });
    const { getByTestId } = render(<DoctorLetterFieldTemplate {...props} />);
    expect(getByTestId('infobox')).toBeInTheDocument();
    expect(getByTestId('infobox').textContent).toBe(
      'translated:test.infobox.key',
    );
  });

  it('passes markdown format to InfoBox when configured', () => {
    const props = createMockProps({
      id: FIELD_ID,
      formContext: {
        t: (key: string) => `translated:${key}`,
        infoBoxes: [
          {
            id: 'q1-info',
            anchor: DECISION_Q1_ANCHOR,
            enabled: true,
            i18nKey: TEST_INFOBOX_KEY,
            format: 'markdown',
          },
        ],
      },
    });
    const { getByTestId } = render(<DoctorLetterFieldTemplate {...props} />);
    expect(getByTestId('infobox').dataset.format).toBe('markdown');
  });

  it('renders infoBox when showIf matches', () => {
    const props = createMockProps({
      id: FIELD_ID,
      formContext: {
        t: (key: string) => `translated:${key}`,
        formData: {
          decision: { q1: true },
        },
        infoBoxes: [
          {
            id: 'q1-info',
            anchor: DECISION_Q1_ANCHOR,
            enabled: true,
            i18nKey: TEST_INFOBOX_KEY,
            showIf: [
              {
                path: DECISION_Q1_ANCHOR,
                op: 'eq',
                value: true,
              },
            ],
          },
        ],
      },
    });
    const { getByTestId } = render(<DoctorLetterFieldTemplate {...props} />);
    expect(getByTestId('infobox')).toBeInTheDocument();
  });

  it('does not render infoBox when showIf does not match', () => {
    const props = createMockProps({
      id: FIELD_ID,
      formContext: {
        formData: {
          decision: { q1: false },
        },
        infoBoxes: [
          {
            id: 'q1-info',
            anchor: DECISION_Q1_ANCHOR,
            enabled: true,
            i18nKey: TEST_INFOBOX_KEY,
            showIf: [
              {
                path: DECISION_Q1_ANCHOR,
                op: 'eq',
                value: true,
              },
            ],
          },
        ],
      },
    });
    const { queryByTestId } = render(<DoctorLetterFieldTemplate {...props} />);
    expect(queryByTestId('infobox')).not.toBeInTheDocument();
  });

  it('does not render infoBox when disabled', () => {
    const props = createMockProps({
      id: FIELD_ID,
      formContext: {
        infoBoxes: [
          {
            id: 'q1-info',
            anchor: DECISION_Q1_ANCHOR,
            enabled: false,
            i18nKey: TEST_INFOBOX_KEY,
          },
        ],
      },
    });
    const { queryByTestId } = render(<DoctorLetterFieldTemplate {...props} />);
    expect(queryByTestId('infobox')).not.toBeInTheDocument();
  });

  it('does not render infoBox when anchor does not match', () => {
    const props = createMockProps({
      id: FIELD_ID,
      formContext: {
        infoBoxes: [
          {
            id: 'q2-info',
            anchor: 'decision.q2',
            enabled: true,
            i18nKey: TEST_INFOBOX_KEY,
          },
        ],
      },
    });
    const { queryByTestId } = render(<DoctorLetterFieldTemplate {...props} />);
    expect(queryByTestId('infobox')).not.toBeInTheDocument();
  });

  it('renders divider for decision questions', () => {
    const props = createMockProps({ id: FIELD_ID });
    const { container } = render(<DoctorLetterFieldTemplate {...props} />);
    expect(
      container.querySelector(DECISION_DIVIDER_SELECTOR),
    ).toBeInTheDocument();
  });

  it('does not render divider for non-decision fields', () => {
    const props = createMockProps({ id: 'root_patient_firstName' });
    const { container } = render(<DoctorLetterFieldTemplate {...props} />);
    expect(
      container.querySelector(DECISION_DIVIDER_SELECTOR),
    ).not.toBeInTheDocument();
  });

  it('renders divider after infobox content', () => {
    const props = createMockProps({
      id: FIELD_ID,
      formContext: {
        t: (key: string) => `translated:${key}`,
        infoBoxes: [
          {
            id: 'q1-info',
            anchor: DECISION_Q1_ANCHOR,
            enabled: true,
            i18nKey: TEST_INFOBOX_KEY,
          },
        ],
      },
    });
    const { container, getByTestId } = render(
      <DoctorLetterFieldTemplate {...props} />,
    );
    const divider = container.querySelector(DECISION_DIVIDER_SELECTOR);
    const infoBox = getByTestId('infobox');
    expect(divider).toBeInTheDocument();
    expect(infoBox.compareDocumentPosition(divider as Node)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });
});
