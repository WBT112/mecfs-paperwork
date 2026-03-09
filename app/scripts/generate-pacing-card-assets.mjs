/* global console, process */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const width = 1200;
const height = 360;
const outputDir = path.resolve(
  process.cwd(),
  'public/formpacks/pacing-ampelkarten/assets',
);

const parseHex = (hex) => {
  const normalized = hex.replace('#', '');
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
    a: 255,
  };
};

const mix = (start, end, ratio) => ({
  r: Math.round(start.r + (end.r - start.r) * ratio),
  g: Math.round(start.g + (end.g - start.g) * ratio),
  b: Math.round(start.b + (end.b - start.b) * ratio),
  a: Math.round(start.a + (end.a - start.a) * ratio),
});

const setPixel = (png, x, y, color) => {
  if (x < 0 || x >= png.width || y < 0 || y >= png.height) {
    return;
  }
  const idx = (png.width * y + x) << 2;
  const alpha = color.a / 255;
  const invAlpha = 1 - alpha;
  png.data[idx] = Math.round(color.r * alpha + png.data[idx] * invAlpha);
  png.data[idx + 1] = Math.round(
    color.g * alpha + png.data[idx + 1] * invAlpha,
  );
  png.data[idx + 2] = Math.round(
    color.b * alpha + png.data[idx + 2] * invAlpha,
  );
  png.data[idx + 3] = Math.round(
    (alpha + (png.data[idx + 3] / 255) * invAlpha) * 255,
  );
};

const fillRect = (png, x, y, rectWidth, rectHeight, color) => {
  for (let py = y; py < y + rectHeight; py += 1) {
    for (let px = x; px < x + rectWidth; px += 1) {
      setPixel(png, px, py, color);
    }
  }
};

const fillCircle = (png, cx, cy, radius, color) => {
  const squared = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= squared) {
        setPixel(png, x, y, color);
      }
    }
  }
};

const fillEllipse = (png, cx, cy, rx, ry, color) => {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) {
        setPixel(png, x, y, color);
      }
    }
  }
};

const fillRoundedRect = (png, x, y, rectWidth, rectHeight, radius, color) => {
  fillRect(png, x + radius, y, rectWidth - radius * 2, rectHeight, color);
  fillRect(png, x, y + radius, rectWidth, rectHeight - radius * 2, color);
  fillCircle(png, x + radius, y + radius, radius, color);
  fillCircle(png, x + rectWidth - radius, y + radius, radius, color);
  fillCircle(png, x + radius, y + rectHeight - radius, radius, color);
  fillCircle(
    png,
    x + rectWidth - radius,
    y + rectHeight - radius,
    radius,
    color,
  );
};

const drawThickLine = (png, x1, y1, x2, y2, thickness, color) => {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let step = 0; step <= steps; step += 1) {
    const ratio = steps === 0 ? 0 : step / steps;
    const x = x1 + (x2 - x1) * ratio;
    const y = y1 + (y2 - y1) * ratio;
    fillCircle(png, x, y, thickness / 2, color);
  }
};

const createCanvas = (startHex, endHex) => {
  const png = new PNG({ width, height });
  const start = parseHex(startHex);
  const end = parseHex(endHex);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = mix(start, end, x / width);
      setPixel(png, x, y, color);
    }
  }
  return png;
};

const addSharedBackdrop = (png, palette) => {
  fillRect(png, 0, 0, width, 24, { ...palette.deep, a: 255 });
  fillEllipse(png, 220, 300, 380, 110, { ...palette.soft, a: 120 });
  fillEllipse(png, 980, 52, 190, 98, { ...palette.light, a: 110 });
  fillCircle(png, 170, 92, 26, { ...palette.spark, a: 160 });
  fillCircle(png, 270, 62, 18, { ...palette.spark, a: 96 });
  fillCircle(png, 332, 126, 14, { ...palette.spark, a: 176 });
};

const drawSloth = (png) => {
  const branch = parseHex('#5B3A26');
  const leaf = parseHex('#2E6F4E');
  const body = parseHex('#E9D8C0');
  const fur = parseHex('#7A5A3B');
  const mask = parseHex('#4B3426');
  const nose = parseHex('#2D2019');
  const claw = parseHex('#6A4B34');

  drawThickLine(png, 736, 78, 1132, 102, 16, branch);
  drawThickLine(png, 915, 102, 868, 150, 9, branch);
  drawThickLine(png, 1014, 106, 1046, 154, 9, branch);
  fillEllipse(png, 798, 78, 22, 10, leaf);
  fillEllipse(png, 850, 86, 18, 12, leaf);
  fillEllipse(png, 1098, 100, 20, 11, leaf);

  fillEllipse(png, 958, 182, 98, 78, fur);
  fillEllipse(png, 956, 176, 62, 58, body);
  fillEllipse(png, 928, 162, 26, 34, body);
  fillEllipse(png, 984, 162, 26, 34, body);
  fillEllipse(png, 934, 162, 18, 22, mask);
  fillEllipse(png, 979, 162, 18, 22, mask);
  fillCircle(png, 934, 162, 6, { ...parseHex('#FFFFFF'), a: 255 });
  fillCircle(png, 979, 162, 6, { ...parseHex('#FFFFFF'), a: 255 });
  fillCircle(png, 934, 162, 2.5, nose);
  fillCircle(png, 979, 162, 2.5, nose);
  fillEllipse(png, 956, 190, 13, 10, nose);
  drawThickLine(png, 940, 200, 972, 200, 3, nose);

  drawThickLine(png, 918, 208, 894, 248, 10, claw);
  drawThickLine(png, 994, 208, 1018, 248, 10, claw);
  drawThickLine(png, 930, 236, 910, 290, 11, claw);
  drawThickLine(png, 980, 236, 1000, 292, 11, claw);
};

const drawPanda = (png) => {
  const bamboo = parseHex('#5D8B3A');
  const bambooLight = parseHex('#7DA64E');
  const fur = parseHex('#23242A');
  const cream = parseHex('#F4F0E8');
  const deep = parseHex('#14151A');

  for (const x of [760, 810, 1090]) {
    fillRect(png, x, 38, 22, 240, bamboo);
    fillRect(png, x, 96, 22, 6, bambooLight);
    fillRect(png, x, 162, 22, 6, bambooLight);
    fillRect(png, x, 224, 22, 6, bambooLight);
  }

  fillEllipse(png, 955, 196, 108, 104, cream);
  fillCircle(png, 886, 112, 40, fur);
  fillCircle(png, 1028, 112, 40, fur);
  fillEllipse(png, 910, 165, 34, 44, fur);
  fillEllipse(png, 1008, 165, 34, 44, fur);
  fillEllipse(png, 956, 214, 56, 68, fur);
  fillEllipse(png, 904, 248, 36, 54, fur);
  fillEllipse(png, 1007, 248, 36, 54, fur);
  fillEllipse(png, 956, 120, 62, 54, cream);
  fillEllipse(png, 956, 146, 22, 18, fur);
  fillCircle(png, 927, 152, 6, { ...parseHex('#FFFFFF'), a: 255 });
  fillCircle(png, 985, 152, 6, { ...parseHex('#FFFFFF'), a: 255 });
  fillCircle(png, 927, 152, 2.5, deep);
  fillCircle(png, 985, 152, 2.5, deep);
  drawThickLine(png, 742, 212, 824, 248, 10, fur);
  fillEllipse(png, 742, 212, 36, 14, bambooLight);
};

const drawLion = (png) => {
  const mane = parseHex('#8B3F26');
  const maneLight = parseHex('#B95D3B');
  const body = parseHex('#E9B06D');
  const face = parseHex('#F6DFC3');
  const deep = parseHex('#4B2A1F');

  fillCircle(png, 968, 168, 112, mane);
  fillCircle(png, 968, 168, 86, maneLight);
  fillCircle(png, 968, 168, 60, face);
  fillCircle(png, 912, 118, 18, body);
  fillCircle(png, 1024, 118, 18, body);
  fillEllipse(png, 944, 168, 10, 14, deep);
  fillEllipse(png, 992, 168, 10, 14, deep);
  fillCircle(png, 944, 164, 3, { ...parseHex('#FFFFFF'), a: 255 });
  fillCircle(png, 992, 164, 3, { ...parseHex('#FFFFFF'), a: 255 });
  fillEllipse(png, 968, 192, 24, 18, face);
  fillEllipse(png, 952, 190, 10, 8, deep);
  fillEllipse(png, 984, 190, 10, 8, deep);
  fillEllipse(png, 968, 184, 12, 8, deep);
  drawThickLine(png, 948, 205, 988, 205, 3, deep);
  drawThickLine(png, 915, 198, 944, 194, 2, deep);
  drawThickLine(png, 915, 210, 944, 210, 2, deep);
  drawThickLine(png, 915, 222, 944, 226, 2, deep);
  drawThickLine(png, 992, 194, 1021, 198, 2, deep);
  drawThickLine(png, 992, 210, 1021, 210, 2, deep);
  drawThickLine(png, 992, 226, 1021, 222, 2, deep);

  fillRoundedRect(png, 888, 236, 166, 74, 36, body);
  fillEllipse(png, 890, 298, 28, 18, body);
  fillEllipse(png, 1056, 298, 28, 18, body);
  drawThickLine(png, 924, 244, 902, 300, 12, maneLight);
  drawThickLine(png, 1008, 244, 1035, 298, 12, maneLight);
  drawThickLine(png, 1032, 244, 1089, 300, 14, maneLight);
};

const writeAsset = (name, startHex, endHex, palette, renderer) => {
  const png = createCanvas(startHex, endHex);
  addSharedBackdrop(png, palette);
  renderer(png);
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, name), PNG.sync.write(png));
};

writeAsset(
  'card-green-sloth.png',
  '#E5F4D7',
  '#A6D6A0',
  {
    deep: parseHex('#2D5F3B'),
    soft: parseHex('#F3FAEA'),
    light: parseHex('#D5EBCF'),
    spark: parseHex('#FFFFFF'),
  },
  drawSloth,
);

writeAsset(
  'card-yellow-panda.png',
  '#FFF2BF',
  '#E4B74E',
  {
    deep: parseHex('#8A5C00'),
    soft: parseHex('#FFF8DA'),
    light: parseHex('#FFE9A6'),
    spark: parseHex('#FFFDF2'),
  },
  drawPanda,
);

writeAsset(
  'card-red-lion.png',
  '#FFD6C1',
  '#E58E69',
  {
    deep: parseHex('#8D3B25'),
    soft: parseHex('#FFE8DE'),
    light: parseHex('#F8C5AE'),
    spark: parseHex('#FFF3ED'),
  },
  drawLion,
);

console.log('Generated pacing card assets in', outputDir);
