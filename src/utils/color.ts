export type RGB = { r: number; g: number; b: number };

export const hexToRgb = (hex: string): RGB => {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
};

export const rgbToCss = (c: RGB, a: number = 1): string =>
  `rgba(${c.r|0},${c.g|0},${c.b|0},${a})`;

export const lerpRgb = (a: RGB, b: RGB, t: number): RGB => ({
  r: a.r + (b.r - a.r) * t,
  g: a.g + (b.g - a.g) * t,
  b: a.b + (b.b - a.b) * t,
});

export const heatColor = (t: number): RGB => {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped < 0.5) {
    return lerpRgb(hexToRgb('#22d3ee'), hexToRgb('#f59e0b'), clamped * 2);
  }
  return lerpRgb(hexToRgb('#f59e0b'), hexToRgb('#ec4899'), (clamped - 0.5) * 2);
};
