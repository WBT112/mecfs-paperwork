import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

const GATED_IMPACTS = new Set(['moderate', 'serious', 'critical']);

type A11yScanOptions = {
  include?: string[];
  exclude?: string[];
  routeLabel?: string;
};

const formatViolationMessage = (
  routeLabel: string,
  violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'],
) =>
  [
    `A11y baseline failed on "${routeLabel}" with moderate/serious/critical violations:`,
    ...violations.map((violation) => {
      const nodeTargets = violation.nodes
        .flatMap((node) => node.target)
        .slice(0, 5)
        .join(', ');
      return `- [${violation.impact}] ${violation.id}: ${violation.help} (${nodeTargets || 'no target'})`;
    }),
  ].join('\n');

export const expectNoSeriousA11yViolations = async (
  page: Page,
  options: A11yScanOptions = {},
) => {
  let builder = new AxeBuilder({ page });

  for (const selector of options.include ?? []) {
    builder = builder.include(selector);
  }

  for (const selector of options.exclude ?? []) {
    builder = builder.exclude(selector);
  }

  const results = await builder.analyze();
  const violations = results.violations.filter((violation) =>
    GATED_IMPACTS.has(violation.impact ?? ''),
  );

  expect(
    violations,
    formatViolationMessage(options.routeLabel ?? page.url(), violations),
  ).toEqual([]);
};
