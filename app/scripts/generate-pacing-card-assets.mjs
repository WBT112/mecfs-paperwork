/* global console, process */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const width = 1200;
const height = 360;
const outputDirs = [
  path.resolve(process.cwd(), 'public/formpacks/pacing-ampelkarten/assets'),
  path.resolve(process.cwd(), 'src/formpacks/pacing-ampelkarten/export/assets'),
];

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

const drawSmile = (
  png,
  cx,
  cy,
  radius,
  startAngle,
  endAngle,
  thickness,
  color,
) => {
  for (let angle = startAngle; angle <= endAngle; angle += Math.PI / 180) {
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    fillCircle(png, x, y, thickness / 2, color);
  }
};

const addBlush = (png, cx, cy, color) => {
  fillEllipse(png, cx, cy, 18, 10, { ...color, a: 110 });
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
  fillRect(png, 0, 0, width, 26, { ...palette.deep, a: 255 });
  fillEllipse(png, 170, 84, 110, 44, { ...palette.spark, a: 150 });
  fillEllipse(png, 270, 62, 90, 34, { ...palette.spark, a: 120 });
  fillEllipse(png, 390, 98, 120, 48, { ...palette.spark, a: 140 });
  fillEllipse(png, 240, 300, 360, 94, { ...palette.soft, a: 145 });
  fillEllipse(png, 944, 46, 210, 86, { ...palette.light, a: 120 });
  fillCircle(png, 948, 100, 18, { ...palette.spark, a: 150 });
  fillCircle(png, 998, 74, 12, { ...palette.spark, a: 130 });
  fillCircle(png, 1042, 112, 10, { ...palette.spark, a: 165 });
};

const drawSloth = (png) => {
  const branch = parseHex('#7A583C');
  const leaf = parseHex('#5B9B6D');
  const body = parseHex('#EEDFCC');
  const fur = parseHex('#8D6A49');
  const mask = parseHex('#5D4430');
  const nose = parseHex('#2D2019');
  const claw = parseHex('#7A6043');
  const blush = parseHex('#F3BEAF');

  drawThickLine(png, 736, 74, 1134, 98, 18, branch);
  drawThickLine(png, 918, 98, 872, 148, 10, branch);
  drawThickLine(png, 1012, 102, 1050, 148, 10, branch);
  fillEllipse(png, 804, 74, 24, 12, leaf);
  fillEllipse(png, 854, 84, 22, 13, leaf);
  fillEllipse(png, 1096, 97, 22, 12, leaf);

  fillEllipse(png, 960, 188, 104, 84, fur);
  fillEllipse(png, 960, 184, 68, 64, body);
  fillCircle(png, 928, 160, 28, body);
  fillCircle(png, 992, 160, 28, body);
  fillEllipse(png, 936, 166, 22, 26, mask);
  fillEllipse(png, 984, 166, 22, 26, mask);
  fillCircle(png, 936, 166, 7, { ...parseHex('#FFFFFF'), a: 255 });
  fillCircle(png, 984, 166, 7, { ...parseHex('#FFFFFF'), a: 255 });
  fillCircle(png, 936, 166, 2.5, nose);
  fillCircle(png, 984, 166, 2.5, nose);
  addBlush(png, 922, 188, blush);
  addBlush(png, 998, 188, blush);
  fillEllipse(png, 960, 194, 14, 10, nose);
  drawSmile(png, 960, 197, 16, 0.2, 2.94, 3, nose);

  drawThickLine(png, 920, 214, 892, 254, 12, claw);
  drawThickLine(png, 1000, 214, 1028, 254, 12, claw);
  drawThickLine(png, 936, 238, 918, 292, 12, claw);
  drawThickLine(png, 984, 238, 1002, 292, 12, claw);
};

const drawPanda = (png) => {
  const bamboo = parseHex('#6D9B4A');
  const bambooLight = parseHex('#8EBE62');
  const fur = parseHex('#23242A');
  const cream = parseHex('#F8F4ED');
  const deep = parseHex('#14151A');
  const blush = parseHex('#F2C2BA');

  for (const x of [742, 798, 1088]) {
    fillRect(png, x, 38, 22, 240, bamboo);
    fillRect(png, x, 96, 22, 6, bambooLight);
    fillRect(png, x, 162, 22, 6, bambooLight);
    fillRect(png, x, 224, 22, 6, bambooLight);
  }

  fillEllipse(png, 956, 206, 110, 108, cream);
  fillCircle(png, 892, 116, 36, fur);
  fillCircle(png, 1020, 116, 36, fur);
  fillEllipse(png, 916, 170, 34, 42, fur);
  fillEllipse(png, 996, 170, 34, 42, fur);
  fillEllipse(png, 956, 228, 60, 72, fur);
  fillEllipse(png, 906, 258, 36, 52, fur);
  fillEllipse(png, 1006, 258, 36, 52, fur);
  fillEllipse(png, 956, 128, 66, 56, cream);
  fillEllipse(png, 956, 150, 24, 18, fur);
  fillCircle(png, 928, 156, 6, { ...parseHex('#FFFFFF'), a: 255 });
  fillCircle(png, 984, 156, 6, { ...parseHex('#FFFFFF'), a: 255 });
  fillCircle(png, 928, 156, 2.5, deep);
  fillCircle(png, 984, 156, 2.5, deep);
  addBlush(png, 910, 186, blush);
  addBlush(png, 1002, 186, blush);
  drawSmile(png, 956, 184, 17, 0.3, 2.84, 3, deep);
  drawThickLine(png, 724, 220, 822, 250, 10, fur);
  fillEllipse(png, 724, 218, 38, 14, bambooLight);
};

const drawLion = (png) => {
  const mane = parseHex('#B5613E');
  const maneLight = parseHex('#D88455');
  const body = parseHex('#F1C17C');
  const face = parseHex('#FAE5CB');
  const deep = parseHex('#5A3425');
  const blush = parseHex('#F5B8A2');

  fillCircle(png, 968, 164, 108, mane);
  fillCircle(png, 968, 164, 82, maneLight);
  fillCircle(png, 968, 164, 62, face);
  fillCircle(png, 914, 114, 18, body);
  fillCircle(png, 1022, 114, 18, body);
  fillEllipse(png, 944, 164, 10, 13, deep);
  fillEllipse(png, 992, 164, 10, 13, deep);
  fillCircle(png, 944, 160, 3, { ...parseHex('#FFFFFF'), a: 255 });
  fillCircle(png, 992, 160, 3, { ...parseHex('#FFFFFF'), a: 255 });
  addBlush(png, 924, 186, blush);
  addBlush(png, 1012, 186, blush);
  fillEllipse(png, 968, 188, 24, 18, face);
  fillEllipse(png, 952, 186, 10, 8, deep);
  fillEllipse(png, 984, 186, 10, 8, deep);
  fillEllipse(png, 968, 180, 12, 8, deep);
  drawSmile(png, 968, 192, 18, 0.25, 2.9, 3, deep);
  drawThickLine(png, 916, 196, 942, 192, 2, deep);
  drawThickLine(png, 916, 208, 942, 208, 2, deep);
  drawThickLine(png, 916, 220, 942, 224, 2, deep);
  drawThickLine(png, 994, 192, 1020, 196, 2, deep);
  drawThickLine(png, 994, 208, 1020, 208, 2, deep);
  drawThickLine(png, 994, 224, 1020, 220, 2, deep);

  fillRoundedRect(png, 888, 238, 166, 74, 36, body);
  fillEllipse(png, 890, 300, 28, 18, body);
  fillEllipse(png, 1056, 300, 28, 18, body);
  drawThickLine(png, 924, 246, 902, 302, 12, maneLight);
  drawThickLine(png, 1008, 246, 1036, 300, 12, maneLight);
  drawThickLine(png, 1032, 246, 1092, 302, 14, maneLight);
  fillCircle(png, 1102, 302, 12, maneLight);
};

const writeAsset = (name, startHex, endHex, palette, renderer) => {
  const png = createCanvas(startHex, endHex);
  addSharedBackdrop(png, palette);
  renderer(png);
  const buffer = PNG.sync.write(png);
  for (const outputDir of outputDirs) {
    mkdirSync(outputDir, { recursive: true });
    writeFileSync(path.join(outputDir, name), buffer);
  }
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

console.log('Generated pacing card assets in', outputDirs.join(', '));
