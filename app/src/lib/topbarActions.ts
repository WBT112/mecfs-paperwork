export type MailtoField = {
  label: string;
  value: string;
};

export type MailtoOptions = {
  to: string;
  subject: string;
  intro: string;
  debugLabel: string;
  fields: MailtoField[];
  prompt: string;
};

export const buildMailtoHref = ({
  to,
  subject,
  intro,
  debugLabel,
  fields,
  prompt,
}: MailtoOptions): string => {
  const bodyLines = [
    intro,
    '',
    `${debugLabel}:`,
    ...fields.map((field) => `${field.label}: ${field.value}`),
    '',
    prompt,
  ];

  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(bodyLines.join('\n'));

  return `mailto:${to}?subject=${encodedSubject}&body=${encodedBody}`;
};

export type ShareUrlOptions = {
  origin: string;
  pathname: string;
};

const normalizePathname = (pathname: string): string => {
  let end = pathname.length;
  while (end > 0 && pathname[end - 1] === '/') {
    end -= 1;
  }
  const trimmed = pathname.slice(0, end);
  return trimmed.length > 0 ? trimmed : '/';
};

const isFormpackDetailPath = (pathname: string): boolean => {
  if (!pathname.startsWith('/formpacks/')) {
    return false;
  }
  const segments = pathname.split('/').filter(Boolean);
  return segments.length === 2;
};

export const getShareUrl = ({ origin, pathname }: ShareUrlOptions): string => {
  const normalizedPathname = normalizePathname(pathname);
  const sharePath = isFormpackDetailPath(normalizedPathname)
    ? normalizedPathname
    : '/formpacks';

  return new URL(sharePath, origin).toString();
};
