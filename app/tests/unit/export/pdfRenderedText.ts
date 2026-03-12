import { isValidElement, type ReactElement, type ReactNode } from 'react';

export const collectRenderedText = (node: ReactNode): string[] => {
  if (typeof node === 'string') {
    return [node];
  }
  if (
    typeof node === 'number' ||
    node === null ||
    node === undefined ||
    typeof node === 'boolean'
  ) {
    return [];
  }
  if (Array.isArray(node)) {
    return node.flatMap((child) => collectRenderedText(child));
  }
  if (isValidElement(node)) {
    return collectRenderedText(
      (node as ReactElement<{ children?: ReactNode }>).props.children,
    );
  }
  return [];
};
