export function hash(x, y) {
  return Math.abs(Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1;
}

export function computeHeight(x, y) {
  // Generate a gentle rolling heightmap. The combination of sine, cosine
  // and hashed noise produces terrain variation while keeping the results
  // within a low [0,3] height range.
  const noise =
    0.8 * Math.sin(x * 0.3 + y * 0.17) +
    0.6 * Math.cos(x * 0.27 - y * 0.19) +
    // Center the hash around 0 then scale it to keep the final height low
    (hash(x, y) - 0.5) * 0.8;

  const h = Math.floor(1.5 + noise);
  // Clamp to ensure the terrain never exceeds the [0,3] bounds
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
