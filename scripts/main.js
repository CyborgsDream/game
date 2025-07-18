// Game version: 022 - yes1 huge leap
import { hash, computeHeight, getColor, shadeColor, resetColorMap } from './utils.mjs';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const debugEl = document.getElementById('debug');

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  focal = (canvas.height / 2) / Math.tan(fieldOfView / 2);
  updateOrientation();
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', resizeCanvas);
let showDebug = true;
debugEl.style.display = 'block';

// --- Engine Parameters ---
const tileSize = 32;
const tilesInView = 96; // increase draw distance to avoid tiles popping
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
  // Camera starts high above the ground and continuously moves forward
  x: 0, y: 0, altitude: 7.5,
  speed: 0.14,
  yaw: Math.PI / 4,       // where the camera looks
  flyYaw: Math.PI / 4,    // direction of forward movement
  pitch: Math.PI / 7,
  roll: 0                 // new: rotation around the viewing axis
};
let sinYaw = Math.sin(camera.yaw), cosYaw = Math.cos(camera.yaw);
let sinFlyYaw = Math.sin(camera.flyYaw), cosFlyYaw = Math.cos(camera.flyYaw);
let sinPitch = Math.sin(camera.pitch), cosPitch = Math.cos(camera.pitch);
let sinRoll = Math.sin(camera.roll), cosRoll = Math.cos(camera.roll);

// Device orientation tuning
const orientationFactor = 0.7;   // reduce sensitivity
const smoothingFactor = 0.2;      // simple low-pass filter
let smoothedYaw = camera.yaw;
let smoothedPitch = camera.pitch;
let smoothedRoll = camera.roll;
function updateOrientation() {
  sinYaw = Math.sin(camera.yaw);
  cosYaw = Math.cos(camera.yaw);
  sinFlyYaw = Math.sin(camera.flyYaw);
  cosFlyYaw = Math.cos(camera.flyYaw);
  sinPitch = Math.sin(camera.pitch);
  cosPitch = Math.cos(camera.pitch);
  sinRoll = Math.sin(camera.roll);
  cosRoll = Math.cos(camera.roll);
  horizontalFOV = 2 * Math.atan(Math.tan(fieldOfView / 2) * canvas.width / canvas.height);
  cosHalfHFOV = Math.cos(horizontalFOV / 2);
}
const minPitch = 0; // allow looking straight ahead
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
  // Align motion with the view direction so the camera
  // travels toward where it is looking.
  camera.x += cosFlyYaw * camera.speed;
  camera.y += sinFlyYaw * camera.speed;
}

function updateDebugInfo() {
  if (!showDebug) return;
  debugEl.textContent =
    `x:${camera.x.toFixed(2)} y:${camera.y.toFixed(2)} ` +
    `yaw:${(camera.yaw * 180 / Math.PI).toFixed(1)} ` +
    `pitch:${(camera.pitch * 180 / Math.PI).toFixed(1)} ` +
    `roll:${(camera.roll * 180 / Math.PI).toFixed(1)} ` +
    `fov:${(fieldOfView * 180 / Math.PI).toFixed(1)}`;
}

// --- Visibility Culling ---
function isTileVisible(x, y) {
  const centerX = x + 0.5;
  const centerY = y + 0.5;
  const centerH = computeHeight(centerX, centerY);
  const dx = centerX - camera.x;
  const dy = centerY - camera.y;
  const distSq = dx * dx + dy * dy;
  if (distSq === 0) return true;
  const dot = (dx * cosYaw + dy * sinYaw) / Math.sqrt(distSq);
  if (dot < cosHalfHFOV) return false;
  const proj = project3D(centerX, centerY, centerH);
  if (!proj) return false;
  let [sx, sy] = proj;
  sx += canvas.width / 2;
  sy += getVerticalOffset();
  const margin = 64;
  return !(sx < -margin || sx > canvas.width + margin || sy < -margin || sy > canvas.height + margin);
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

  const minDenom = 0;
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

  // Use a simple two-tone color scheme so each tile is split into
  // two triangles with slightly different shades.
  const base = getColor(x, y);
  return {
    pts,
    bounds,
    color1: shadeColor(base, 1.0),
    color2: shadeColor(base, 0.85)
  };
}

function drawTile(ctx, tile) {
  const [nw, ne, se, sw] = tile.pts;
  // First triangle NW-NE-SE
  ctx.fillStyle = tile.color1;
  ctx.beginPath();
  ctx.moveTo(nw[0], nw[1]);
  ctx.lineTo(ne[0], ne[1]);
  ctx.lineTo(se[0], se[1]);
  ctx.closePath();
  ctx.fill();
  // Second triangle SE-SW-NW
  ctx.fillStyle = tile.color2;
  ctx.beginPath();
  ctx.moveTo(se[0], se[1]);
  ctx.lineTo(sw[0], sw[1]);
  ctx.lineTo(nw[0], nw[1]);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#111a";
  ctx.stroke();
}

function drawSky(ctx) {
  const horizon = getVerticalOffset();
  ctx.save();
  ctx.translate(canvas.width / 2, horizon);
  ctx.rotate(camera.roll);
  ctx.translate(-canvas.width / 2, -horizon);
  const grad = ctx.createLinearGradient(0, 0, 0, horizon);
  // Give the sky a blue gradient that differs from the terrain colors
  grad.addColorStop(0, '#003c80');
  grad.addColorStop(1, '#87ceeb');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, horizon);
  ctx.restore();
}

function getVerticalOffset() {
  // Keep the horizon low enough that the camera appears above the terrain.
  // When tilting down, shift it slightly higher to maintain perspective.
  // Slightly raise the horizon so the scene appears
  // more centered on screen and the camera feels higher.
  const start = 0.68; // looking almost straight ahead
  const end = 0.45;   // looking straight down
  const t = Math.min(1, Math.max(0, (camera.pitch - minPitch) / (maxPitch - minPitch)));
  return canvas.height * (start - (start - end) * t);
}

function drawSlopedTerrain(ctx) {
  ctx.save();
  ctx.translate(canvas.width / 2, getVerticalOffset());
  ctx.rotate(camera.roll);

  let cx = camera.x, cy = camera.y;
  heightCache = {};
  resetColorMap();
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
  const offsetX = canvas.width / 2;
  const offsetY = getVerticalOffset();
  const minX = -offsetX - padL;
  const maxX = canvas.width - offsetX + padR;
  const minY = -offsetY - padT;
  const maxY = canvas.height - offsetY + padB;

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

// Mobile device orientation handling with calibration
if (window.DeviceOrientationEvent) {
  let baseAlpha = null;
  let lastAlpha = null;
  const calibrateBtn = document.getElementById('calibrateBtn');
  if (calibrateBtn) {
    calibrateBtn.addEventListener('click', () => {
      if (lastAlpha !== null) {
        baseAlpha = lastAlpha;
      }
    });
  }

  window.addEventListener('deviceorientation', (e) => {
    if (e.alpha !== null) {
      lastAlpha = e.alpha;
      if (baseAlpha === null) {
        baseAlpha = e.alpha;
      }
      const diff = ((e.alpha - baseAlpha + 540) % 360) - 180;
      const yawRad = diff * Math.PI / 180 * orientationFactor;
      smoothedYaw = smoothedYaw * (1 - smoothingFactor) + yawRad * smoothingFactor;
      camera.yaw = smoothedYaw;
      camera.flyYaw = smoothedYaw;
    }
    if (e.beta !== null) {
      // On most devices beta is 0° when the phone is vertical and 90° when
      // it is laid flat. Use beta directly so a vertical phone looks straight
      // ahead and tilting it down increases the pitch angle.
      const pitchRad = e.beta * Math.PI / 180 * orientationFactor;
      smoothedPitch = smoothedPitch * (1 - smoothingFactor) + pitchRad * smoothingFactor;
      camera.pitch = Math.min(maxPitch, Math.max(minPitch, smoothedPitch));
    }
    if (e.gamma !== null) {
      const rollRad = e.gamma * Math.PI / 180 * orientationFactor;
      smoothedRoll = smoothedRoll * (1 - smoothingFactor) + rollRad * smoothingFactor;
      camera.roll = smoothedRoll;
    }
    updateOrientation();
  });
}

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
  drawSky(ctx);
  drawSlopedTerrain(ctx);
  updateDebugInfo();
  requestAnimationFrame(loop);
}

// Start the render loop after the DOM has finished loading
window.addEventListener('load', () => {
  resizeCanvas();
  loop();
});
