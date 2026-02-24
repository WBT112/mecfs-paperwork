import type { FormpackManifest } from '../../formpacks/types';

type DevMetadataLabels = {
  detailsHeading: string;
  idLabel: string;
  versionLabel: string;
  defaultLocaleLabel: string;
  localesLabel: string;
  exportsHeading: string;
  exportsLabel: string;
  docxHeading: string;
  docxTemplateA4: string;
  docxTemplateWallet: string;
  docxTemplateWalletUnavailable: string;
  docxMapping: string;
};

type DevMetadataPanelProps = {
  show: boolean;
  manifest: FormpackManifest;
  labels: DevMetadataLabels;
};

export default function DevMetadataPanel({
  show,
  manifest,
  labels,
}: DevMetadataPanelProps) {
  if (!show) {
    return null;
  }

  return (
    <>
      <div className="formpack-detail__section">
        <h3>{labels.detailsHeading}</h3>
        <dl>
          <div>
            <dt>{labels.idLabel}</dt>
            <dd>{manifest.id}</dd>
          </div>
          <div>
            <dt>{labels.versionLabel}</dt>
            <dd>{manifest.version}</dd>
          </div>
          <div>
            <dt>{labels.defaultLocaleLabel}</dt>
            <dd>{manifest.defaultLocale}</dd>
          </div>
          <div>
            <dt>{labels.localesLabel}</dt>
            <dd>{manifest.locales.join(', ')}</dd>
          </div>
        </dl>
      </div>

      <div className="formpack-detail__section">
        <h3>{labels.exportsHeading}</h3>
        <dl>
          <div>
            <dt>{labels.exportsLabel}</dt>
            <dd>{manifest.exports.join(', ')}</dd>
          </div>
        </dl>
      </div>

      {manifest.docx && (
        <div className="formpack-detail__section">
          <h3>{labels.docxHeading}</h3>
          <dl>
            <div>
              <dt>{labels.docxTemplateA4}</dt>
              <dd>{manifest.docx.templates.a4}</dd>
            </div>
            <div>
              <dt>{labels.docxTemplateWallet}</dt>
              <dd>
                {manifest.docx.templates.wallet
                  ? manifest.docx.templates.wallet
                  : labels.docxTemplateWalletUnavailable}
              </dd>
            </div>
            <div>
              <dt>{labels.docxMapping}</dt>
              <dd>{manifest.docx.mapping}</dd>
            </div>
          </dl>
        </div>
      )}
    </>
  );
}
