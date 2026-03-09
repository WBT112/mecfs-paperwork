import { describe, expect, it } from 'vitest';
import { buildMailtoHref, getShareUrl } from '../../../src/lib/topbarActions';

const APP_ORIGIN = 'https://example.com';
const FORMPACK_DETAIL_PATH = '/formpacks/alpha';
const FORMPACK_LIST_URL = `${APP_ORIGIN}/formpacks`;

describe('buildMailtoHref', () => {
  it('builds a mailto link with encoded subject and body', () => {
    const href = buildMailtoHref({
      to: 'feedback@example.com',
      subject: `mecfs-paperwork feedback: ${FORMPACK_DETAIL_PATH}`,
      intro: 'Please do not include any patient or health data.',
      debugLabel: 'Debug info',
      fields: [
        { label: 'Mode', value: 'test' },
        { label: 'Path', value: FORMPACK_DETAIL_PATH },
      ],
      prompt: 'Describe the issue below:',
    });

    expect(href.startsWith('mailto:feedback@example.com?')).toBe(true);

    const query = href.split('?')[1];
    const params = new URLSearchParams(query);

    expect(params.get('subject')).toBe(
      `mecfs-paperwork feedback: ${FORMPACK_DETAIL_PATH}`,
    );
    expect(params.get('body')).toBe(
      [
        'Please do not include any patient or health data.',
        '',
        'Debug info:',
        'Mode: test',
        `Path: ${FORMPACK_DETAIL_PATH}`,
        '',
        'Describe the issue below:',
      ].join('\n'),
    );
  });
});

describe('getShareUrl', () => {
  it('returns the formpack detail URL when on a detail route', () => {
    expect(
      getShareUrl({
        origin: APP_ORIGIN,
        pathname: FORMPACK_DETAIL_PATH,
      }),
    ).toBe(`${APP_ORIGIN}${FORMPACK_DETAIL_PATH}`);
  });

  it('falls back to the formpacks list when no detail route is present', () => {
    expect(
      getShareUrl({
        origin: APP_ORIGIN,
        pathname: '/imprint',
      }),
    ).toBe(FORMPACK_LIST_URL);
  });

  it('normalizes slash-only paths to the formpacks list URL', () => {
    expect(
      getShareUrl({
        origin: APP_ORIGIN,
        pathname: '////',
      }),
    ).toBe(FORMPACK_LIST_URL);
  });
});
