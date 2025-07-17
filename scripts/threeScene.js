import { computeHeight } from './utils.mjs';

let scene, camera, renderer, wallGrids, verticalLines;
let terrainMesh;
let orientationBuffer = [];

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 15, 25);

  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('sceneCanvas'), antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  scene.add(new THREE.AmbientLight(0x404040));
  const light = new THREE.PointLight(0xffffff, 1, 100);
  light.position.set(0, 20, 0);
  scene.add(light);

  const floorSize = 50;
  const floorDiv = 50;
  const floorMat = new THREE.LineBasicMaterial({ color: 0x00ffff, opacity: 0.4, transparent: true });
  const floorGrid = new THREE.GridHelper(floorSize, floorDiv, 0x00ffff, 0x008888);
  floorGrid.material = floorMat;
  scene.add(floorGrid);

  wallGrids = new THREE.Group();
  const wallSize = 50;
  const wallDiv = 50;
  const wallMat = new THREE.LineBasicMaterial({ color: 0x00ffff, opacity: 0.2, transparent: true });
  const front = new THREE.GridHelper(wallSize, wallDiv, 0x00ffff, 0x008888); front.rotation.x = Math.PI / 2; front.position.z = -wallSize / 2; front.position.y = wallSize / 2; front.material = wallMat.clone(); wallGrids.add(front);
  const back = new THREE.GridHelper(wallSize, wallDiv, 0x00ffff, 0x008888); back.rotation.x = Math.PI / 2; back.position.z = wallSize / 2; back.position.y = wallSize / 2; back.material = wallMat.clone(); wallGrids.add(back);
  const left = new THREE.GridHelper(wallSize, wallDiv, 0x00ffff, 0x008888); left.rotation.z = Math.PI / 2; left.position.x = -wallSize / 2; left.position.y = wallSize / 2; left.material = wallMat.clone(); wallGrids.add(left);
  const right = new THREE.GridHelper(wallSize, wallDiv, 0x00ffff, 0x008888); right.rotation.z = Math.PI / 2; right.position.x = wallSize / 2; right.position.y = wallSize / 2; right.material = wallMat.clone(); wallGrids.add(right);
  const ceiling = new THREE.GridHelper(floorSize, floorDiv, 0x00ffff, 0x008888); ceiling.position.y = wallSize; ceiling.material = floorMat.clone(); ceiling.material.opacity = 0.2; wallGrids.add(ceiling);
  scene.add(wallGrids);

  createVerticalLines();
  createTerrain();
  loadOpenStreetMap();
  window.addEventListener('resize', onResize);
}

function createVerticalLines() {
  const gridSize = 40, gridExtent = 25, height = gridSize * 10;
  const vertices = [];
  for (let x = -gridExtent; x <= gridExtent; x += 2) {
    for (let z = -gridExtent; z <= gridExtent; z += 2) {
      vertices.push(x * gridSize, 0, z * gridSize);
      vertices.push(x * gridSize, -height, z * gridSize);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0xff00ff, opacity: 0.6, transparent: true });
  verticalLines = new THREE.LineSegments(geo, mat);
  scene.add(verticalLines);
}

function createTerrain() {
  const size = 50;
  const segments = 100;
  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);
  const pos = geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = computeHeight(x / 4, z / 4); // scale down to match util range
    pos.setY(i, h);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  const material = new THREE.MeshLambertMaterial({ color: 0x228833, side: THREE.DoubleSide });
  terrainMesh = new THREE.Mesh(geometry, material);
  terrainMesh.position.y = 0; // sits on floor
  scene.add(terrainMesh);
}

function loadOpenStreetMap() {
  const center = { lat: 52.3676, lon: 4.9041 };
  const bbox = [52.366, 4.902, 52.369, 4.907];
  const query = `[out:json];(way["highway"](${bbox.join(',')});way["building"](${bbox.join(',')}));out geom;`;
  const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);
  fetch(url)
    .then(r => r.json())
    .then(data => drawOSM(data, center))
    .catch(e => console.error('OSM load', e));
}

function drawOSM(data, center) {
  if (!data || !data.elements) return;
  const R = 6378137;
  const deg = Math.PI / 180;
  const lat0 = center.lat * deg;
  const toXZ = (lat, lon) => {
    const x = (lon - center.lon) * deg * Math.cos(lat0) * R * 0.001;
    const z = (lat - center.lat) * deg * R * 0.001;
    return [x, -z];
  };
  const roadMat = new THREE.LineBasicMaterial({ color: 0xffff00 });
  const buildMat = new THREE.LineBasicMaterial({ color: 0xff0000 });
  data.elements.forEach(el => {
    if (!el.geometry) return;
    const pts = el.geometry.map(g => { const [vx, vz] = toXZ(g.lat, g.lon); return new THREE.Vector3(vx, 0.1, vz); });
    if (el.tags && el.tags.highway) {
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, roadMat);
      scene.add(line);
    } else if (el.tags && el.tags.building) {
      if (!pts[0].equals(pts[pts.length - 1])) pts.push(pts[0].clone());
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, buildMat);
      scene.add(line);
    }
  });
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function handleOrientation(e) {
  const raw = { alpha: e.alpha || 0, beta: e.beta || 0, gamma: e.gamma || 0 };
  orientationBuffer.push(raw);
  if (orientationBuffer.length > 5) orientationBuffer.shift();
  let totalW = 0, smoothed = { alpha: 0, beta: 0, gamma: 0 };
  for (let i = 0; i < orientationBuffer.length; i++) {
    const w = (i + 1) / orientationBuffer.length; totalW += w;
    smoothed.alpha += orientationBuffer[i].alpha * w;
    smoothed.beta += orientationBuffer[i].beta * w;
    smoothed.gamma += orientationBuffer[i].gamma * w;
  }
  smoothed.alpha /= totalW; smoothed.beta /= totalW; smoothed.gamma /= totalW;
  const r = Math.PI / 180;
  const alpha = smoothed.alpha * r;
  const beta = smoothed.beta * r;
  const gamma = smoothed.gamma * r;
  const euler = new THREE.Euler();
  euler.set(beta, gamma, -alpha, 'YXZ');
  camera.quaternion.setFromEuler(euler);
}

function requestPermission() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(state => {
      if (state === 'granted') {
        window.addEventListener('deviceorientation', handleOrientation);
        document.getElementById('permissionBtn').style.display = 'none';
      }
    }).catch(console.error);
  }
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

window.addEventListener('load', () => {
  initScene();
  animate();
  const btn = document.getElementById('permissionBtn');
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    btn.style.display = 'block';
    btn.addEventListener('click', requestPermission);
  } else {
    window.addEventListener('deviceorientation', handleOrientation);
  }
});
