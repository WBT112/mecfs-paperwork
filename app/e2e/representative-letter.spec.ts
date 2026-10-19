import { expect, test } from '@playwright/test';

const TOOL_PATH = '/tools/representative-letter';
const TOOL_STATE_KEY = 'mecfs-paperwork.representative-letter.state.v2';

test('opens directly and retains only tab-local representative-letter state', async ({
  context,
  page,
}) => {
  await page.goto('/formpacks');
  await page
    .getByRole('link', {
      name: /Brief an Abgeordnete|letter to representatives/i,
    })
    .click();
  await expect(page).toHaveURL(new RegExp(`${TOOL_PATH}$`));

  await page
    .getByRole('button', { name: /Brief vorbereiten|prepare letter/i })
    .last()
    .click();
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
  await page.getByLabel(/ME-Schweregrad|ME severity/i).selectOption('moderate');
  await page
    .getByLabel(/Variante zum Schweregrad|Severity variant/i)
    .selectOption('2');
  await page
    .getByLabel(
      /Pflegegrad oder Antragsstatus|Care grade or application status/i,
    )
    .selectOption('pending');
  await page.getByLabel(/persönliche Absätze|personal paragraphs/i).check();
  await expect(page.locator('#representative-letter-body')).toHaveValue(
    /Mein Alltag ist eine ständige Abwägung/u,
  );
  await expect(page.locator('#representative-letter-body')).toHaveValue(
    /Mein Antrag auf einen Pflegegrad läuft/u,
  );
  await expect(page.locator('#representative-letter-body')).toHaveValue(
    /Guten Tag Sanae Abdi,/u,
  );
  await expect(page.locator('#representative-letter-body')).not.toHaveValue(
    /\[/u,
  );
  const mailtoLink = page.getByRole('link', {
    name: /Im E-Mail-Programm öffnen|Open in email application/i,
  });
  await expect(mailtoLink).toHaveAttribute(
    'href',
    /^mailto:sanae\.abdi@bundestag\.de\?subject=/,
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
  await expect(page.getByLabel(/ME-Schweregrad|ME severity/i)).toHaveValue(
    'moderate',
  );
  await expect(
    page.getByLabel(
      /Pflegegrad oder Antragsstatus|Care grade or application status/i,
    ),
  ).toHaveValue('pending');
  await expect(
    page.getByLabel(/persönliche Absätze|personal paragraphs/i),
  ).toBeChecked();

  await page.goto('/formpacks');
  await page.goBack();
  await expect(
    page.getByRole('button', { name: /Langform|long version/i }),
  ).toHaveAttribute('aria-pressed', 'true');

  const secondTab = await context.newPage();
  await secondTab.goto(TOOL_PATH);
  await expect(
    secondTab.getByRole('button', {
      name: /^(Informationen|Information)$/i,
    }),
  ).toHaveAttribute('aria-pressed', 'true');
  await secondTab.close();

  await page.evaluate(() => sessionStorage.setItem('unrelated', 'keep'));
  await page.getByRole('button', { name: /Zurücksetzen|reset/i }).click();
  await expect(
    page.getByRole('button', { name: /^(Informationen|Information)$/i }),
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
