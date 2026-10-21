import { expect, test } from '@playwright/test';

const TOOL_PATH = '/tools/representative-letter';
const TOOL_STATE_KEY = 'mecfs-paperwork.representative-letter.state.v3';

test('opens directly and retains only tab-local representative-letter state', async ({
  browserName,
  context,
  page,
}) => {
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
      name: /Brief an Abgeordnete|letter to representatives/i,
    })
    .click();
  await expect(page).toHaveURL(new RegExp(`${TOOL_PATH}$`));

  await expect(page.locator('#representative-letter-recipient')).toBeVisible();
  await expect(page.locator('#representative-letter-subject')).toBeVisible();
  await expect(page.locator('#representative-letter-body')).toBeVisible();
  await expect(page.locator('a[download], button[download]')).toHaveCount(0);

  await page
    .getByLabel(/Name oder Wahlkreis|Name or constituency/i)
    .fill('Sanae Abdi');
  await page
    .getByRole('button', {
      name: /Sanae Abdi als Empfänger auswählen|Select Sanae Abdi as recipient/i,
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
  const mailtoLink = page.getByRole('link', {
    name: /Im E-Mail-Programm öffnen|Open in email application/i,
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

  const search = page.getByLabel(/Name oder Wahlkreis|Name or constituency/i);
  await search.fill('Aaron Valent');
  await page
    .getByRole('button', {
      name: /Aaron Valent als Empfänger auswählen|Select Aaron Valent as recipient/i,
    })
    .click();
  await expect(page.locator('#representative-letter-body')).toHaveValue(
    /Guten Tag Aaron Valent,/u,
  );
  await expect(page.locator('#representative-letter-body')).not.toHaveValue(
    /Guten Tag Sanae Abdi,/u,
  );

  await page.getByRole('button', { name: /Langform|long version/i }).click();
  await page.reload();
  await expect(
    page.getByRole('button', { name: /Langform|long version/i }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#representative-letter-recipient')).toHaveValue(
    'aaron.valent@bundestag.de',
  );
  await page.goto('/formpacks');
  await page.goBack();
  await expect(
    page.getByRole('button', { name: /Langform|long version/i }),
  ).toHaveAttribute('aria-pressed', 'true');

  const secondTab = await context.newPage();
  await secondTab.goto(TOOL_PATH);
  await expect(
    secondTab.getByRole('button', {
      name: /Brief vorbereiten|prepare letter/i,
    }),
  ).toHaveAttribute('aria-pressed', 'true');
  await secondTab.close();

  await page.evaluate(() => sessionStorage.setItem('unrelated', 'keep'));
  await page.getByRole('button', { name: /Zurücksetzen|reset/i }).click();
  await expect(
    page.getByRole('button', { name: /Brief vorbereiten|prepare letter/i }),
  ).toHaveAttribute('aria-pressed', 'true');
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
  page.on('request', (request) => {
    const url = new URL(request.url());
    requestOrigins.push(url.origin);
  });

  await page.goto(TOOL_PATH);
  await expect(
    page.getByLabel(/Ort oder Postleitzahl|Place or postcode/i),
  ).toBeVisible();

  await context.setOffline(true);
  try {
    await page
      .getByLabel(/Ort oder Postleitzahl|Place or postcode/i)
      .fill('70184');
    await expect(
      page.getByText(/passt zu 2 Wahlkreisen|matches 2 constituencies/i),
    ).toBeVisible();
    await page
      .getByRole('button', {
        name: /Wahlkreis 258.*Stuttgart I auswählen|Select constituency 258.*Stuttgart I/i,
      })
      .click();
    await expect(
      page
        .getByRole('button', {
          name: /als Empfänger auswählen|as recipient/i,
        })
        .first(),
    ).toBeVisible();
  } finally {
    await context.setOffline(false);
  }

  const appOrigin = new URL(page.url()).origin;
  expect(requestOrigins.filter((origin) => origin !== appOrigin)).toEqual([]);
  expect(page.url()).not.toContain('70184');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
