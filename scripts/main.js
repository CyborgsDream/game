// Game version: 009
import { hash, computeHeight, getColor, shadeColor } from './utils.mjs';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const debugEl = document.getElementById('debug');
let showDebug = true;
debugEl.style.display = 'block';

// --- Engine Parameters ---
const tileSize = 32;
const tilesInView = 36;
// Perspective parameters
let fieldOfView = Math.PI / 2.4; // ~75° vertical FOV
let focal = (canvas.height / 2) / Math.tan(fieldOfView / 2);
// Derived horizontal FOV for culling
let horizontalFOV = 2 * Math.atan(Math.tan(fieldOfView / 2) * canvas.width / canvas.height);
let cosHalfHFOV = Math.cos(horizontalFOV / 2);
// Scale factor to exaggerate depth and make far tiles smaller
// Higher values create a stronger sense of perspective
const perspectiveScale = 30;

// --- Terrain Height Functions ---
// Implemented in utils.mjs

// Per-frame height cache
let heightCache = {};
function getHeight(x, y) {
  const key = x + ',' + y;
  if (heightCache[key] !== undefined) return heightCache[key];
  const h = computeHeight(x, y);
  heightCache[key] = h;
  return h;
}



// --- Camera State ---
let camera = {
  x: 0, y: 0, altitude: 7.5,
  speed: 0.14,
  yaw: Math.PI / 4,       // where the camera looks
  flyYaw: Math.PI / 4,    // direction of forward movement
  pitch: Math.PI / 7
};
let sinYaw = Math.sin(camera.yaw), cosYaw = Math.cos(camera.yaw);
let sinFlyYaw = Math.sin(camera.flyYaw), cosFlyYaw = Math.cos(camera.flyYaw);
let sinPitch = Math.sin(camera.pitch), cosPitch = Math.cos(camera.pitch);
function updateOrientation() {
  sinYaw = Math.sin(camera.yaw);
  cosYaw = Math.cos(camera.yaw);
  sinFlyYaw = Math.sin(camera.flyYaw);
  cosFlyYaw = Math.cos(camera.flyYaw);
  sinPitch = Math.sin(camera.pitch);
  cosPitch = Math.cos(camera.pitch);
  horizontalFOV = 2 * Math.atan(Math.tan(fieldOfView / 2) * canvas.width / canvas.height);
  cosHalfHFOV = Math.cos(horizontalFOV / 2);
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
  // Amplify depth by perspectiveScale for a stronger perspective effect
  let denom = localZ * perspectiveScale + focal;
  if (denom <= 1) return null; // Behind camera
  let screenX = (px * tileSize * focal) / denom;
  let screenY = -(localY * tileSize * focal) / denom;

  return [screenX, screenY, denom];
}

// --- Camera Update ---
function updateCamera() {
  // Always move forward in the direction of flight
  camera.x += sinFlyYaw * camera.speed;
  camera.y += cosFlyYaw * camera.speed;
}

function updateDebugInfo() {
  if (!showDebug) return;
  debugEl.textContent =
    `x:${camera.x.toFixed(2)} y:${camera.y.toFixed(2)} ` +
    `yaw:${(camera.yaw * 180 / Math.PI).toFixed(1)} ` +
    `pitch:${(camera.pitch * 180 / Math.PI).toFixed(1)} ` +
    `fov:${(fieldOfView * 180 / Math.PI).toFixed(1)}`;
}

// --- Visibility Culling ---
function isTileVisible(x, y) {
  const centerX = x + 0.5;
  const centerY = y + 0.5;
  const dx = centerX - camera.x;
  const dy = centerY - camera.y;
  const distSq = dx * dx + dy * dy;
  if (distSq === 0) return true;
  const dot = (dx * cosYaw + dy * sinYaw) / Math.sqrt(distSq);
  if (dot < cosHalfHFOV) return false;
  const proj = project3D(centerX, centerY, camera.altitude);
  if (!proj) return false;
  const [sx, sy] = proj;
  return !(sx < -canvas.width || sx > canvas.width || sy < -canvas.height || sy > canvas.height);
}

// --- Terrain Drawing ---
function computeTileData(x, y) {
  const hNW = getHeight(x, y);
  const hNE = getHeight(x + 1, y);
  const hSE = getHeight(x + 1, y + 1);
  const hSW = getHeight(x, y + 1);

  const nw = project3D(x, y, hNW);
  const ne = project3D(x + 1, y, hNE);
  const se = project3D(x + 1, y + 1, hSE);
  const sw = project3D(x, y + 1, hSW);

  if (!nw || !ne || !se || !sw) return null;

  const minDenom = 1;
  if (nw[2] < minDenom || ne[2] < minDenom || se[2] < minDenom || sw[2] < minDenom) return null;

  const pts = [nw, ne, se, sw];
  const xs = pts.map(p => p[0]);
  const ys = pts.map(p => p[1]);
  const bounds = {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  };

  const slopeY = ((hNE + hSE) - (hNW + hSW)) / 2;
  const shade = Math.max(0.7, 1.1 - slopeY * 0.12);
  const color = shadeColor(getColor(x, y), shade);

  return {pts, bounds, color};
}

function drawTile(ctx, tile) {
  ctx.fillStyle = tile.color;
  ctx.beginPath();
  ctx.moveTo(tile.pts[0][0], tile.pts[0][1]);
  ctx.lineTo(tile.pts[1][0], tile.pts[1][1]);
  ctx.lineTo(tile.pts[2][0], tile.pts[2][1]);
  ctx.lineTo(tile.pts[3][0], tile.pts[3][1]);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#111a";
  ctx.stroke();
}

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
      if (!isTileVisible(wx, wy)) continue;
      let depth = (wx - cx) * cosYaw + (wy - cy) * sinYaw;
      drawList.push({x: wx, y: wy, depth});
    }
  }
  drawList.sort((a, b) => b.depth - a.depth);

  const padL = 400, padR = 400, padT = 1200, padB = 1600;
  const minX = -padL, maxX = canvas.width + padR;
  const minY = -padT, maxY = canvas.height + padB;

  for (let tileInfo of drawList) {
    const data = computeTileData(tileInfo.x, tileInfo.y);
    if (!data) continue;
    const {bounds} = data;
    if (bounds.maxX < minX || bounds.minX > maxX || bounds.maxY < minY || bounds.minY > maxY) continue;
    drawTile(ctx, data);
  }
  ctx.restore();
}


// --- Keyboard Controls ---
let keyState = {};
document.addEventListener('keydown', e => {
  keyState[e.code] = true;
  if (e.code === 'KeyD') {
    showDebug = !showDebug;
    debugEl.style.display = showDebug ? 'block' : 'none';
  }
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Equal', 'Minus'].includes(e.code)) {
    e.preventDefault();
  }
});
document.addEventListener('keyup', e => {
  keyState[e.code] = false;
});
window.addEventListener('blur', () => {
  keyState = {};
});

function handleCameraInput() {
  // Left/right: rotate flying direction (and camera view)
  if (keyState['ArrowLeft'])  {
    camera.yaw -= 0.02;
    camera.flyYaw -= 0.02;
  }
  if (keyState['ArrowRight']) {
    camera.yaw += 0.02;
    camera.flyYaw += 0.02;
  }
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
  updateDebugInfo();
  requestAnimationFrame(loop);
}

// Start the render loop after the DOM has finished loading
window.addEventListener('load', loop);
