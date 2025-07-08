
window.onload = function() {
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Engine Parameters ---
const tileSize = 32;
const tilesInView = 36;
let focal = 750; // Perspective strength

// --- Terrain Height Functions ---
function hash(x, y) {
  return Math.abs(Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1;
}
function getHeight(x, y) {
  return Math.floor(
    2.2 +
    2 * Math.sin(x * 0.25 + y * 0.17) +
    1.5 * Math.cos(x * 0.19 - y * 0.23) +
    0.8 * hash(x, y)
  );
}

// --- Camera State ---
let camera = {
  x: 0, y: 0, altitude: 6.5,
  speed: 0.14,
  yaw: Math.PI / 4, targetYaw: Math.PI / 4,
  moveYaw: Math.PI / 4, targetMoveYaw: Math.PI / 4,
  pitch: Math.PI / 7, targetPitch: Math.PI / 7 // 25°
};
const minPitch = Math.PI / 15;
const maxPitch = Math.PI / 2.1;

// --- 3D Projection ---
function project3D(x, y, h) {
  let dx = x - camera.x;
  let dy = y - camera.y;
  let dz = h - camera.altitude;

  // Rotate around Z (yaw)
  let px = dx * Math.cos(camera.yaw) - dy * Math.sin(camera.yaw);
  let py = dx * Math.sin(camera.yaw) + dy * Math.cos(camera.yaw);

  // Apply pitch
  let localY = py * Math.cos(camera.pitch) - dz * Math.sin(camera.pitch);
  let localZ = py * Math.sin(camera.pitch) + dz * Math.cos(camera.pitch);

  // Perspective
  let denom = (localZ + focal);
  if (denom <= 1) return null; // Behind camera
  let screenX = (px * tileSize * focal) / denom;
  let screenY = (localY * tileSize * focal) / denom;

  return [screenX, screenY, denom];
}

// --- Camera Update ---
function updateCamera() {
  camera.yaw += (camera.targetYaw - camera.yaw) * 0.07;
  camera.moveYaw += (camera.targetMoveYaw - camera.moveYaw) * 0.07;
  camera.pitch += (camera.targetPitch - camera.pitch) * 0.09;
  camera.x -= Math.cos(camera.moveYaw) * camera.speed;
  camera.y -= Math.sin(camera.moveYaw) * camera.speed;
}

// --- Terrain Drawing ---
function drawSlopedTerrain(ctx) {
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height * 0.78);

  let cx = camera.x, cy = camera.y;
  let windowRadius = tilesInView / 2 + 5;

  let drawList = [];
  for (let dy = -windowRadius; dy < windowRadius; dy++) {
    for (let dx = -windowRadius; dx < windowRadius; dx++) {
      let wx = Math.floor(cx + dx);
      let wy = Math.floor(cy + dy);
      let depth = (wx - cx) * Math.cos(camera.yaw) + (wy - cy) * Math.sin(camera.yaw);
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

    if (!nw || !ne || !se || !sw) continue;

    const [nwX, nwY] = nw;
    const [neX, neY] = ne;
    const [seX, seY] = se;
    const [swX, swY] = sw;

    if ([nwX, neX, seX, swX].every(px => px < minX || px > maxX)) continue;
    if ([nwY, neY, seY, swY].every(py => py < minY || py > maxY)) continue;

    let avgH = (hNW + hNE + hSE + hSW) / 4;
    let slopeY = ((hNE + hSE) - (hNW + hSW)) / 2;
    let shade = Math.max(0.7, 1.1 - slopeY * 0.12);
    let baseColors = ["#aad","#6b8","#386","#2c4"];
    let col = baseColors[Math.floor(avgH)] || "#222";
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

// --- Keyboard Controls ---
let keyState = {};
document.addEventListener('keydown', e => { keyState[e.code] = true; });
document.addEventListener('keyup', e => { keyState[e.code] = false; });

function handleCameraInput() {
  if (keyState['ArrowLeft'])  camera.targetYaw -= 0.02;
  if (keyState['ArrowRight']) camera.targetYaw += 0.02;
  if (keyState['KeyA']) camera.targetMoveYaw -= 0.02;
  if (keyState['KeyD']) camera.targetMoveYaw += 0.02;
  if (keyState['ArrowUp'])    camera.targetPitch = Math.min(camera.targetPitch + 0.012, maxPitch);
  if (keyState['ArrowDown'])  camera.targetPitch = Math.max(camera.targetPitch - 0.012, minPitch);
  if (keyState['KeyW']) camera.targetPitch = Math.min(camera.targetPitch + 0.012, maxPitch);
  if (keyState['KeyS']) camera.targetPitch = Math.max(camera.targetPitch - 0.012, minPitch);
  if (keyState['Equal'] || keyState['NumpadAdd']) focal = Math.min(focal + 40, 1600);
  if (keyState['Minus'] || keyState['NumpadSubtract']) focal = Math.max(focal - 40, 200);
}

// --- Main Loop ---
function loop() {
  handleCameraInput();
  updateCamera();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawSlopedTerrain(ctx);
  requestAnimationFrame(loop);
}
loop();
};