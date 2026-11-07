import { expect, test } from '@playwright/test';

const viewports = [
  { name: '320 px', width: 320, height: 720 },
  { name: '420 px', width: 420, height: 800 },
  { name: 'desktop', width: 1280, height: 900 },
] as const;

for (const viewport of viewports) {
  test(`keeps the support-offer header clear at ${viewport.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/formpacks');

    const header = page.locator('.app__header');
    const title = header.getByRole('heading', {
      name: /MEcfs-PAPERwork.*BETA(?:-| )version/i,
    });
    const bugReportHint = header.getByText(
      /Fehler bitte über GitHub melden|Please report bugs on GitHub/i,
    );
    const feedback = header.getByRole('link', { name: /Feedback/i });
    const share = header.getByRole('button', { name: /Teilen|Share/i });
    const language = header.locator('#locale-select');
    const theme = header.locator('#theme-select');
    const description = header.getByText(
      /Hier werden die aktuell verfügbaren Hilfsangebote angezeigt|Here you can see the currently available support offers/i,
    );
    const listHeading = page.getByRole('heading', {
      name: /Hilfsangebote|Support offers/i,
      exact: true,
    });

    await expect(title).toBeVisible();
    await expect(bugReportHint).toBeVisible();
    await expect(feedback).toBeVisible();
    await expect(share).toBeVisible();
    await expect(language).toBeVisible();
    await expect(theme).toBeVisible();
    await expect(description).toBeVisible();
    await expect(listHeading).toBeVisible();
    await expect(page.locator('main')).not.toContainText(
      /Hier werden die aktuell verfügbaren Hilfsangebote angezeigt|Here you can see the currently available support offers/i,
    );

    expect(
      await description.evaluate((element) => {
        const heading = document.querySelector('main h2');
        return (
          heading !== null &&
          Boolean(
            element.compareDocumentPosition(heading) &
            Node.DOCUMENT_POSITION_FOLLOWING,
          )
        );
      }),
    ).toBe(true);
    const titleFontSize = Number.parseFloat(
      await title.evaluate(
        (element) => window.getComputedStyle(element).fontSize,
      ),
    );
    if (viewport.width > 720) {
      expect(titleFontSize).toBeGreaterThan(24);
    } else {
      expect(titleFontSize).toBeLessThanOrEqual(24);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);

    await language.focus();
    await expect(language).toBeFocused();
    expect(
      await language.evaluate(
        (element) => window.getComputedStyle(element).outlineStyle,
      ),
    ).not.toBe('none');
    await theme.focus();
    await expect(theme).toBeFocused();

    if (viewport.width <= 420) {
      const [feedbackBox, shareBox] = await Promise.all([
        feedback.boundingBox(),
        share.boundingBox(),
      ]);
      expect(feedbackBox).not.toBeNull();
      expect(shareBox).not.toBeNull();
      expect(Math.abs(feedbackBox!.y - shareBox!.y)).toBeLessThan(2);
    }
  });
}
