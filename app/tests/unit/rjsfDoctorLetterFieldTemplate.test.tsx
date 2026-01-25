import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { FieldTemplateProps } from '@rjsf/utils';
import { DoctorLetterFieldTemplate } from '../../src/lib/rjsfDoctorLetterFieldTemplate';

// Mock InfoBox component
vi.mock('../../src/components/InfoBox', () => ({
  InfoBox: ({ message }: { message: string }) => <div data-testid="infobox">{message}</div>,
}));

describe('DoctorLetterFieldTemplate', () => {
  const createMockProps = (overrides: Partial<FieldTemplateProps> = {}): FieldTemplateProps => ({
    id: 'root_decision_q1',
    classNames: 'test-class',
    label: 'Test Label',
    help: <div>Help text</div>,
    required: false,
    description: <div>Description</div>,
    errors: <div>Errors</div>,
    children: <input />,
    schema: {},
    uiSchema: {},
    registry: {} as any,
    formContext: {},
    formData: undefined,
    disabled: false,
    readonly: false,
    displayLabel: true,
    ...overrides,
  });

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
      id: 'root_decision_q1',
      formContext: {
        t: (key: string) => `translated:${key}`,
        infoBoxes: [
          {
            id: 'q1-info',
            anchor: 'decision.q1',
            enabled: true,
            i18nKey: 'test.infobox.key',
          },
        ],
      },
    });
    const { getByTestId } = render(<DoctorLetterFieldTemplate {...props} />);
    expect(getByTestId('infobox')).toBeInTheDocument();
    expect(getByTestId('infobox').textContent).toBe('translated:test.infobox.key');
  });

  it('does not render infoBox when disabled', () => {
    const props = createMockProps({
      id: 'root_decision_q1',
      formContext: {
        infoBoxes: [
          {
            id: 'q1-info',
            anchor: 'decision.q1',
            enabled: false,
            i18nKey: 'test.infobox.key',
          },
        ],
      },
    });
    const { queryByTestId } = render(<DoctorLetterFieldTemplate {...props} />);
    expect(queryByTestId('infobox')).not.toBeInTheDocument();
  });

  it('does not render infoBox when anchor does not match', () => {
    const props = createMockProps({
      id: 'root_decision_q1',
      formContext: {
        infoBoxes: [
          {
            id: 'q2-info',
            anchor: 'decision.q2',
            enabled: true,
            i18nKey: 'test.infobox.key',
          },
        ],
      },
    });
    const { queryByTestId } = render(<DoctorLetterFieldTemplate {...props} />);
    expect(queryByTestId('infobox')).not.toBeInTheDocument();
  });
});
