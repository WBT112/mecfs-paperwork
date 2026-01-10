import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FormpackDetailPage from './FormpackDetailPage';

const mockUpdateActiveRecord = vi.fn();
const mockMarkAsSaved = vi.fn();

const record = {
  id: 'record-1',
  formpackId: 'notfallpass',
  title: 'Draft',
  locale: 'de',
  data: { field: 'value' },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

vi.mock('@rjsf/core', () => ({
  default: ({
    children,
    formData,
    onChange,
  }: {
    children?: React.ReactNode;
    formData?: Record<string, unknown>;
    onChange?: (event: { formData: Record<string, unknown> }) => void;
  }) => (
    <div>
      <div data-testid="form-data">{JSON.stringify(formData)}</div>
      <button
        type="button"
        onClick={() => onChange?.({ formData: { field: 'value' } })}
      >
        trigger-change
      </button>
      {children}
    </div>
  ),
}));

vi.mock('../i18n/formpack', () => ({
  loadFormpackI18n: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../i18n/useLocale', () => ({
  useLocale: () => ({
    locale: 'de',
    setLocale: vi.fn(),
  }),
}));

vi.mock('../formpacks/documentModel', () => ({
  buildDocumentModel: () => ({
    diagnosisParagraphs: [],
    person: { name: null, birthDate: null },
    contacts: [],
    diagnoses: { formatted: null },
    symptoms: null,
    medications: [],
    allergies: null,
    doctor: { name: null, phone: null },
  }),
}));

vi.mock('../formpacks/loader', () => ({
  FormpackLoaderError: class extends Error {},
  loadFormpackManifest: vi.fn().mockResolvedValue({
    id: 'notfallpass',
    version: '1.0.0',
    titleKey: 'formpackTitle',
    descriptionKey: 'formpackDescription',
    defaultLocale: 'de',
    locales: ['de', 'en'],
    exports: [],
    docx: {
      templates: {
        a4: 'template-a4.docx',
        wallet: 'template-wallet.docx',
      },
      mapping: 'mapping.json',
    },
  }),
  loadFormpackSchema: vi.fn().mockResolvedValue({
    type: 'object',
    properties: {},
  }),
  loadFormpackUiSchema: vi.fn().mockResolvedValue({}),
}));

vi.mock('../storage/hooks', () => ({
  useRecords: () => ({
    records: [record],
    activeRecord: record,
    isLoading: false,
    hasLoaded: true,
    errorCode: null,
    createRecord: vi.fn(),
    loadRecord: vi.fn(),
    updateActiveRecord: mockUpdateActiveRecord,
    applyRecordUpdate: vi.fn(),
    setActiveRecord: vi.fn(),
  }),
  useSnapshots: () => ({
    snapshots: [],
    isLoading: false,
    errorCode: null,
    createSnapshot: vi.fn(),
    loadSnapshot: vi.fn(),
    refresh: vi.fn(),
  }),
  useAutosaveRecord: () => ({
    markAsSaved: mockMarkAsSaved,
  }),
}));

const mockT = (key: string) => key;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: { language: 'de' },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: () => undefined,
  },
}));

describe('FormpackDetailPage', () => {
  beforeEach(() => {
    mockUpdateActiveRecord.mockResolvedValue({
      ...record,
      data: {},
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('clears the draft and persists the reset', async () => {
    render(
      <MemoryRouter initialEntries={['/formpacks/notfallpass']}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const triggerButton = await screen.findByText('trigger-change');

    await waitFor(() =>
      expect(screen.getByTestId('form-data')).toHaveTextContent(
        JSON.stringify({}),
      ),
    );

    await userEvent.click(triggerButton);

    await waitFor(() =>
      expect(screen.getByTestId('form-data')).toHaveTextContent(
        JSON.stringify(record.data),
      ),
    );

    await userEvent.click(await screen.findByText('formpackFormReset'));

    await waitFor(() =>
      expect(mockUpdateActiveRecord).toHaveBeenCalledWith(record.id, {
        data: {},
        locale: 'de',
      }),
    );
    expect(mockUpdateActiveRecord).toHaveBeenCalledTimes(1);

    await waitFor(() =>
      expect(screen.getByTestId('form-data')).toHaveTextContent(
        JSON.stringify({}),
      ),
    );

    expect(mockMarkAsSaved).toHaveBeenCalledWith({});
  });
});
