// Game version: 007

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Engine Parameters ---
const tileSize = 32;
const tilesInView = 36;
// Perspective parameters
let fieldOfView = Math.PI / 2.4; // ~75° vertical FOV
let focal = (canvas.height / 2) / Math.tan(fieldOfView / 2);

// --- Terrain Height Functions ---
function hash(x, y) {
  return Math.abs(Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1;
}

// Raw height computation
function computeHeight(x, y) {
  return Math.floor(
    2.2 +
    2 * Math.sin(x * 0.25 + y * 0.17) +
    1.5 * Math.cos(x * 0.19 - y * 0.23) +
    0.8 * hash(x, y)
  );
}

// Per-frame height cache
let heightCache = {};
function getHeight(x, y) {
  const key = x + ',' + y;
  if (heightCache[key] !== undefined) return heightCache[key];
  const h = computeHeight(x, y);
  heightCache[key] = h;
  return h;
}

// Persistent color map
let colorMap = {};
function getColor(x, y) {
  const key = x + ',' + y;
  if (colorMap[key]) return colorMap[key];
  const palette = ["#aad", "#6b8", "#386", "#2c4", "#c94", "#7b5", "#a83"];
  const idx = Math.floor(hash(x + 1.5, y - 2.7) * palette.length);
  colorMap[key] = palette[idx];
  return colorMap[key];
}

// --- Camera State ---
let camera = {
  x: 0, y: 0, altitude: 6.5,
  speed: 0.14,
  yaw: Math.PI / 4, targetYaw: Math.PI / 4, // view & flight direction
  pitch: Math.PI / 7, targetPitch: Math.PI / 7 // 25°
};
let sinYaw = Math.sin(camera.yaw), cosYaw = Math.cos(camera.yaw);
let sinPitch = Math.sin(camera.pitch), cosPitch = Math.cos(camera.pitch);
function updateOrientation() {
  sinYaw = Math.sin(camera.yaw);
  cosYaw = Math.cos(camera.yaw);
  sinPitch = Math.sin(camera.pitch);
  cosPitch = Math.cos(camera.pitch);
}
const minPitch = Math.PI / 15;
const maxPitch = Math.PI / 2.1;

// --- 3D Projection ---
function project3D(x, y, h) {
  let dx = x - camera.x;
  let dy = y - camera.y;
  let dz = h - camera.altitude;

  // Rotate around Z (yaw)
  let px = dx * cosYaw - dy * sinYaw;
  let py = dx * sinYaw + dy * cosYaw;

  // Apply pitch
  let localY = py * cosPitch - dz * sinPitch;
  let localZ = py * sinPitch + dz * cosPitch;

  // Perspective
  let denom = localZ;
  if (denom <= 1) return null; // Behind camera
  let screenX = (px * tileSize * focal) / denom;
  let screenY = (localY * tileSize * focal) / denom;

  return [screenX, screenY, denom];
}

// --- Camera Update ---
function updateCamera() {
  // Always move forward in the direction of view
  camera.x -= cosYaw * camera.speed;
  camera.y -= sinYaw * camera.speed;
}

// --- Terrain Drawing ---
function drawSlopedTerrain(ctx) {
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height * 0.78);

  let cx = camera.x, cy = camera.y;
  heightCache = {};
  let windowRadius = tilesInView / 2 + 5;

  let drawList = [];
  for (let dy = -windowRadius; dy < windowRadius; dy++) {
    for (let dx = -windowRadius; dx < windowRadius; dx++) {
      let wx = Math.floor(cx + dx);
      let wy = Math.floor(cy + dy);
      let depth = (wx - cx) * cosYaw + (wy - cy) * sinYaw;
      drawList.push({x: wx, y: wy, depth});
    }
  }
  drawList.sort((a, b) => b.depth - a.depth);

  // Culling boundaries
  const padL = 400, padR = 400, padT = 1200, padB = 1600;
  const minX = -padL, maxX = canvas.width + padR;
  const minY = -padT, maxY = canvas.height + padB;

  for (let tile of drawList) {
    const {x, y} = tile;
    const hNW = getHeight(x, y);
    const hNE = getHeight(x + 1, y);
    const hSE = getHeight(x + 1, y + 1);
    const hSW = getHeight(x, y + 1);

    const nw = project3D(x, y, hNW);
    const ne = project3D(x + 1, y, hNE);
    const se = project3D(x + 1, y + 1, hSE);
    const sw = project3D(x, y + 1, hSW);

    // Cull if any point is behind camera (null)
    if (!nw || !ne || !se || !sw) continue;

    // Cull if any corner is too close to the camera (prevents overlay artifacts)
    const minDenom = 1;
    if (nw[2] < minDenom || ne[2] < minDenom || se[2] < minDenom || sw[2] < minDenom) continue;

    const [nwX, nwY] = nw;
    const [neX, neY] = ne;
    const [seX, seY] = se;
    const [swX, swY] = sw;

    if ([nwX, neX, seX, swX].every(px => px < minX || px > maxX)) continue;
    if ([nwY, neY, seY, swY].every(py => py < minY || py > maxY)) continue;

    let avgH = (hNW + hNE + hSE + hSW) / 4;
    let slopeY = ((hNE + hSE) - (hNW + hSW)) / 2;
    let shade = Math.max(0.7, 1.1 - slopeY * 0.12);
    let col = getColor(x, y);
    ctx.fillStyle = shadeColor(col, shade);

    ctx.beginPath();
    ctx.moveTo(nwX, nwY);
    ctx.lineTo(neX, neY);
    ctx.lineTo(seX, seY);
    ctx.lineTo(swX, swY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#111a";
    ctx.stroke();
  }
  ctx.restore();
}

// --- Color Shading ---
function shadeColor(hex, percent) {
  let num = parseInt(hex.replace('#',''),16);
  let r = Math.min(255, Math.floor(((num >> 16) & 0xFF) * percent));
  let g = Math.min(255, Math.floor(((num >> 8) & 0xFF) * percent));
  let b = Math.min(255, Math.floor((num & 0xFF) * percent));
  return `rgb(${r},${g},${b})`;
}

// --- UI Overlay ---
const uiElem = document.getElementById('ui');
let uiVisible = true;

function toggleUI() {
  uiVisible = !uiVisible;
  uiElem.style.display = uiVisible ? 'block' : 'none';
}

function updateUI() {
  if (!uiVisible) return;
  uiElem.textContent =
    `Alt: ${camera.altitude.toFixed(1)} ` +
    `Yaw: ${(camera.yaw * 180/Math.PI).toFixed(0)}\u00B0 ` +
    `Pitch: ${(camera.pitch * 180/Math.PI).toFixed(0)}\u00B0 ` +
    `FOV: ${(fieldOfView * 180/Math.PI).toFixed(0)}\u00B0\n` +
    'Controls: \u2190/\u2192 rotate, \u2191/\u2193 tilt, +/- FOV, H toggle HUD';
}

// --- Keyboard Controls ---
let keyState = {};
document.addEventListener('keydown', e => {
  keyState[e.code] = true;
  if (e.code === 'KeyH') toggleUI();
});
document.addEventListener('keyup', e => { keyState[e.code] = false; });

function handleCameraInput() {
  // Left/right: rotate flying direction (and camera view)
  if (keyState['ArrowLeft'])  camera.yaw += 0.02;
  if (keyState['ArrowRight']) camera.yaw -= 0.02;
  // Up/down: tilt camera (pitch)
  if (keyState['ArrowUp'])   camera.pitch = Math.max(camera.pitch - 0.012, minPitch);
  if (keyState['ArrowDown']) camera.pitch = Math.min(camera.pitch + 0.012, maxPitch);
  // +/-: change FOV (only main keyboard)
  if (keyState['Equal']) fieldOfView = Math.min(fieldOfView + 0.02, Math.PI - 0.2);
  if (keyState['Minus']) fieldOfView = Math.max(fieldOfView - 0.02, Math.PI / 6);
  focal = (canvas.height / 2) / Math.tan(fieldOfView / 2);
  updateOrientation();
}

// --- Main Loop ---
function loop() {
  handleCameraInput();
  updateCamera();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawSlopedTerrain(ctx);
  updateUI();
  requestAnimationFrame(loop);
}

// Start the render loop after the DOM has finished loading
window.addEventListener('load', () => { updateUI(); loop(); });
