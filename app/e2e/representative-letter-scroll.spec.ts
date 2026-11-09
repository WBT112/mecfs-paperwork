import { expect, test } from '@playwright/test';

const scenarios = [
  { name: 'desktop keyboard', width: 1280, height: 720, keyboard: true },
  { name: 'narrow touch @mobile', width: 320, height: 568, keyboard: false },
  { name: 'landscape touch @mobile', width: 667, height: 375, keyboard: false },
];

for (const scenario of scenarios) {
  test(`shows the email action after recipient selection: ${scenario.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(scenario);
    await page.goto('/tools/mail-pflegegesetz');
    await page
      .getByLabel(/Postleitzahl oder Ort|Postcode or place/i)
      .fill('Berlin');
    const lastRecipient = page
      .getByRole('button', {
        name: /(?:Wahlkreis|constituency).*(?:als Empfänger auswählen|as recipient)/i,
      })
      .last();
    await lastRecipient.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);
    if (scenario.keyboard) {
      await lastRecipient.focus();
      await page.keyboard.press('Enter');
    } else {
      await lastRecipient.tap();
    }

    const emailAction = page.getByRole('link', {
      name: /Im Mailprogramm öffnen|Open in email app/i,
    });
    await expect(emailAction).toBeInViewport({ ratio: 1 });
    await expect(emailAction).toBeFocused();
    expect(
      await emailAction.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return element.contains(
          document.elementFromPoint(
            bounds.left + bounds.width / 2,
            bounds.top + bounds.height / 2,
          ),
        );
      }),
    ).toBe(true);
    await page.keyboard.press('Tab');
    await expect(
      page
        .getByRole('button', { name: /Mailinhalt kopieren|Copy mail body/i })
        .first(),
    ).toBeFocused();

    await page
      .getByRole('button', { name: /Empfänger ändern|Change recipient/i })
      .click();
    await page
      .getByLabel(/Postleitzahl oder Ort|Postcode or place/i)
      .fill('50668');
    await page
      .getByRole('button', {
        name: /Sanae Abdi.*(?:Wahlkreis|constituency) 92/i,
      })
      .click();
    await expect(emailAction).toBeInViewport({ ratio: 1 });
    await expect(emailAction).toBeFocused();
  });
}
