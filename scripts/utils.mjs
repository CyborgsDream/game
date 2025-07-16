export function hash(x, y) {
  return Math.abs(Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1;
}

export function computeHeight(x, y) {
  // For this simplified build the terrain is completely flat at height 0.
  // We keep the function for API compatibility but ignore the input.
  return 0;
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
  let h = hex.replace('#','');
  // Expand 3-digit hex colors to 6-digit so bit operations work correctly
  if (h.length === 3) {
    h = h.split('').map(c => c + c).join('');
  }
  let num = parseInt(h, 16);
  let r = Math.min(255, Math.floor(((num >> 16) & 0xFF) * percent));
  let g = Math.min(255, Math.floor(((num >> 8) & 0xFF) * percent));
  let b = Math.min(255, Math.floor((num & 0xFF) * percent));
  return `rgb(${r},${g},${b})`;
}
