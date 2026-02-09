import { Font } from '@react-pdf/renderer';

export const PDF_FONT_FAMILY_SANS = 'MecfsSans';
export const PDF_FONT_FAMILY_SERIF = 'MecfsSerif';

const liberationSansRegular = new URL(
  '../../assets/fonts/liberation/LiberationSans-Regular.ttf',
  import.meta.url,
).toString();
const liberationSansBold = new URL(
  '../../assets/fonts/liberation/LiberationSans-Bold.ttf',
  import.meta.url,
).toString();
const liberationSansItalic = new URL(
  '../../assets/fonts/liberation/LiberationSans-Italic.ttf',
  import.meta.url,
).toString();
const liberationSansBoldItalic = new URL(
  '../../assets/fonts/liberation/LiberationSans-BoldItalic.ttf',
  import.meta.url,
).toString();

const liberationSerifRegular = new URL(
  '../../assets/fonts/liberation/LiberationSerif-Regular.ttf',
  import.meta.url,
).toString();
const liberationSerifBold = new URL(
  '../../assets/fonts/liberation/LiberationSerif-Bold.ttf',
  import.meta.url,
).toString();
const liberationSerifItalic = new URL(
  '../../assets/fonts/liberation/LiberationSerif-Italic.ttf',
  import.meta.url,
).toString();
const liberationSerifBoldItalic = new URL(
  '../../assets/fonts/liberation/LiberationSerif-BoldItalic.ttf',
  import.meta.url,
).toString();

let fontsRegistered = false;

export const ensurePdfFontsRegistered = () => {
  if (fontsRegistered) {
    return;
  }

  Font.register({
    family: PDF_FONT_FAMILY_SANS,
    fonts: [
      { src: liberationSansRegular, fontWeight: 400, fontStyle: 'normal' },
      { src: liberationSansBold, fontWeight: 700, fontStyle: 'normal' },
      { src: liberationSansItalic, fontWeight: 400, fontStyle: 'italic' },
      { src: liberationSansBoldItalic, fontWeight: 700, fontStyle: 'italic' },
    ],
  });

  Font.register({
    family: PDF_FONT_FAMILY_SERIF,
    fonts: [
      { src: liberationSerifRegular, fontWeight: 400, fontStyle: 'normal' },
      { src: liberationSerifBold, fontWeight: 700, fontStyle: 'normal' },
      { src: liberationSerifItalic, fontWeight: 400, fontStyle: 'italic' },
      { src: liberationSerifBoldItalic, fontWeight: 700, fontStyle: 'italic' },
    ],
  });

  fontsRegistered = true;
};
