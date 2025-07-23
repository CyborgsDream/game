export function hash(x, y) {
  return Math.abs(Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1;
}

export function computeHeight(x, y) {
  const tileX = Math.floor(x);
  const tileY = Math.floor(y);
  const fx = x - tileX;
  const fy = y - tileY;
  function corner(tx, ty) {
    return Math.round(hash(tx * 0.13, ty * 0.27) * 20 - 10);
  }
  const h00 = corner(tileX, tileY);
  const h10 = corner(tileX + 1, tileY);
  const h01 = corner(tileX, tileY + 1);
  const h11 = corner(tileX + 1, tileY + 1);
  const h0 = h00 * (1 - fx) + h10 * fx;
  const h1 = h01 * (1 - fx) + h11 * fx;
  return h0 * (1 - fy) + h1 * fy;
}

let colorMap = {};
export function resetColorMap() {
  colorMap = {};
}

export function getColor(x, y) {
  const key = x + ',' + y;
  if (colorMap[key]) return colorMap[key];
  const typeVal = hash(x + 1.5, y - 2.7);
  let color;
  if (typeVal < 0.1) {
    color = '#42aaff'; // water
  } else if (typeVal < 0.2) {
    color = '#c94';    // path
  } else {
    color = '#2c4';    // grass
  }
  colorMap[key] = color;
  return color;
}

export function shadeColor(hex, percent) {
  let num = parseInt(hex.replace('#',''),16);
  let r = Math.min(255, Math.floor(((num >> 16) & 0xFF) * percent));
  let g = Math.min(255, Math.floor(((num >> 8) & 0xFF) * percent));
  let b = Math.min(255, Math.floor((num & 0xFF) * percent));
  return `rgb(${r},${g},${b})`;
}
