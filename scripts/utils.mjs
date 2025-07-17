export function hash(x, y) {
  return Math.abs(Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1;
}

export function computeHeight(x, y) {
  // Generate a rolling heightmap that stays roughly within the range 0-3 so
  // the terrain never rises too high. Using both sine/cosine waves and some
  // pseudo-random noise gives a natural looking surface.
  const noise =
    0.8 * Math.sin(x * 0.3 + y * 0.17) +
    0.6 * Math.cos(x * 0.27 - y * 0.19) +
    (hash(x, y) - 0.5) * 0.8;

  const h = Math.floor(1.5 + noise);
  return Math.min(3, Math.max(0, h));
}

let colorMap = {};
export function resetColorMap() {
  colorMap = {};
}

export function getColor(x, y) {
  const key = x + ',' + y;
  if (colorMap[key]) return colorMap[key];
  const palette = ["#aad", "#6b8", "#386", "#2c4", "#c94", "#7b5", "#a83"];
  const idx = Math.floor(hash(x + 1.5, y - 2.7) * palette.length);
  colorMap[key] = palette[idx];
  return colorMap[key];
}

export function shadeColor(hex, percent) {
  let num = parseInt(hex.replace('#',''),16);
  let r = Math.min(255, Math.floor(((num >> 16) & 0xFF) * percent));
  let g = Math.min(255, Math.floor(((num >> 8) & 0xFF) * percent));
  let b = Math.min(255, Math.floor((num & 0xFF) * percent));
  return `rgb(${r},${g},${b})`;
}
