import type { ComponentType } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { getTestRegistry } from '@rjsf/core';
import type { DescriptionFieldProps, FieldHelpProps } from '@rjsf/utils';
import { formpackTemplates } from '../../src/lib/rjsfTemplates';

describe('formpackTemplates', () => {
  const registry = getTestRegistry({});
  const schema = {};

  it('renders markdown descriptions as formatted content', () => {
    const DescriptionFieldTemplate =
      formpackTemplates.DescriptionFieldTemplate as ComponentType<DescriptionFieldProps>;
    const { container } = render(
      <DescriptionFieldTemplate
        id="field-description"
        description="**Bold**"
        schema={schema}
        registry={registry}
      />,
    );

    expect(container.querySelector('.field-description strong')).toBeTruthy();
  });

  it('renders markdown help text as formatted content', () => {
    const HelpFieldTemplate =
      formpackTemplates.FieldHelpTemplate as ComponentType<FieldHelpProps>;
    const { container } = render(
      <HelpFieldTemplate
        fieldPathId={{ $id: 'field-help', path: ['help'] }}
        help="*Italic*"
        schema={schema}
        registry={registry}
      />,
    );

    expect(container.querySelector('.help-block em')).toBeTruthy();
  });

  it('renders custom description content without markdown conversion', () => {
    const DescriptionFieldTemplate =
      formpackTemplates.DescriptionFieldTemplate as ComponentType<DescriptionFieldProps>;
    const { getByTestId } = render(
      <DescriptionFieldTemplate
        id="field-description-custom"
        description={<span data-testid="custom-desc">Custom</span>}
        schema={schema}
        registry={registry}
      />,
    );

    expect(getByTestId('custom-desc')).toBeInTheDocument();
  });

  it('returns null for empty description content', () => {
    const DescriptionFieldTemplate =
      formpackTemplates.DescriptionFieldTemplate as ComponentType<DescriptionFieldProps>;
    const { container } = render(
      <DescriptionFieldTemplate
        id="field-description-empty"
        description=""
        schema={schema}
        registry={registry}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('returns null for empty help content', () => {
    const HelpFieldTemplate =
      formpackTemplates.FieldHelpTemplate as ComponentType<FieldHelpProps>;
    const { container } = render(
      <HelpFieldTemplate
        fieldPathId={{ $id: 'field-help-empty', path: ['help'] }}
        help=""
        schema={schema}
        registry={registry}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
