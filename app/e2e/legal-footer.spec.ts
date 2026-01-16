import { expect, test } from '@playwright/test';
import { DEFAULT_REPO_URL } from '../src/lib/repo';

test('footer navigation reaches legal pages and exposes the GitHub link', async ({
  page,
}) => {
  await page.goto('/');

  const imprintLink = page.getByRole('link', { name: /imprint|impressum/i });
  await expect(imprintLink).toBeVisible();
  await imprintLink.click();
  await expect(
    page.getByRole('heading', { level: 1, name: /imprint|impressum/i }),
  ).toBeVisible();

  const privacyLink = page.getByRole('link', {
    name: /privacy policy|datenschutzerklärung/i,
  });
  await privacyLink.click();
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /privacy policy|datenschutzerklärung|datenschutz/i,
    }),
  ).toBeVisible();

  const githubLink = page.getByRole('link', { name: /github/i });
  await expect(githubLink).toHaveAttribute('href', DEFAULT_REPO_URL);
  await expect(githubLink).toHaveAttribute(
    'rel',
    /noreferrer.*noopener|noopener.*noreferrer/,
  );
});
