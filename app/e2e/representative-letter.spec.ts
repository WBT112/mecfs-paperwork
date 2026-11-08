import { expect, test } from '@playwright/test';
import { waitForServiceWorkerReady } from './helpers/serviceWorker';

const TOOL_PATH = '/tools/mail-pflegegesetz';
const TOOL_STATE_KEY = 'mecfs-paperwork.representative-letter.state.v5';
const CATALOG_PATH_PATTERNS = [
  /\/representatives(?:-[^/]+)?\.json$/u,
  /\/constituency-locations(?:-[^/]+)?\.json$/u,
];

test('refreshes plaintext offline with independent tab state @mobile', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.addInitScript(() => {
    Math.random = () => 0.1;
    let clipboardText = '';
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          clipboardText = text;
        },
        readText: async () => clipboardText,
      },
    });
  });
  await page.goto(TOOL_PATH);
  const search = page.getByLabel(/Postleitzahl oder Ort|Postcode or place/i);
  await search.fill('50668');
  await page
    .getByRole('button', { name: /Sanae Abdi.*(?:Wahlkreis|constituency) 92/i })
    .click();
  const subject = page.locator('#representative-letter-subject');
  const body = page.locator('#representative-letter-body');
  const originalPair = [await subject.inputValue(), await body.inputValue()];
  await page.reload();
  await expect(subject).toHaveValue(originalPair[0]);
  await expect(body).toHaveValue(originalPair[1]);
  await page.goto('/formpacks');
  await page.goBack();
  await expect(body).toHaveValue(originalPair[1]);
  await page.goForward();
  await expect(page).toHaveURL(/\/formpacks$/u);
  await page.goBack();
  await expect(body).toHaveValue(originalPair[1]);

  const otherTab = await context.newPage();
  await otherTab.addInitScript(() => {
    Math.random = () => 0.9;
  });
  await otherTab.goto(TOOL_PATH);
  const otherBody = await otherTab
    .locator('#representative-letter-body')
    .inputValue();
  expect(otherBody).not.toBe(originalPair[1]);
  const otherState = await otherTab.evaluate(
    (key) => sessionStorage.getItem(key),
    TOOL_STATE_KEY,
  );
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));
  await page.evaluate(() => {
    Math.random = () => 0.8;
  });
  await context.setOffline(true);
  try {
    const refresh = page.getByRole('button', {
      name: /Neue Mailvariante|New email variant/i,
    });
    await refresh.focus();
    await page.keyboard.press('Enter');
    await expect(refresh).toBeFocused();
    await expect(subject).not.toHaveValue(originalPair[0]);
    await expect(body).not.toHaveValue(originalPair[1]);
    await expect(page.locator('#representative-letter-recipient')).toHaveValue(
      'sanae.abdi@bundestag.de',
    );
    await expect(page.getByText(/Wechsel 1|change 1/i)).toBeVisible();
    const nextBody = await body.inputValue();
    const nextSubject = await subject.inputValue();
    await page
      .getByRole('button', { name: /Mailinhalt kopieren|Copy mail body/i })
      .last()
      .click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      nextBody,
    );
    await page
      .getByRole('button', { name: /Betreff kopieren|Copy subject/i })
      .click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      nextSubject,
    );
    const mailto = new URL(
      (await page
        .getByRole('link', {
          name: /Im Mailprogramm öffnen|Open in email app/i,
        })
        .getAttribute('href'))!,
    );
    expect(mailto.searchParams.get('subject')).toBe(nextSubject);
    expect(mailto.searchParams.get('body')).toBe(
      nextBody.replaceAll('\n', '\r\n'),
    );
    await page
      .getByRole('button', { name: /Empfänger ändern|Change recipient/i })
      .click();
    await search.fill('Köln');
    await refresh.click();
    await expect(search).toHaveValue('Köln');
    await expect(page.getByText(/Wechsel 2|change 2/i)).toBeVisible();
    expect(requests).toEqual([]);
    expect(
      await otherTab.evaluate(
        (key) => sessionStorage.getItem(key),
        TOOL_STATE_KEY,
      ),
    ).toBe(otherState);
    await expect(otherTab.locator('#representative-letter-body')).toHaveValue(
      otherBody,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  } finally {
    await context.setOffline(false);
    await otherTab.close();
  }
  const finalPair = [await subject.inputValue(), await body.inputValue()];
  await page.reload();
  await expect(subject).toHaveValue(finalPair[0]);
  await expect(body).toHaveValue(finalPair[1]);
});

test('uses compact, keyboard-accessible navigation without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('/formpacks');
  const overviewHeaderHeight = await page
    .locator('.app__header')
    .evaluate((header) => header.getBoundingClientRect().height);

  await page.goto(TOOL_PATH);
  const header = page.locator('.app__header');
  const backLink = header.getByRole('link', {
    name: /Zurück zur Übersicht|Back to overview/i,
  });
  const brandLink = header.getByRole('link', { name: 'MEcfs-PAPERwork' });
  const headerLinks = header.getByRole('link');

  await expect(headerLinks.first()).toHaveAccessibleName(
    /Zurück zur Übersicht|Back to overview/i,
  );
  await expect(header).not.toContainText(/BETA|Fehler bitte|report bugs/i);
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /E-Mail an Abgeordnete|Email representatives/i,
    }),
  ).toBeVisible();
  await expect(
    page.locator('[data-tool-id="representative-letter"]').getByRole('link', {
      name: /Zurück zur Übersicht|Back to overview/i,
    }),
  ).toHaveCount(0);

  const toolHeaderHeight = await header.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  expect(toolHeaderHeight).toBeLessThan(overviewHeaderHeight);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page.keyboard.press('Tab');
  await expect(backLink).toBeFocused();
  expect(
    await backLink.evaluate(
      (link) => window.getComputedStyle(link).outlineStyle,
    ),
  ).not.toBe('none');
  await page.keyboard.press('Tab');
  await expect(brandLink).toBeFocused();

  await backLink.click();
  await expect(page).toHaveURL(/\/formpacks$/);
  await page.goto(TOOL_PATH);
  await page
    .locator('.app__header')
    .getByRole('link', { name: 'MEcfs-PAPERwork' })
    .click();
  await expect(page).toHaveURL(/\/formpacks$/);
});

test('opens directly and retains only tab-local representative-letter state', async ({
  browserName,
  context,
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  let clipboardReadSupported = browserName === 'chromium';
  if (clipboardReadSupported) {
    try {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    } catch {
      clipboardReadSupported = false;
    }
  }
  await page.goto('/formpacks');
  await page
    .getByRole('link', {
      name: /E-Mail an Abgeordnete|open email to representatives/i,
    })
    .click();
  await expect(page).toHaveURL(new RegExp(`${TOOL_PATH}$`));

  await expect(page.locator('#representative-letter-recipient')).toBeVisible();
  await expect(page.locator('#representative-letter-subject')).toBeVisible();
  await expect(page.locator('#representative-letter-body')).toBeVisible();
  await expect(page.locator('a[download], button[download]')).toHaveCount(0);

  await page
    .getByLabel(/Postleitzahl oder Ort|Postcode or place/i)
    .fill('50668');
  await expect(
    page.getByRole('button', {
      name: /^(?:Wahlkreis auswählen|Select constituency)$/i,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', {
      name: /Sanae Abdi.*(?:Wahlkreis|constituency) 92.*Köln I/i,
    }),
  ).toBeVisible();
  await page
    .getByRole('button', {
      name: /Sanae Abdi.*(?:Wahlkreis|constituency) 92.*Köln I/i,
    })
    .click();
  await expect(page.locator('#representative-letter-recipient')).toHaveValue(
    'sanae.abdi@bundestag.de',
  );
  await expect(page.locator('#representative-letter-body')).toHaveValue(
    /Guten Tag Sanae Abdi,/u,
  );
  await expect(page.getByLabel(/ME-Schweregrad|ME severity/i)).toHaveCount(0);
  await expect(
    page.getByLabel(
      /Pflegegrad oder Antragsstatus|Care grade or application status/i,
    ),
  ).toHaveCount(0);
  await expect(page.locator('#representative-letter-body')).not.toHaveValue(
    /Mein Alltag ist eine ständige Abwägung|Mein Antrag auf einen Pflegegrad läuft/u,
  );
  const recipientDisclosure = page.getByRole('button', {
    name: 'Sanae Abdi',
    exact: true,
  });
  await expect(recipientDisclosure).toHaveAttribute('aria-expanded', 'false');
  await recipientDisclosure.focus();
  await page.keyboard.press('Enter');
  await expect(recipientDisclosure).toHaveAttribute('aria-expanded', 'true');
  await expect(
    page.getByRole('link', {
      name: /Offizielles Bundestagsprofil|Official Bundestag profile/i,
    }),
  ).toBeVisible();
  await page.keyboard.press('Space');
  await expect(recipientDisclosure).toHaveAttribute('aria-expanded', 'false');
  const mailtoLink = page.getByRole('link', {
    name: /Im Mailprogramm öffnen|Open in email app/i,
  });
  await expect(mailtoLink).toHaveAttribute(
    'href',
    /^mailto:sanae\.abdi@bundestag\.de\?subject=/,
  );
  const visibleBody = await page
    .locator('#representative-letter-body')
    .inputValue();
  if (clipboardReadSupported) {
    await page
      .getByRole('button', { name: /Mailinhalt kopieren|Copy mail body/i })
      .first()
      .click();
    await expect(
      page.getByText(/In die Zwischenablage kopiert|Copied to the clipboard/i),
    ).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      visibleBody,
    );
  }
  const mailtoHref = await mailtoLink.getAttribute('href');
  expect(new URL(mailtoHref as string).searchParams.get('body')).toBe(
    visibleBody.replaceAll('\n', '\r\n'),
  );
  const copyButtons = page.locator(
    '[data-tool-id="representative-letter"] .app__icon-button',
  );
  await expect(copyButtons).toHaveCount(4);
  const copyButtonMetrics = await copyButtons.evaluateAll((buttons) =>
    buttons.map((button) => {
      const bounds = button.getBoundingClientRect();
      return {
        accessibleName: button.getAttribute('aria-label'),
        title: button.getAttribute('title'),
        width: bounds.width,
        height: bounds.height,
      };
    }),
  );
  for (const metrics of copyButtonMetrics) {
    expect(metrics.accessibleName).toBe(metrics.title);
    expect(metrics.width).toBeGreaterThanOrEqual(44);
    expect(metrics.height).toBeGreaterThanOrEqual(44);
  }
  await expect(
    page
      .getByRole('button', { name: /Mailinhalt kopieren|Copy mail body/i })
      .last(),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page
    .getByRole('button', { name: /Empfänger ändern|Change recipient/i })
    .click();
  const search = page.getByLabel(/Postleitzahl oder Ort|Postcode or place/i);
  await search.fill('97237');
  await expect(page.locator('#representative-letter-recipient')).toHaveValue(
    '',
  );
  await page
    .getByRole('button', {
      name: /Aaron Valent.*(?:Wahlkreis|constituency) 250.*Würzburg/i,
    })
    .click();
  await expect(page.locator('#representative-letter-body')).toHaveValue(
    /Guten Tag Aaron Valent,/u,
  );
  await expect(page.locator('#representative-letter-body')).not.toHaveValue(
    /Guten Tag Sanae Abdi,/u,
  );

  const generatedBody = await page
    .locator('#representative-letter-body')
    .inputValue();
  await expect(
    page.getByRole('button', {
      name: /Kurzform|Langform|short version|long version/i,
    }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#representative-letter-recipient')).toHaveValue(
    'aaron.valent@bundestag.de',
  );
  await expect(page.locator('#representative-letter-body')).toHaveValue(
    generatedBody,
  );
  await page.goto('/formpacks');
  await page.goBack();
  await expect(page.locator('#representative-letter-body')).toHaveValue(
    generatedBody,
  );

  const secondTab = await context.newPage();
  await secondTab.goto(TOOL_PATH);
  await expect(secondTab.locator('#representative-letter-body')).toBeVisible();
  await expect(
    secondTab.getByRole('button', {
      name: /So funktioniert’s|How it works/i,
    }),
  ).toHaveAttribute('aria-expanded', 'false');
  await expect(
    secondTab.getByRole('button', {
      name: /Hinweis zur Datenverarbeitung|Data processing notice/i,
    }),
  ).toHaveAttribute('aria-expanded', 'false');
  await secondTab.close();

  await page.evaluate(() => sessionStorage.setItem('unrelated', 'keep'));
  await page.getByRole('button', { name: /Zurücksetzen|reset/i }).click();
  await expect(page.locator('#representative-letter-body')).toBeVisible();
  await expect(page.locator('#representative-letter-recipient')).toHaveValue(
    '',
  );
  await expect
    .poll(() =>
      page.evaluate(
        ([toolKey]) => ({
          tool: sessionStorage.getItem(toolKey),
          unrelated: sessionStorage.getItem('unrelated'),
        }),
        [TOOL_STATE_KEY],
      ),
    )
    .toEqual({ tool: null, unrelated: 'keep' });
});

test('finds an ambiguous postcode and its representatives fully offline', async ({
  context,
  page,
}) => {
  test.setTimeout(75_000);
  await page.setViewportSize({ width: 375, height: 812 });
  const requestOrigins: string[] = [];
  const requestUrls: string[] = [];
  const consoleMessages: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    requestOrigins.push(url.origin);
    requestUrls.push(url.href);
  });
  page.on('console', (message) => consoleMessages.push(message.text()));

  await page.goto(TOOL_PATH);
  await expect(
    page.getByLabel(/Postleitzahl oder Ort|Postcode or place/i),
  ).toBeVisible();

  await context.setOffline(true);
  try {
    await page
      .getByLabel(/Postleitzahl oder Ort|Postcode or place/i)
      .fill('70184');
    await expect(
      page.getByText(/passt zu 2 Wahlkreisen|matches 2 constituencies/i),
    ).toBeVisible();
    const recipientChoices = page.getByRole('button', {
      name: /(?:Wahlkreis|constituency).*(?:als Empfänger auswählen|as recipient)/i,
    });
    expect(await recipientChoices.count()).toBeGreaterThan(1);
    await recipientChoices.first().click();
    await expect(
      page.locator('#representative-letter-recipient'),
    ).not.toHaveValue('');
  } finally {
    await context.setOffline(false);
  }

  const appOrigin = new URL(page.url()).origin;
  expect(requestOrigins.filter((origin) => origin !== appOrigin)).toEqual([]);
  expect(page.url()).not.toContain('70184');
  expect(requestUrls.join('\n')).not.toContain('70184');
  expect(consoleMessages.join('\n')).not.toContain('70184');
  const persistedBrowserData = await page.evaluate(() =>
    JSON.stringify({
      localStorage: { ...localStorage },
      sessionStorage: { ...sessionStorage },
    }),
  );
  expect(persistedBrowserData).not.toContain('70184');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test('reloads the complete representative flow offline @chromium-only', async ({
  browserName,
  context,
  page,
}) => {
  test.setTimeout(90_000);
  test.skip(
    browserName !== 'chromium',
    'The production-like service-worker smoke test is gated on Chromium.',
  );

  const searchQuery = '50668';
  const requestUrls: string[] = [];
  const consoleMessages: string[] = [];
  page.on('request', (request) => requestUrls.push(request.url()));
  page.on('console', (message) => consoleMessages.push(message.text()));

  await page.goto('/formpacks');
  expect(
    await waitForServiceWorkerReady(page, {
      timeoutMs: 45_000,
    }),
  ).toBe(true);

  const catalogResponses = CATALOG_PATH_PATTERNS.map((pattern) =>
    page.waitForResponse((response) => {
      const path = new URL(response.url()).pathname;
      return response.ok() && pattern.test(path);
    }),
  );
  await page.goto(TOOL_PATH);
  await Promise.all(catalogResponses);
  await expect(
    page.getByLabel(/Postleitzahl oder Ort|Postcode or place/i),
  ).toBeVisible();
  const appOrigin = new URL(page.url()).origin;

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    const locationSearch = page.getByLabel(
      /Postleitzahl oder Ort|Postcode or place/i,
    );
    await expect(locationSearch).toBeVisible();
    await locationSearch.fill(searchQuery);
    await page
      .getByRole('button', {
        name: /Sanae Abdi.*(?:Wahlkreis|constituency) 92.*Köln I/i,
      })
      .click();

    const recipient = page.locator('#representative-letter-recipient');
    const subject = page.locator('#representative-letter-subject');
    const body = page.locator('#representative-letter-body');
    await expect(recipient).toHaveValue('sanae.abdi@bundestag.de');
    await expect(subject).not.toHaveValue('');
    await expect(body).toHaveValue(/Guten Tag Sanae Abdi,/u);

    const mailtoLink = page.getByRole('link', {
      name: /Im Mailprogramm öffnen|Open in email app/i,
    });
    const mailtoHref = await mailtoLink.getAttribute('href');
    expect(mailtoHref).not.toBeNull();
    const mailtoUrl = new URL(mailtoHref!);
    expect(mailtoUrl.pathname).toBe('sanae.abdi@bundestag.de');
    expect(mailtoUrl.searchParams.get('subject')).toBe(
      await subject.inputValue(),
    );
    expect(mailtoUrl.searchParams.get('body')).toBe(
      (await body.inputValue()).replaceAll('\n', '\r\n'),
    );

    expect(page.url()).not.toContain(searchQuery);
    const persistedBrowserData = await page.evaluate(() =>
      JSON.stringify({
        localStorage: { ...localStorage },
        sessionStorage: { ...sessionStorage },
      }),
    );
    expect(persistedBrowserData).not.toContain(searchQuery);
  } finally {
    await context.setOffline(false);
  }

  expect(
    requestUrls.filter((url) => new URL(url).origin !== appOrigin),
  ).toEqual([]);
  expect(requestUrls.join('\n')).not.toContain(searchQuery);
  expect(consoleMessages.join('\n')).not.toContain(searchQuery);
});
