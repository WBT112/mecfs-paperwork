import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ImportPanel from '../../../src/pages/formpack-detail/ImportPanel';

const IMPORT_SECTION_LABEL = 'Import';
const IMPORT_ACTION_LABEL = 'Import now';

const createProps = () => ({
  labels: {
    title: IMPORT_SECTION_LABEL,
    hint: 'Choose a file',
    fileLabel: 'JSON file',
    fileName: (name: string) => `Selected: ${name}`,
    passwordLabel: 'Password',
    passwordHint: 'Password optional',
    passwordEncryptedHint: 'Password required',
    modeLabel: 'Mode',
    modeNew: 'New',
    modeOverwrite: 'Overwrite',
    modeOverwriteHint: 'Need active draft',
    includeRevisions: 'Include snapshots',
    statusLabel: 'Status',
    inProgress: 'Importing',
    action: IMPORT_ACTION_LABEL,
  },
  importInputRef: { current: null },
  importFileName: null as string | null,
  importPassword: '',
  isImportFileEncrypted: false,
  importMode: 'new' as const,
  importIncludeRevisions: true,
  importError: null as string | null,
  importSuccess: null as string | null,
  importJson: '{"ok":true}',
  isImporting: false,
  activeRecordExists: true,
  storageUnavailable: false,
  onImportModeChange: vi.fn(),
  onIncludeRevisionsChange: vi.fn(),
  onImportPasswordChange: vi.fn(),
  onFileChange: vi.fn(),
  onImport: vi.fn(),
});

describe('ImportPanel', () => {
  it('shows encrypted password hint and calls password handler', async () => {
    const props = createProps();
    props.isImportFileEncrypted = true;

    render(<ImportPanel {...props} />);

    await userEvent.click(
      screen.getByRole('button', { name: IMPORT_SECTION_LABEL }),
    );

    expect(screen.getByText('Password required')).toBeInTheDocument();

    const passwordInput = screen.getByLabelText('Password');
    await userEvent.type(passwordInput, 'secret');

    expect(props.onImportPasswordChange).toHaveBeenCalled();
  });

  it('shows overwrite hint when no active draft exists', async () => {
    const props = createProps();
    props.activeRecordExists = false;

    render(<ImportPanel {...props} />);

    await userEvent.click(
      screen.getByRole('button', { name: IMPORT_SECTION_LABEL }),
    );

    expect(screen.getByText('Need active draft')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Overwrite' })).toBeDisabled();
  });

  it('disables import action when import json is empty or importing', async () => {
    const props = createProps();
    props.importJson = '   ';

    const { rerender } = render(<ImportPanel {...props} />);
    await userEvent.click(
      screen.getByRole('button', { name: IMPORT_SECTION_LABEL }),
    );

    expect(
      screen.getByRole('button', { name: IMPORT_ACTION_LABEL }),
    ).toBeDisabled();

    rerender(<ImportPanel {...props} isImporting />);

    expect(screen.getByRole('button', { name: 'Importing' })).toBeDisabled();
  });

  it('calls mode/revision/file/import handlers', async () => {
    const props = createProps();

    render(<ImportPanel {...props} />);

    await userEvent.click(
      screen.getByRole('button', { name: IMPORT_SECTION_LABEL }),
    );

    fireEvent.click(screen.getByRole('radio', { name: 'Overwrite' }));
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Include snapshots' }),
    );

    const fileInput = screen.getByLabelText('JSON file');
    const file = new File(['{"ok":true}'], 'backup.json', {
      type: 'application/json',
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: IMPORT_ACTION_LABEL }));

    expect(props.onImportModeChange).toHaveBeenCalledWith('overwrite');
    expect(props.onIncludeRevisionsChange).toHaveBeenCalled();
    expect(props.onFileChange).toHaveBeenCalled();
    expect(props.onImport).toHaveBeenCalled();
  });
});
