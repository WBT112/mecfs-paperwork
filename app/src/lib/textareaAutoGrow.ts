export const adjustTextareaHeight = (
  element: HTMLTextAreaElement | null,
): void => {
  if (!element) {
    return;
  }

  element.style.height = 'auto';
  element.style.height = `${element.scrollHeight}px`;
};
