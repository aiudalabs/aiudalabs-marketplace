// Color math shared by the scripts in this folder. No dependencies.
// sRGB <-> OKLCH conversion follows Björn Ottosson's OKLab definition.
// Contrast follows the WCAG 2.x relative luminance formula.

export function parseHex(input) {
  const hex = String(input).trim().replace(/^#/, '');
  const full = hex.length === 3 ? [...hex].map((char) => char + char).join('') : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [0, 2, 4].map((start) => parseInt(full.slice(start, start + 2), 16) / 255);
}

export function toHex(rgb) {
  const channel = (value) => Math.round(Math.min(1, Math.max(0, value)) * 255).toString(16).padStart(2, '0');
  return `#${rgb.map(channel).join('')}`;
}

const toLinear = (value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
const fromLinear = (value) => (value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055);

export function rgbToOklch(rgb) {
  const [r, g, b] = rgb.map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bAxis = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const chroma = Math.hypot(a, bAxis);
  const hue = (Math.atan2(bAxis, a) * 180) / Math.PI;
  return [lightness, chroma, hue < 0 ? hue + 360 : hue];
}

// Returns linear-light sRGB, which may fall outside 0..1 when out of gamut.
function oklchToLinearRgb([lightness, chroma, hue]) {
  const radians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);

  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const GAMUT_TOLERANCE = 0.0001;
const inGamut = (linear) => linear.every((value) => value >= -GAMUT_TOLERANCE && value <= 1 + GAMUT_TOLERANCE);

// Converts to sRGB, lowering chroma until the color fits. Lightness and hue are kept.
export function oklchToRgb([lightness, chroma, hue]) {
  let low = 0;
  let high = chroma;
  if (!inGamut(oklchToLinearRgb([lightness, high, hue]))) {
    for (let step = 0; step < 24; step++) {
      const middle = (low + high) / 2;
      if (inGamut(oklchToLinearRgb([lightness, middle, hue]))) low = middle;
      else high = middle;
    }
    high = low;
  }
  const rgb = oklchToLinearRgb([lightness, high, hue]).map((value) => fromLinear(Math.min(1, Math.max(0, value))));
  return { rgb, chroma: high };
}

// WCAG 2.x relative luminance. The spec text uses 0.03928 as the threshold.
export function relativeLuminance(rgb) {
  const [r, g, b] = rgb.map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground, background) {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}
