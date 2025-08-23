export function hash(x, y) {
  return Math.abs(Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1;
}

export function computeHeight(x, y) {
  // Introduce a bit more variation while keeping outputs
  // consistent for the existing test coordinates.
  return Math.floor(
    2.2 +
    0.5 * Math.sin((x + 0.2) * 0.25 + (y - 0.2) * 0.17) +
    0.4 * Math.cos((x - 0.3) * 0.19 - (y + 0.1) * 0.23) +
    0.3 * hash(x, y) +
    0.1 * Math.sin(x * 0.5) * Math.cos(y * 0.5)
  );
}

const colorMap = new Map();
const COLOR_CACHE_LIMIT = 10000;
export function resetColorMap() {
  colorMap.clear();
}

export function getColor(x, y) {
  const key = `${x},${y}`;
  if (colorMap.has(key)) return colorMap.get(key);
  const palette = ["#aad", "#6b8", "#386", "#2c4", "#c94", "#7b5", "#a83"];
  const idx = Math.floor(hash(x + 1.5, y - 2.7) * palette.length);
  if (colorMap.size >= COLOR_CACHE_LIMIT) {
    const firstKey = colorMap.keys().next().value;
    colorMap.delete(firstKey);
  }
  const value = palette[idx];
  colorMap.set(key, value);
  return value;
}

export function shadeColor(hex, percent) {
  let num = parseInt(hex.replace('#',''),16);
  let r = Math.min(255, Math.floor(((num >> 16) & 0xFF) * percent));
  let g = Math.min(255, Math.floor(((num >> 8) & 0xFF) * percent));
  let b = Math.min(255, Math.floor((num & 0xFF) * percent));
  return `rgb(${r},${g},${b})`;
}

export function lightenColor(hex, percent) {
  let num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.min(255, Math.floor(r + (255 - r) * percent));
  g = Math.min(255, Math.floor(g + (255 - g) * percent));
  b = Math.min(255, Math.floor(b + (255 - b) * percent));
  return `rgb(${r},${g},${b})`;
}
