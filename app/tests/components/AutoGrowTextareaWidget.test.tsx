// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react';
import type { RJSFSchema, WidgetProps } from '@rjsf/utils';
import { describe, expect, it, vi } from 'vitest';
import {
  AutoGrowTextareaWidget,
  AccessibleSelectWidget,
  AttachmentsAssistantWidget,
} from '../../src/lib/rjsfWidgets';
import { adjustTextareaHeight } from '../../src/lib/textareaAutoGrow';

const buildTextareaProps = (
  overrides: Partial<WidgetProps> = {},
): WidgetProps => ({
  id: 'resolvedCaseText',
  name: 'resolvedCaseText',
  schema: { type: 'string' } as RJSFSchema,
  options: { rows: 6 },
  value: 'Hello',
  required: false,
  disabled: false,
  readonly: true,
  label: 'Evaluation Result',
  placeholder: 'Enter text...',
  onChange: vi.fn(),
  onBlur: vi.fn(),
  onFocus: vi.fn(),
  registry: {} as WidgetProps['registry'],
  ...overrides,
});

const buildSelectProps = (
  overrides: Partial<WidgetProps> = {},
): WidgetProps => ({
  id: 'testSelect',
  name: 'testSelect',
  schema: { type: 'string' } as RJSFSchema,
  options: {
    enumOptions: [
      { value: 'a', label: 'Option A' },
      { value: 'b', label: 'Option B' },
      { value: 'c', label: 'Option C' },
    ],
  },
  value: 'a',
  required: false,
  disabled: false,
  readonly: false,
  multiple: false,
  label: 'Test Select',
  placeholder: 'Select...',
  onChange: vi.fn(),
  onBlur: vi.fn(),
  onFocus: vi.fn(),
  registry: {} as WidgetProps['registry'],
  ...overrides,
});

const buildAttachmentsAssistantProps = (
  overrides: Partial<WidgetProps> = {},
): WidgetProps => ({
  id: 'attachmentsFreeText',
  name: 'attachmentsFreeText',
  schema: { type: 'string' } as RJSFSchema,
  options: { rows: 6 },
  value: '',
  required: false,
  disabled: false,
  readonly: false,
  label: 'Anlagen',
  placeholder: '',
  onChange: vi.fn(),
  onBlur: vi.fn(),
  onFocus: vi.fn(),
  registry: {} as WidgetProps['registry'],
  ...overrides,
});

describe('adjustTextareaHeight', () => {
  it('updates the textarea height based on scrollHeight', () => {
    const textarea = document.createElement('textarea');
    Object.defineProperty(textarea, 'scrollHeight', {
      value: 240,
      configurable: true,
    });

    adjustTextareaHeight(textarea);

    expect(textarea.style.height).toBe('240px');
  });

  it('handles null elements safely', () => {
    expect(() => adjustTextareaHeight(null)).not.toThrow();
  });
});

describe('AutoGrowTextareaWidget', () => {
  it('renders a textarea with the auto-grow class and rows', () => {
    render(<AutoGrowTextareaWidget {...buildTextareaProps()} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('formpack-textarea--auto');
    expect(textarea).toHaveAttribute('rows', '6');
    expect(textarea).toHaveAttribute('readonly');
  });

  it('uses DEFAULT_ROWS when rows option is not a number', () => {
    render(
      <AutoGrowTextareaWidget
        {...buildTextareaProps({
          options: { rows: 'invalid' as unknown as number },
        })}
      />,
    );
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('rows', '6');
  });

  it('clamps rows to at least 1', () => {
    render(
      <AutoGrowTextareaWidget
        {...buildTextareaProps({ options: { rows: -5 } })}
      />,
    );
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('rows', '1');
  });

  it('renders empty string for non-string values', () => {
    render(<AutoGrowTextareaWidget {...buildTextareaProps({ value: 42 })} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveDisplayValue('');
  });

  it('calls onChange with value when typing', () => {
    const onChange = vi.fn();
    render(
      <AutoGrowTextareaWidget
        {...buildTextareaProps({ onChange, readonly: false })}
      />,
    );
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'new text' } });
    expect(onChange).toHaveBeenCalledWith('new text');
  });

  it('calls onBlur with id and value', () => {
    const onBlur = vi.fn();
    render(<AutoGrowTextareaWidget {...buildTextareaProps({ onBlur })} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.blur(textarea);
    expect(onBlur).toHaveBeenCalledWith('resolvedCaseText', expect.any(String));
  });

  it('calls onFocus with id and value', () => {
    const onFocus = vi.fn();
    render(<AutoGrowTextareaWidget {...buildTextareaProps({ onFocus })} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.focus(textarea);
    expect(onFocus).toHaveBeenCalledWith(
      'resolvedCaseText',
      expect.any(String),
    );
  });

  it('renders with placeholder', () => {
    render(
      <AutoGrowTextareaWidget
        {...buildTextareaProps({ placeholder: 'Type here' })}
      />,
    );
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('placeholder', 'Type here');
  });

  it('renders as disabled when disabled prop is true', () => {
    render(
      <AutoGrowTextareaWidget {...buildTextareaProps({ disabled: true })} />,
    );
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
  });

  it('renders as required when required prop is true', () => {
    render(
      <AutoGrowTextareaWidget {...buildTextareaProps({ required: true })} />,
    );
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeRequired();
  });
});

describe('AccessibleSelectWidget', () => {
  it('renders a native select with options', () => {
    render(<AccessibleSelectWidget {...buildSelectProps()} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveAttribute('data-widget', 'accessible-select');

    const options = screen.getAllByRole('option');
    // placeholder option + 3 enum options
    expect(options.length).toBe(4);
  });

  it('shows placeholder option when schema.default is undefined', () => {
    render(<AccessibleSelectWidget {...buildSelectProps()} />);
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveTextContent('Select...');
    expect(options[0]).toHaveValue('');
  });

  it('falls back to localized empty label when placeholder is empty', () => {
    render(
      <AccessibleSelectWidget {...buildSelectProps({ placeholder: '' })} />,
    );
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveTextContent('[keine Angabe]');
    expect(options[0]).toHaveValue('');
  });

  it('hides placeholder when schema.default is defined', () => {
    render(
      <AccessibleSelectWidget
        {...buildSelectProps({
          schema: { type: 'string', default: 'a' } as RJSFSchema,
        })}
      />,
    );
    const options = screen.getAllByRole('option');
    expect(options.length).toBe(3);
    expect(options[0]).toHaveTextContent('Option A');
  });

  it('calls onChange when selection changes', () => {
    const onChange = vi.fn();
    render(<AccessibleSelectWidget {...buildSelectProps({ onChange })} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '1' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('calls onBlur when select loses focus', () => {
    const onBlur = vi.fn();
    render(<AccessibleSelectWidget {...buildSelectProps({ onBlur })} />);
    const select = screen.getByRole('combobox');
    fireEvent.blur(select);
    expect(onBlur).toHaveBeenCalledWith('testSelect', expect.anything());
  });

  it('calls onFocus when select gains focus', () => {
    const onFocus = vi.fn();
    render(<AccessibleSelectWidget {...buildSelectProps({ onFocus })} />);
    const select = screen.getByRole('combobox');
    fireEvent.focus(select);
    expect(onFocus).toHaveBeenCalledWith('testSelect', expect.anything());
  });

  it('disables the select when disabled is true', () => {
    render(
      <AccessibleSelectWidget {...buildSelectProps({ disabled: true })} />,
    );
    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });

  it('disables the select when readonly is true', () => {
    render(
      <AccessibleSelectWidget {...buildSelectProps({ readonly: true })} />,
    );
    const select = screen.getByRole('combobox');
    expect(select).toBeDisabled();
  });

  it('disables individual options via enumDisabled', () => {
    render(
      <AccessibleSelectWidget
        {...buildSelectProps({
          options: {
            enumOptions: [
              { value: 'a', label: 'Option A' },
              { value: 'b', label: 'Option B' },
            ],
            enumDisabled: ['b'],
          },
        })}
      />,
    );
    const options = screen.getAllByRole('option');
    const bOption = options.find((o) => o.textContent === 'Option B');
    expect(bOption).toBeDisabled();
  });

  it('supports multiple selection mode', () => {
    render(
      <AccessibleSelectWidget
        {...buildSelectProps({
          multiple: true,
          value: ['a', 'b'],
        })}
      />,
    );
    const select = screen.getByRole('listbox');
    expect(select).toHaveAttribute('multiple');
  });

  it('uses htmlName when provided', () => {
    render(
      <AccessibleSelectWidget
        {...buildSelectProps({ htmlName: 'customName' })}
      />,
    );
    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('name', 'customName');
  });

  it('falls back to name when htmlName is not provided', () => {
    render(<AccessibleSelectWidget {...buildSelectProps()} />);
    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('name', 'testSelect');
  });
});

describe('AttachmentsAssistantWidget', () => {
  it('renders recommended attachments checkboxes and editable textarea', () => {
    render(
      <AttachmentsAssistantWidget {...buildAttachmentsAssistantProps()} />,
    );

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(8);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('rows', '6');
  });

  it('adds a recommended attachment line when a checkbox is selected', () => {
    const onChange = vi.fn();

    render(
      <AttachmentsAssistantWidget
        {...buildAttachmentsAssistantProps({ onChange })}
      />,
    );

    const [firstCheckbox] = screen.getAllByRole('checkbox');
    fireEvent.click(firstCheckbox);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.stringContaining('Arztbefunde'),
    );
  });

  it('removes a recommended attachment line when its checkbox is deselected', () => {
    const onChange = vi.fn();

    render(
      <AttachmentsAssistantWidget
        {...buildAttachmentsAssistantProps({
          value: '- Arztbefunde\n- Freier Anhang',
          onChange,
        })}
      />,
    );

    const [firstCheckbox] = screen.getAllByRole('checkbox');
    expect(firstCheckbox).toBeChecked();

    fireEvent.click(firstCheckbox);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith('- Freier Anhang');
  });

  it('derives checked state from bullet-prefixed and case-insensitive lines', () => {
    render(
      <AttachmentsAssistantWidget
        {...buildAttachmentsAssistantProps({
          value: '* arztbefunde\n• gdb-bescheid',
        })}
      />,
    );

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[3]).toBeChecked();
  });

  it('keeps free-text editing and forwards textarea events', () => {
    const onChange = vi.fn();
    const onBlur = vi.fn();
    const onFocus = vi.fn();

    render(
      <AttachmentsAssistantWidget
        {...buildAttachmentsAssistantProps({
          onChange,
          onBlur,
          onFocus,
        })}
      />,
    );

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Eigene Anlage' } });
    fireEvent.focus(textarea);
    fireEvent.blur(textarea);

    expect(onChange).toHaveBeenCalledWith('Eigene Anlage');
    expect(onFocus).toHaveBeenCalledWith(
      'attachmentsFreeText',
      expect.any(String),
    );
    expect(onBlur).toHaveBeenCalledWith(
      'attachmentsFreeText',
      expect.any(String),
    );
  });
});
