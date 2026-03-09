// @vitest-environment node
import { describe, expect, it } from 'vitest';
import manifest from '../../public/formpacks/offlabel-antrag/manifest.json';
import { shouldShowInfoBox } from '../../src/formpacks/formpackInfoBox';
import type { InfoBoxConfig } from '../../src/formpacks/types';

const FLOW_STATUS_PREFIX = 'offlabel-flow-status-';
const infoBoxes = manifest.ui.infoBoxes as InfoBoxConfig[];

const getVisibleFlowStatusIds = (formData: Record<string, unknown>) =>
  infoBoxes
    .filter((box) => box.id.startsWith(FLOW_STATUS_PREFIX))
    .filter((box) => shouldShowInfoBox(box, formData))
    .map((box) => box.id);

describe('offlabel flow status info boxes', () => {
  it('shows regular status for standard medication without auxiliary section 2', () => {
    expect(
      getVisibleFlowStatusIds({
        request: {
          drug: 'agomelatin',
          applySection2Abs1a: false,
        },
      }),
    ).toEqual(['offlabel-flow-status-regular']);
  });

  it('shows regular+auxiliary status for standard medication with section 2', () => {
    expect(
      getVisibleFlowStatusIds({
        request: {
          drug: 'agomelatin',
          applySection2Abs1a: true,
        },
      }),
    ).toEqual(['offlabel-flow-status-regular-aux']);
  });

  it('shows direct section 2 status for other medication', () => {
    expect(
      getVisibleFlowStatusIds({
        request: {
          drug: 'other',
          applySection2Abs1a: false,
        },
      }),
    ).toEqual(['offlabel-flow-status-direct-section2']);
  });
});
