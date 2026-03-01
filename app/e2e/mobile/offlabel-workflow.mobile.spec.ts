import { expect, test, type Page } from '@playwright/test';
import { deleteDatabase } from '../helpers';
import { openFormpackWithRetry } from '../helpers/formpack';
import { switchLocale } from '../helpers/locale';
import { openCollapsibleSectionById } from '../helpers/sections';

const DB_NAME = 'mecfs-paperwork';
const FORM_PACK_ID = 'offlabel-antrag';
const OFFLABEL_INTRO_CHECKBOX_LABEL =
  /Ich habe verstanden|Habe verstanden, Nutzung auf eigenes Risiko|I understand, use at my own risk/i;

const acceptIntroGate = async (page: Page) => {
  const introHeading = page.getByRole('heading', { name: /hinweise/i });
  await expect(introHeading).toBeVisible({ timeout: 20_000 });

  await page.getByLabel(OFFLABEL_INTRO_CHECKBOX_LABEL).check({ force: true });
  await page.getByRole('button', { name: /weiter/i }).click();
  await expect(page.locator('.formpack-form')).toBeVisible({ timeout: 20_000 });
};

const selectIndicationByLabelText = async (
  page: Page,
  labelSnippet: string,
) => {
  const select = page.locator('#root_request_selectedIndicationKey');
  await expect(select).toBeVisible({ timeout: 20_000 });

  const value = await select.evaluate((node, snippet) => {
    const options = Array.from((node as HTMLSelectElement).options);
    const loweredSnippet = snippet.toLowerCase();
    const match = options.find((option) =>
      option.textContent?.toLowerCase().includes(loweredSnippet),
    );
    return match?.value ?? null;
  }, labelSnippet);

  if (!value) {
    throw new Error(
      `No indication option found for label snippet "${labelSnippet}".`,
    );
  }

  await select.selectOption(value);
};

const selectDrugByValue = async (page: Page, value: string) => {
  const select = page.locator('#root_request_drug');
  await expect(select).toBeVisible({ timeout: 20_000 });

  const resolvedValue = await select.evaluate((node, desired) => {
    const optionValues = Array.from((node as HTMLSelectElement).options).map(
      (option) => ({
        value: option.value,
        label: option.textContent?.toLowerCase() ?? '',
      }),
    );

    const normalized = desired.toLowerCase();
    const aliasMap: Record<string, string[]> = {
      ivabradine: ['ivabradine', 'ivabradin'],
      vortioxetine: ['vortioxetine', 'vortioxetin'],
      agomelatin: ['agomelatin', 'agomelatine'],
      ldn: ['ldn', 'low-dose naltrexon', 'low-dose naltrexone'],
      aripiprazole: ['aripiprazole', 'aripiprazol', 'lda'],
      other: ['other', 'anderes medikament', 'other medication'],
    };
    const candidates = aliasMap[normalized] ?? [normalized];

    const byValue = optionValues.find((option) =>
      candidates.includes(option.value.toLowerCase()),
    );
    if (byValue) {
      return byValue.value;
    }

    const byLabel = optionValues.find((option) =>
      candidates.some((candidate) => option.label.includes(candidate)),
    );
    return byLabel?.value ?? null;
  }, value);

  if (!resolvedValue) {
    throw new Error(`No drug option found for value "${value}".`);
  }

  await select.selectOption(resolvedValue);
};

const selectDrugNoEntry = async (page: Page) => {
  const select = page.locator('#root_request_drug');
  await expect(select).toBeVisible({ timeout: 20_000 });

  const hasEmptyOption = await select.evaluate((node) => {
    const options = Array.from((node as HTMLSelectElement).options);
    return options.some((option) => {
      const label = option.textContent?.toLowerCase() ?? '';
      return (
        option.value === '' ||
        label.includes('[medikament wählen]') ||
        label.includes('[select medication]') ||
        label.includes('[keine angabe]') ||
        label.includes('[no entry]')
      );
    });
  });

  if (!hasEmptyOption) {
    throw new Error('No empty medication option found.');
  }

  await select.selectOption('');
};

const selectIndicationConfirmation = async (
  page: Page,
  value: 'yes' | 'no',
) => {
  const confirmationIndex = value === 'yes' ? 0 : 1;
  const confirmationInput = page
    .locator('input[name="root_request_indicationFullyMetOrDoctorConfirms"]')
    .nth(confirmationIndex);
  await expect(confirmationInput).toBeVisible();
  await confirmationInput.check({ force: true });
};

const expectSelectedDrugLabelContains = async (
  page: Page,
  labelSnippet: string,
) => {
  const select = page.locator('#root_request_drug');
  await expect(select).toBeVisible({ timeout: 20_000 });
  await expect
    .poll(async () =>
      select.evaluate((node) => {
        const selected = (node as HTMLSelectElement).selectedOptions.item(0);
        return selected?.textContent?.toLowerCase() ?? '';
      }),
    )
    .toContain(labelSnippet.toLowerCase());
};

const setTheme = async (page: Page, theme: 'dark' | 'light') => {
  const themeSelect = page.locator('#theme-select');
  await expect(themeSelect).toBeVisible({ timeout: 20_000 });
  await themeSelect.selectOption(theme);
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
};

const openPart1Preview = async (page: Page) => {
  await openCollapsibleSectionById(page, 'formpack-document-preview');
  await page.getByRole('tab', { name: /(teil|part)\s*1/i }).click();
};

const expectNoHorizontalOverflow = async (page: Page) => {
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const viewportWidth = document.documentElement.clientWidth;
          const documentWidth = document.documentElement.scrollWidth;
          const bodyWidth = document.body.scrollWidth;
          return Math.max(documentWidth, bodyWidth) - viewportWidth;
        }),
      {
        timeout: 5_000,
        message:
          'Expected no horizontal overflow on mobile after selecting long indication labels.',
      },
    )
    .toBeLessThanOrEqual(0);
};

const getAttachmentCheckboxSizes = async (page: Page) => {
  const checkboxes = page.locator(
    '.attachments-assistant__recommended input[type="checkbox"]',
  );
  await expect(checkboxes).toHaveCount(8, { timeout: 20_000 });
  await checkboxes.first().scrollIntoViewIfNeeded();

  return checkboxes.evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
      };
    }),
  );
};

const getSeverityCheckboxReferenceSize = async (page: Page) => {
  return page.evaluate(() => {
    const selectors = [
      '#root_severity_merkzeichen input[type="checkbox"]',
      'input[name="root_severity_merkzeichen"]',
      'input[id^="root_severity_merkzeichen_"]',
    ];

    for (const selector of selectors) {
      const candidates = Array.from(
        document.querySelectorAll<HTMLInputElement>(selector),
      );
      const visible = candidates.find((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      if (visible) {
        const rect = visible.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }
    }

    return null;
  });
};

test.describe('offlabel workflow preview regressions @mobile', () => {
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    await deleteDatabase(page, DB_NAME);
    await openFormpackWithRetry(
      page,
      FORM_PACK_ID,
      page.getByRole('heading', { name: /hinweise/i }),
    );
    await acceptIntroGate(page);
    await openCollapsibleSectionById(page, 'formpack-document-preview');
  });

  test('standard path adds auxiliary §2 wording and keeps evidence block @mobile', async ({
    page,
  }) => {
    await selectDrugByValue(page, 'ivabradine');
    await selectIndicationConfirmation(page, 'yes');
    await page
      .getByLabel(
        /Hilfsweise gleichzeitig Antrag nach § 2 Abs\. 1a SGB V stellen/i,
      )
      .check({ force: true });

    await openPart1Preview(page);
    const preview = page.locator(
      '#formpack-document-preview-content .formpack-document-preview',
    );
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(/Hilfsweise stelle ich/i);
    await expect(preview).toContainText(/§ 2 Abs\. 1a SGB V/i);
    await expect(preview).toContainText(
      /Es liegen veröffentlichte Erkenntnisse vor, die nach sozialmedizinischer Einordnung eine der Zulassungsreife vergleichbare Datenlage stützen/i,
    );
  });

  test('other path uses direct wording, keeps selected indication, and clears other-only text after switch-back @mobile', async ({
    page,
  }) => {
    const otherOnlyText = 'E2E-OTHER-STANDARD-CARE-TEXT-MOBILE';

    await switchLocale(page, 'en');
    await setTheme(page, 'light');

    await selectDrugByValue(page, 'vortioxetine');
    await selectIndicationByLabelText(page, 'depressive symptoms');

    const preview = page.locator(
      '#formpack-document-preview-content .formpack-document-preview',
    );
    await openPart1Preview(page);
    await expect(preview).toBeVisible();
    await expect(preview).toContainText(
      /Long\/Post-COVID mit depressiven Symptomen/i,
    );
    await expect(preview).toContainText(
      /Die Diagnose Long\/Post-COVID ist gesichert \(siehe Befunde\)\. Depressive Symptome sind dokumentiert\./i,
    );

    await selectDrugByValue(page, 'other');
    await page.locator('#root_request_otherDrugName').fill('Midodrine');
    await page
      .locator('#root_request_otherIndication')
      .fill('Orthostatic intolerance');
    await page
      .locator('#root_request_otherTreatmentGoal')
      .fill('Improved orthostatic stability');
    await page.locator('#root_request_otherDose').fill('2.5 mg morning');
    await page.locator('#root_request_otherDuration').fill('12 weeks');
    await page
      .locator('#root_request_otherMonitoring')
      .fill('Heart rate and blood pressure checks');
    await page
      .locator('#root_request_otherEvidenceReference')
      .fill('Sample study 2024, doi:10.1000/example');
    await page
      .locator('#root_request_standardOfCareTriedFreeText')
      .fill(otherOnlyText);

    await openPart1Preview(page);
    await expect(preview).toContainText(
      /Ich beantrage Leistungen nach § 2 Abs\. 1a SGB V wegen einer wertungsmäßig vergleichbar schwerwiegenden Erkrankung\./i,
    );
    await expect(preview).toContainText(otherOnlyText);
    await expect(preview).toContainText(
      /Es gibt indiziengestützte Hinweise auf den Behandlungserfolg in meinem Krankheitsbild/i,
    );

    await selectDrugByValue(page, 'ivabradine');

    await expect(preview).not.toContainText(otherOnlyText);
    await expect(preview).not.toContainText(
      /Es gibt indiziengestützte Hinweise auf den Behandlungserfolg in meinem Krankheitsbild/i,
    );
    await expect(preview).toContainText(
      /Es liegen veröffentlichte Erkenntnisse vor, die nach sozialmedizinischer Einordnung eine der Zulassungsreife vergleichbare Datenlage stützen/i,
    );
  });

  test('keeps medication empty for [keine Angabe] in mobile workflow @mobile', async ({
    page,
  }) => {
    const select = page.locator('#root_request_drug');

    await selectDrugByValue(page, 'vortioxetine');
    await selectIndicationByLabelText(page, 'depressiven Symptomen');
    await expectSelectedDrugLabelContains(page, 'vortiox');

    await selectDrugNoEntry(page);
    await expect(select).toHaveValue('');

    await selectDrugByValue(page, 'agomelatin');
    await selectIndicationByLabelText(page, 'Long-/Post-COVID mit Fatigue');
    await expectSelectedDrugLabelContains(page, 'agomelat');

    await selectDrugNoEntry(page);
    await expect(select).toHaveValue('');
  });

  test('keeps mobile form layout within viewport for long indication labels @mobile', async ({
    page,
  }) => {
    await selectDrugByValue(page, 'aripiprazole');
    await selectIndicationByLabelText(page, 'Fatigue und PEM');

    await expectNoHorizontalOverflow(page);
  });

  test('matches attachments assistant checkbox size with severity checkboxes on mobile @mobile', async ({
    page,
  }) => {
    const referenceSize = await getSeverityCheckboxReferenceSize(page);
    expect(referenceSize).not.toBeNull();

    const sizes = await getAttachmentCheckboxSizes(page);
    const widths = sizes.map((size) => size.width);
    const heights = sizes.map((size) => size.height);

    for (const size of sizes) {
      expect(
        Math.abs(size.width - (referenceSize?.width ?? size.width)),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(size.height - (referenceSize?.height ?? size.height)),
      ).toBeLessThanOrEqual(1);
      expect(Math.abs(size.width - size.height)).toBeLessThanOrEqual(1);
    }

    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1);
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
  });
});

type SizeStats = {
  count: number;
  min: number | null;
  max: number | null;
  median: number | null;
};

type FormpackLayoutSnapshot = {
  formpackId: string;
  documentOverflowX: number;
  overflowingElementCount: number;
  overflowingElementSelectors: string[];
  detailWidth: number;
  formWidth: number;
  formPaddingX: number;
  formBorderRadius: number;
  fieldsetBorderRadius: number;
  checkboxSizes: SizeStats;
  textInputHeights: SizeStats;
  selectHeights: SizeStats;
};

const summarizeRange = (values: number[]) =>
  values.length > 1 ? Math.max(...values) - Math.min(...values) : 0;

const listFormpackIdsFromOverview = async (page: Page) => {
  await page.goto('/formpacks');
  const cards = page.locator('.formpack-card[href^="/formpacks/"]');
  await expect(cards.first()).toBeVisible({ timeout: 20_000 });

  return cards.evaluateAll((nodes) => {
    const ids = nodes
      .map((node) => {
        const href = node.getAttribute('href') ?? '';
        const [, id = ''] = href.match(/^\/formpacks\/(.+)$/) ?? [];
        return id.trim();
      })
      .filter((id) => id.length > 0);

    return Array.from(new Set(ids));
  });
};

const acceptIntroGateIfPresent = async (page: Page) => {
  const introCheckbox = page.getByLabel(OFFLABEL_INTRO_CHECKBOX_LABEL).first();
  const hasIntro = await introCheckbox
    .isVisible({ timeout: 1_500 })
    .catch(() => false);

  if (!hasIntro) {
    return;
  }

  await introCheckbox.check({ force: true });
  await page
    .getByRole('button', { name: /weiter|continue/i })
    .first()
    .click();
};

const openFormpackForLayoutAudit = async (page: Page, formpackId: string) => {
  await openFormpackWithRetry(
    page,
    formpackId,
    page.locator('.formpack-detail, .formpack-form, .app__error').first(),
  );

  await acceptIntroGateIfPresent(page);
  await expect(page.locator('.formpack-form')).toBeVisible({ timeout: 20_000 });
};

const collectLayoutSnapshot = async (
  page: Page,
  formpackId: string,
): Promise<FormpackLayoutSnapshot> => {
  return page.evaluate((id) => {
    const detailRoot = document.querySelector<HTMLElement>('.formpack-detail');
    const formRoot = document.querySelector<HTMLElement>('.formpack-form');
    const emptyStats: SizeStats = {
      count: 0,
      min: null,
      max: null,
      median: null,
    };

    if (!detailRoot || !formRoot) {
      return {
        formpackId: id,
        documentOverflowX: Number.POSITIVE_INFINITY,
        overflowingElementCount: Number.POSITIVE_INFINITY,
        overflowingElementSelectors: [
          'missing .formpack-detail or .formpack-form',
        ],
        detailWidth: 0,
        formWidth: 0,
        formPaddingX: 0,
        formBorderRadius: 0,
        fieldsetBorderRadius: 0,
        checkboxSizes: emptyStats,
        textInputHeights: emptyStats,
        selectHeights: emptyStats,
      };
    }

    const summarize = (values: number[]): SizeStats => {
      if (values.length === 0) {
        return emptyStats;
      }

      const sorted = [...values].sort((a, b) => a - b);
      const middle = Math.floor(sorted.length / 2);
      const median =
        sorted.length % 2 === 0
          ? (sorted[middle - 1] + sorted[middle]) / 2
          : sorted[middle];

      return {
        count: sorted.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        median,
      };
    };

    const isVisible = (element: HTMLElement) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.display !== 'none' &&
        style.visibility !== 'hidden'
      );
    };

    const describeElement = (element: Element) => {
      if (element.id) {
        return `#${element.id}`;
      }
      const classAttr =
        typeof element.className === 'string' ? element.className : '';
      const firstClass = classAttr
        .split(/\s+/)
        .map((entry) => entry.trim())
        .find(Boolean);
      return `${element.tagName.toLowerCase()}${firstClass ? `.${firstClass}` : ''}`;
    };

    const viewportWidth = document.documentElement.clientWidth;
    const documentOverflowX =
      Math.max(
        document.documentElement.scrollWidth,
        document.body.scrollWidth,
      ) - viewportWidth;
    const parsePx = (value: string) => Number.parseFloat(value) || 0;
    const formStyle = window.getComputedStyle(formRoot);
    const firstFieldset = formRoot.querySelector<HTMLElement>('fieldset');
    const fieldsetStyle = firstFieldset
      ? window.getComputedStyle(firstFieldset)
      : null;

    const overflowingElementSelectors: string[] = [];
    const overflowCandidates = Array.from(
      detailRoot.querySelectorAll<HTMLElement>(
        'fieldset, legend, label, p, h1, h2, h3, h4, h5, h6, input, select, textarea, button, .collapsible-section, .info-box, .app__button',
      ),
    );

    for (const candidate of overflowCandidates) {
      if (!isVisible(candidate)) {
        continue;
      }

      const rect = candidate.getBoundingClientRect();
      if (rect.left < -1 || rect.right > viewportWidth + 1) {
        overflowingElementSelectors.push(describeElement(candidate));
      }
    }

    const checkboxWidths = Array.from(
      formRoot.querySelectorAll<HTMLInputElement>(
        'fieldset input[type="checkbox"]',
      ),
    )
      .filter((checkbox) => isVisible(checkbox))
      .map((checkbox) => checkbox.getBoundingClientRect().width);

    const textInputHeights = Array.from(
      formRoot.querySelectorAll<HTMLInputElement>(
        'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]):not([type="file"]):not([type="range"]):not([type="color"]):not([type="submit"]):not([type="reset"])',
      ),
    )
      .filter((control) => isVisible(control))
      .map((control) => control.getBoundingClientRect().height);

    const selectHeights = Array.from(
      formRoot.querySelectorAll<HTMLSelectElement>('select'),
    )
      .filter((control) => isVisible(control))
      .map((control) => control.getBoundingClientRect().height);

    return {
      formpackId: id,
      documentOverflowX,
      overflowingElementCount: overflowingElementSelectors.length,
      overflowingElementSelectors: overflowingElementSelectors.slice(0, 8),
      detailWidth: detailRoot.getBoundingClientRect().width,
      formWidth: formRoot.getBoundingClientRect().width,
      formPaddingX:
        parsePx(formStyle.paddingLeft) + parsePx(formStyle.paddingRight),
      formBorderRadius: parsePx(formStyle.borderTopLeftRadius),
      fieldsetBorderRadius: fieldsetStyle
        ? parsePx(fieldsetStyle.borderTopLeftRadius)
        : 0,
      checkboxSizes: summarize(checkboxWidths),
      textInputHeights: summarize(textInputHeights),
      selectHeights: summarize(selectHeights),
    };
  }, formpackId);
};

test.describe('formpack layout consistency @mobile', () => {
  test.setTimeout(90_000);

  test('keeps layout metrics consistent across all formpacks @mobile', async ({
    page,
  }) => {
    await deleteDatabase(page, DB_NAME);

    const formpackIds = await listFormpackIdsFromOverview(page);
    expect(formpackIds.length).toBeGreaterThan(0);

    const snapshots: FormpackLayoutSnapshot[] = [];

    for (const formpackId of formpackIds) {
      await openFormpackForLayoutAudit(page, formpackId);
      const snapshot = await collectLayoutSnapshot(page, formpackId);

      expect(
        snapshot.documentOverflowX,
        `Horizontal overflow in "${formpackId}" was ${snapshot.documentOverflowX}.`,
      ).toBeLessThanOrEqual(0.5);
      expect(
        snapshot.overflowingElementCount,
        `Overflowing elements in "${formpackId}": ${snapshot.overflowingElementSelectors.join(', ')}`,
      ).toBe(0);
      expect(snapshot.detailWidth).toBeGreaterThan(0);
      expect(snapshot.formWidth).toBeGreaterThan(0);
      expect(snapshot.formPaddingX).toBeGreaterThanOrEqual(0);
      expect(snapshot.formBorderRadius).toBeGreaterThanOrEqual(0);
      expect(snapshot.fieldsetBorderRadius).toBeGreaterThanOrEqual(0);

      if (snapshot.checkboxSizes.count > 1) {
        expect(
          (snapshot.checkboxSizes.max ?? 0) - (snapshot.checkboxSizes.min ?? 0),
        ).toBeLessThanOrEqual(1);
      }

      if (snapshot.textInputHeights.count > 1) {
        expect(
          (snapshot.textInputHeights.max ?? 0) -
            (snapshot.textInputHeights.min ?? 0),
        ).toBeLessThanOrEqual(3);
      }

      if (snapshot.selectHeights.count > 1) {
        expect(
          (snapshot.selectHeights.max ?? 0) - (snapshot.selectHeights.min ?? 0),
        ).toBeLessThanOrEqual(2);
      }

      snapshots.push(snapshot);
    }

    const detailWidths = snapshots.map((snapshot) => snapshot.detailWidth);
    const formWidths = snapshots.map((snapshot) => snapshot.formWidth);
    const formPaddingValues = snapshots.map(
      (snapshot) => snapshot.formPaddingX,
    );
    const formBorderRadii = snapshots.map(
      (snapshot) => snapshot.formBorderRadius,
    );
    const fieldsetBorderRadii = snapshots.map(
      (snapshot) => snapshot.fieldsetBorderRadius,
    );
    const checkboxMedians = snapshots
      .map((snapshot) => snapshot.checkboxSizes.median)
      .filter((value): value is number => value !== null);
    const textInputMedians = snapshots
      .map((snapshot) => snapshot.textInputHeights.median)
      .filter((value): value is number => value !== null);
    const selectMedians = snapshots
      .map((snapshot) => snapshot.selectHeights.median)
      .filter((value): value is number => value !== null);

    expect(summarizeRange(detailWidths)).toBeLessThanOrEqual(2);
    expect(summarizeRange(formWidths)).toBeLessThanOrEqual(2);
    expect(summarizeRange(formPaddingValues)).toBeLessThanOrEqual(0.5);
    expect(summarizeRange(formBorderRadii)).toBeLessThanOrEqual(0.5);
    expect(summarizeRange(fieldsetBorderRadii)).toBeLessThanOrEqual(0.5);

    if (checkboxMedians.length > 1) {
      expect(summarizeRange(checkboxMedians)).toBeLessThanOrEqual(1);
    }

    if (textInputMedians.length > 1) {
      expect(summarizeRange(textInputMedians)).toBeLessThanOrEqual(3);
    }

    if (selectMedians.length > 1) {
      expect(summarizeRange(selectMedians)).toBeLessThanOrEqual(2);
    }
  });
});
