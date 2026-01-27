// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import type { RJSFSchema, WidgetProps } from '@rjsf/utils';
import { describe, expect, it } from 'vitest';
import { AutoGrowTextareaWidget } from '../../src/lib/rjsfWidgets';
import { adjustTextareaHeight } from '../../src/lib/textareaAutoGrow';

const buildProps = (value = 'Hello'): WidgetProps => ({
  id: 'resolvedCaseText',
  name: 'resolvedCaseText',
  schema: { type: 'string' } as RJSFSchema,
  options: { rows: 6 },
  value,
  required: false,
  disabled: false,
  readonly: true,
  label: 'Evaluation Result',
  placeholder: '',
  onChange: () => undefined,
  onBlur: () => undefined,
  onFocus: () => undefined,
  registry: {} as WidgetProps['registry'],
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
    render(<AutoGrowTextareaWidget {...buildProps()} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('formpack-textarea--auto');
    expect(textarea).toHaveAttribute('rows', '6');
    expect(textarea).toHaveAttribute('readonly');
  });
});
