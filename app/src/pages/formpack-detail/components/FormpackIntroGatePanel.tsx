import FormpackIntroGate from '../../../components/FormpackIntroGate';
import type { RefObject } from 'react';

/**
 * Props required to render a formpack intro gate in the shared form content area.
 */
export interface FormpackIntroGatePanelProps {
  body: string;
  checkboxLabel: string;
  formContentRef: RefObject<HTMLDivElement | null>;
  onConfirm: () => void;
  startButtonLabel: string;
  title: string;
}

/**
 * Renders the mandatory intro gate in the same DOM position for all formpack editors.
 *
 * @param props - Intro copy, confirmation handler, and focus container ref.
 * @returns The intro gate panel wrapped with the shared focus anchor.
 */
export default function FormpackIntroGatePanel({
  body,
  checkboxLabel,
  formContentRef,
  onConfirm,
  startButtonLabel,
  title,
}: Readonly<FormpackIntroGatePanelProps>) {
  return (
    <div ref={formContentRef}>
      <FormpackIntroGate
        title={title}
        body={body}
        checkboxLabel={checkboxLabel}
        startButtonLabel={startButtonLabel}
        onConfirm={onConfirm}
      />
    </div>
  );
}
