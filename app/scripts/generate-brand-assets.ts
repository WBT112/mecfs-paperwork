import { Resvg } from '@resvg/resvg-js';
import pngToIco from 'png-to-ico';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type OutputFile = {
  filename: string;
  label: string;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '..');
const sourceDir = path.join(appRoot, 'src', 'assets', 'brand');
const publicDir = path.join(appRoot, 'public');

const inputFiles = {
  square: path.join(sourceDir, 'logo-square.svg'),
  wide: path.join(sourceDir, 'logo-wide.svg'),
};

const outputFiles: OutputFile[] = [
  { filename: 'favicon.ico', label: 'favicon ico' },
  { filename: 'favicon-16x16.png', label: 'favicon 16x16' },
  { filename: 'favicon-32x32.png', label: 'favicon 32x32' },
  { filename: 'apple-touch-icon.png', label: 'apple touch icon' },
  { filename: 'android-chrome-192x192.png', label: 'android chrome 192' },
  { filename: 'android-chrome-512x512.png', label: 'android chrome 512' },
  { filename: 'social-share-1200x630.png', label: 'social share' },
  { filename: 'site.webmanifest', label: 'web manifest' },
];

const squareOutputMap = new Map<number, string>([
  [16, 'favicon-16x16.png'],
  [32, 'favicon-32x32.png'],
  [180, 'apple-touch-icon.png'],
  [192, 'android-chrome-192x192.png'],
  [512, 'android-chrome-512x512.png'],
]);

const icoSizes = [16, 32, 48];

const renderPngBuffer = (svgContent: string, width: number): Buffer => {
  const resvg = new Resvg(svgContent, {
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: false },
  });
  const pngData = resvg.render();
  return Buffer.from(pngData.asPng());
};

const readSvg = async (filePath: string): Promise<string> => {
  try {
    return await readFile(filePath, 'utf-8');
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error while reading.';
    throw new Error(`Missing input asset: ${filePath}. ${message}`);
  }
};

const writeOutput = async (filename: string, contents: Buffer | string) => {
  const destination = path.join(publicDir, filename);
  await writeFile(destination, contents);
};

const ensureOutputs = async () => {
  await Promise.all(
    outputFiles.map(async ({ filename, label }) => {
      const filePath = path.join(publicDir, filename);
      try {
        const stats = await stat(filePath);
        if (stats.size <= 0) {
          throw new Error(`Generated file is empty: ${filename}`);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown error while reading.';
        throw new Error(`Missing ${label} output at ${filePath}. ${message}`);
      }
    }),
  );
};

const buildManifest = () =>
  JSON.stringify(
    {
      name: 'mecfs-paperwork',
      short_name: 'mecfs-paperwork',
      start_url: '/',
      display: 'standalone',
      background_color: '#191919',
      theme_color: '#191919',
      icons: [
        {
          src: '/android-chrome-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/android-chrome-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    },
    null,
    2,
  );

const generateAssets = async () => {
  const squareSvg = await readSvg(inputFiles.square);
  const wideSvg = await readSvg(inputFiles.wide);

  await mkdir(publicDir, { recursive: true });

  const squareBuffers = new Map<number, Buffer>();
  for (const size of [...squareOutputMap.keys(), ...icoSizes]) {
    if (squareBuffers.has(size)) {
      continue;
    }
    squareBuffers.set(size, renderPngBuffer(squareSvg, size));
  }

  await Promise.all(
    Array.from(squareOutputMap.entries()).map(([size, filename]) => {
      const buffer = squareBuffers.get(size);
      if (!buffer) {
        throw new Error(`Missing rendered PNG buffer for ${size}px.`);
      }
      return writeOutput(filename, buffer);
    }),
  );

  const icoBuffers = icoSizes.map((size) => {
    const buffer = squareBuffers.get(size);
    if (!buffer) {
      throw new Error(`Missing rendered PNG buffer for ${size}px.`);
    }
    return buffer;
  });
  const icoBuffer = await pngToIco(icoBuffers);
  await writeOutput('favicon.ico', icoBuffer);

  const socialBuffer = renderPngBuffer(wideSvg, 1200);
  await writeOutput('social-share-1200x630.png', socialBuffer);

  await writeOutput('site.webmanifest', `${buildManifest()}\n`);

  await ensureOutputs();
};

const isCheckOnly = process.argv.includes('--check');

const run = async () => {
  if (isCheckOnly) {
    await ensureOutputs();
    return;
  }

  await generateAssets();
};

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Brand asset generation failed: ${message}`);
  process.exit(1);
});
