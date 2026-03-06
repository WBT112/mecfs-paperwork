import { OFFLABEL_ANTRAG_FORMPACK_ID } from '../../../formpacks';
import { offlabelPreviewHelpers } from '../helpers/offlabelPreviewHelpers';
import type { ReactNode } from 'react';
import type { OfflabelRenderedDocument } from '../../../formpacks/offlabel-antrag/content/buildOfflabelDocuments';

/**
 * Props required to render the document preview content for a formpack.
 */
export interface FormpackDocumentPreviewContentProps {
  documentPreview: ReactNode;
  emptyLabel: string;
  formpackId: string | null;
  hasDocumentContent: boolean;
  offlabelPreviewDocuments: OfflabelRenderedDocument[];
  onSelectOfflabelPreview: (id: 'part1' | 'part2' | 'part3') => void;
  selectedOfflabelPreviewId: 'part1' | 'part2' | 'part3';
}

/**
 * Renders the generic or offlabel-specific document preview body.
 *
 * @param props - Current preview payloads and interaction handlers.
 * @returns Preview tabs/content or the translated empty state.
 */
export default function FormpackDocumentPreviewContent({
  documentPreview,
  emptyLabel,
  formpackId,
  hasDocumentContent,
  offlabelPreviewDocuments,
  onSelectOfflabelPreview,
  selectedOfflabelPreviewId,
}: Readonly<FormpackDocumentPreviewContentProps>) {
  if (formpackId === OFFLABEL_ANTRAG_FORMPACK_ID) {
    return (
      <div className="formpack-document-preview formpack-document-preview--offlabel">
        <div className="formpack-document-preview__tabs" role="tablist">
          {offlabelPreviewDocuments.map((doc) => (
            <button
              key={doc.id}
              id={`offlabel-tab-${doc.id}`}
              role="tab"
              type="button"
              className="app__button"
              aria-selected={selectedOfflabelPreviewId === doc.id}
              aria-controls={`offlabel-tabpanel-${doc.id}`}
              onClick={() => onSelectOfflabelPreview(doc.id)}
            >
              {doc.title}
            </button>
          ))}
        </div>
        {offlabelPreviewDocuments
          .filter((doc) => doc.id === selectedOfflabelPreviewId)
          .map((doc) => (
            <div
              key={doc.id}
              id={`offlabel-tabpanel-${doc.id}`}
              role="tabpanel"
              aria-labelledby={`offlabel-tab-${doc.id}`}
            >
              {offlabelPreviewHelpers.renderOfflabelPreviewDocument(doc)}
            </div>
          ))}
      </div>
    );
  }

  if (hasDocumentContent) {
    return <div className="formpack-document-preview">{documentPreview}</div>;
  }

  return <p className="formpack-document-preview__empty">{emptyLabel}</p>;
}
