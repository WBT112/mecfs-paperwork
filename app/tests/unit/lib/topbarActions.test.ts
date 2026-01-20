import { describe, expect, it } from 'vitest';
import { buildMailtoHref, getShareUrl } from '../../../src/lib/topbarActions';

describe('buildMailtoHref', () => {
  it('builds a mailto link with encoded subject and body', () => {
    const href = buildMailtoHref({
      to: 'feedback@example.com',
      subject: 'mecfs-paperwork feedback: /formpacks/alpha',
      intro: 'Please do not include any patient or health data.',
      debugLabel: 'Debug info',
      fields: [
        { label: 'Mode', value: 'test' },
        { label: 'Path', value: '/formpacks/alpha' },
      ],
      prompt: 'Describe the issue below:',
    });

    expect(href.startsWith('mailto:feedback@example.com?')).toBe(true);

    const query = href.split('?')[1];
    const params = new URLSearchParams(query);

    expect(params.get('subject')).toBe(
      'mecfs-paperwork feedback: /formpacks/alpha',
    );
    expect(params.get('body')).toBe(
      [
        'Please do not include any patient or health data.',
        '',
        'Debug info:',
        'Mode: test',
        'Path: /formpacks/alpha',
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
        origin: 'https://example.com',
        pathname: '/formpacks/alpha',
      }),
    ).toBe('https://example.com/formpacks/alpha');
  });

  it('falls back to the formpacks list when no detail route is present', () => {
    expect(
      getShareUrl({
        origin: 'https://example.com',
        pathname: '/imprint',
      }),
    ).toBe('https://example.com/formpacks');
  });
});
