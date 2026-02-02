import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { TestRouter } from '../setup/testRouter';
import { describe, expect, it, vi } from 'vitest';
import FormpackDetailPage from '../../src/pages/FormpackDetailPage';
import type { FormpackManifest } from '../../src/formpacks/types';
import type { RecordEntry } from '../../src/storage/types';

interface MockFormProps {
  formData: {
    decision?: Record<string, unknown>;
  };
  uiSchema: {
    decision?: Record<string, any>;
  };
  onChange: (event: { formData: Record<string, unknown> }) => void;
}

const { TEST_RECORD, TEST_MANIFEST, storageState } = vi.hoisted(() => {
  const record: RecordEntry = {
    id: 'record-1',
    formpackId: 'doctor-letter',
    title: 'Draft',
    locale: 'de',
    data: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const manifest: FormpackManifest = {
    id: 'doctor-letter',
    version: '1.0.0',
    titleKey: 'doctorLetterTitle',
    descriptionKey: 'doctorLetterDescription',
    defaultLocale: 'de',
    locales: ['de', 'en'],
    exports: ['docx', 'json'],
    visibility: 'public',
    docx: {
      templates: { a4: 'a4.docx' },
      mapping: 'mapping.json',
    },
  };

  return {
    TEST_RECORD: record,
    TEST_MANIFEST: manifest,
    storageState: {
      markAsSaved: vi.fn(),
    },
  };
});

// Mocking @rjsf/core
vi.mock('@rjsf/core', () => ({
  default: ({ formData, uiSchema, onChange }: MockFormProps) => {
    return (
      <div data-testid="mock-form">
        <div data-testid="form-data">{JSON.stringify(formData)}</div>
        <div data-testid="ui-schema">{JSON.stringify(uiSchema)}</div>
        <button
          type="button"
          data-testid="trigger-q1-yes"
          onClick={() => {
            const decision = formData.decision || {};
            onChange({
              formData: {
                ...formData,
                decision: {
                  ...decision,
                  q1: 'yes',
                },
              },
            });
          }}
        >
          Q1 Yes
        </button>
        <button
          type="button"
          data-testid="trigger-q2-no"
          onClick={() => {
            const decision = formData.decision || {};
            onChange({
              formData: {
                ...formData,
                decision: {
                  ...decision,
                  q1: 'yes',
                  q2: 'no',
                },
              },
            });
          }}
        >
          Q2 No
        </button>
      </div>
    );
  },
}));

vi.mock('../../src/i18n/formpack', () => ({
  loadFormpackI18n: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/i18n/useLocale', () => ({
  useLocale: () => ({
    locale: 'de',
    setLocale: vi.fn(),
  }),
}));

vi.mock('../../src/formpacks/loader', () => ({
  FormpackLoaderError: class extends Error {},
  loadFormpackManifest: vi.fn().mockResolvedValue(TEST_MANIFEST),
  loadFormpackSchema: vi.fn().mockResolvedValue({
    type: 'object',
    properties: {
      decision: {
        type: 'object',
        properties: {
          q1: { type: 'string', enum: ['yes', 'no'] },
          q2: { type: 'string', enum: ['yes', 'no'] },
          resolvedCaseText: { type: 'string' },
        },
      },
    },
  }),
  loadFormpackUiSchema: vi.fn().mockResolvedValue({
    decision: {
      q1: { 'ui:title': 'Question 1' },
      q2: { 'ui:title': 'Question 2' },
      resolvedCaseText: { 'ui:widget': 'textarea' },
    },
  }),
}));

vi.mock('../../src/storage/hooks', () => ({
  useRecords: () => ({
    records: [TEST_RECORD],
    activeRecord: TEST_RECORD,
    isLoading: false,
    hasLoaded: true,
    errorCode: null,
    createRecord: vi.fn(),
    loadRecord: vi.fn().mockResolvedValue(TEST_RECORD),
    updateActiveRecord: vi.fn().mockImplementation(
      async (
        _id: string,
        update: {
          data?: Record<string, unknown>;
          locale?: string;
          title?: string;
        },
      ) => {
        if (update.data) {
          TEST_RECORD.data = update.data;
        }
        return TEST_RECORD;
      },
    ),
    applyRecordUpdate: vi.fn().mockImplementation((record: RecordEntry) => {
      Object.assign(TEST_RECORD, record);
    }),
    deleteRecord: vi.fn(),
    setActiveRecord: vi.fn(),
  }),
  useSnapshots: () => ({
    snapshots: [],
    isLoading: false,
    errorCode: null,
    createSnapshot: vi.fn(),
    loadSnapshot: vi.fn(),
    clearSnapshots: vi.fn(),
    refresh: vi.fn(),
  }),
  useAutosaveRecord: () => ({
    markAsSaved: storageState.markAsSaved,
  }),
}));

const mockT = vi.fn((key: string, options?: { defaultValue?: string }) => {
  if (key === 'doctor-letter.case.11.paragraph') return 'Case 11 Paragraph';
  return options?.defaultValue ?? key;
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: { language: 'de' },
  }),
}));

vi.mock('../../src/export/docxLazy', () => ({
  preloadDocxAssets: vi.fn().mockResolvedValue(undefined),
  getDocxErrorKey: vi.fn(),
}));

describe('Doctor Letter Decision Integration', () => {
  it('updates field visibility and resolves case text when answering decision questions', async () => {
    render(
      <TestRouter initialEntries={['/formpacks/doctor-letter']}>
        <Routes>
          <Route path="/formpacks/:id" element={<FormpackDetailPage />} />
        </Routes>
      </TestRouter>,
    );

    // Wait for the form to be loaded and activeRecord to be recognized
    const q1Button = await screen.findByTestId(
      'trigger-q1-yes',
      {},
      { timeout: 5000 },
    );

    // Initially, q2 should be hidden in uiSchema
    await waitFor(
      () => {
        const uiSchemaElement = screen.getByTestId('ui-schema');
        const uiSchemaStr = uiSchemaElement.textContent || '{}';
        const uiSchema = JSON.parse(uiSchemaStr) as {
          decision: Record<string, Record<string, unknown>>;
        };
        expect(uiSchema.decision.q2['ui:widget']).toBe('hidden');
      },
      { timeout: 3000 },
    );

    // Answer Q1 with 'yes'
    await userEvent.click(q1Button);

    // Now q2 should be visible (not hidden)
    await waitFor(() => {
      const uiSchemaElement = screen.getByTestId('ui-schema');
      const uiSchemaStr = uiSchemaElement.textContent || '{}';
      const uiSchema = JSON.parse(uiSchemaStr) as {
        decision: Record<string, Record<string, unknown>>;
      };
      expect(uiSchema.decision.q2['ui:widget']).not.toBe('hidden');
    });

    // Answer Q2 with 'no'
    const q2Button = screen.getByTestId('trigger-q2-no');
    await userEvent.click(q2Button);

    // Check if resolvedCaseText is updated to Case 11 Paragraph
    await waitFor(() => {
      const formDataElement = screen.getByTestId('form-data');
      const formDataStr = formDataElement.textContent || '{}';
      const formData = JSON.parse(formDataStr) as {
        decision: Record<string, unknown>;
      };
      expect(formData.decision.resolvedCaseText).toBe('Case 11 Paragraph');
    });
  });
});
