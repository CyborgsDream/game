export function hash(x, y) {
  return Math.abs(Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1;
}

export function computeHeight(x, y) {
  return Math.floor(
    2.2 +
    2 * Math.sin(x * 0.25 + y * 0.17) +
    1.5 * Math.cos(x * 0.19 - y * 0.23) +
    0.8 * hash(x, y)
  );
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
