declare module 'docx-templates/lib/browser.js' {
  export type CreateReportOptions = {
    template: Uint8Array;
    data: Record<string, unknown>;
    // docx-templates supports more options; add only if/when needed
    cmdDelimiter?: [string, string];
    literalXmlDelimiter?: string;
    processLineBreaks?: boolean;
  };

  export function createReport(
    options: CreateReportOptions,
  ): Promise<Uint8Array>;
}
