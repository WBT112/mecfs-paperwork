import { expect, test } from '@playwright/test';

const TOOL_PATH = '/tools/representative-letter';
const TOOL_STATE_KEY = 'mecfs-paperwork.representative-letter.state.v1';

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

  await page.getByRole('button', { name: /Langform|long version/i }).click();
  await page.reload();
  await expect(
    page.getByRole('button', { name: /Langform|long version/i }),
  ).toHaveAttribute('aria-pressed', 'true');

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
