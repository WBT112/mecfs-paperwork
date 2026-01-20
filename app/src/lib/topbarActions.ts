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

  const params = new URLSearchParams({
    subject,
    body: bodyLines.join('\n'),
  });

  return `mailto:${to}?${params.toString()}`;
};

export type ShareUrlOptions = {
  origin: string;
  pathname: string;
};

const normalizePathname = (pathname: string): string => {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed.length > 0 ? trimmed : '/';
};

export const getShareUrl = ({ origin, pathname }: ShareUrlOptions): string => {
  const normalizedPathname = normalizePathname(pathname);
  const isFormpackDetail = /^\/formpacks\/[^/]+$/.test(normalizedPathname);
  const sharePath = isFormpackDetail ? normalizedPathname : '/formpacks';

  return new URL(sharePath, origin).toString();
};
