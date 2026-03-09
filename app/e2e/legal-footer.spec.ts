import { expect, test } from '@playwright/test';
import { getSponsorUrl } from '../src/lib/funding';
import { DEFAULT_REPO_URL } from '../src/lib/repoUrl';

test('footer navigation reaches legal pages and exposes the GitHub link', async ({
  page,
}) => {
  await page.goto('/');

  // Legal markdown pages can also contain internal links that duplicate footer links.
  // Scope interactions to the footer navigation to avoid Playwright strict-mode conflicts.
  const footerNav = page.getByRole('navigation', {
    name: /footer navigation|fußzeilennavigation/i,
  });

  const imprintLink = footerNav.getByRole('link', {
    name: /imprint|impressum/i,
  });
  await expect(imprintLink).toBeVisible();
  await Promise.all([page.waitForURL(/\/imprint$/i), imprintLink.click()]);
  await expect(
    page.getByRole('heading', { level: 1, name: /imprint|impressum/i }),
  ).toBeVisible();

  const privacyLink = footerNav.getByRole('link', {
    name: /privacy policy|datenschutzerklärung/i,
  });
  await Promise.all([page.waitForURL(/\/privacy$/i), privacyLink.click()]);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /privacy policy|datenschutzerklärung|datenschutz/i,
    }),
  ).toBeVisible();

  const githubLink = footerNav.getByRole('link', { name: /github/i });
  await expect(githubLink).toHaveAttribute('href', DEFAULT_REPO_URL);
  await expect(githubLink).toHaveAttribute(
    'rel',
    /noreferrer.*noopener|noopener.*noreferrer/,
  );

  const sponsorUrl = getSponsorUrl();
  if (!sponsorUrl) {
    throw new Error('Expected a sponsor URL to be available for the footer.');
  }

  // The UI may label the funding link as "Sponsor" (EN) or "Unterstützen" (DE).
  // Accept common ASCII fallback spelling as well.
  const sponsorLink = footerNav.getByRole('link', {
    name: /sponsor|unterst\u00fctzen|unterstuetzen/i,
  });
  await expect(sponsorLink).toHaveAttribute('href', sponsorUrl);
  await expect(sponsorLink).toHaveAttribute(
    'rel',
    /noreferrer.*noopener|noopener.*noreferrer/,
  );
});
