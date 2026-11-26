import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// The existing same-origin worker runs OCCT in millimetres and transfers its indexed meshes.
// meshIndex and faceIndex refer to OCCT's original arrays. Neither is a Three.js object ID.
function create(container, { onPick, onUnavailable } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf3f5f7);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-label', 'STEP 三维模型，可拖动旋转、滚轮缩放');
  container.replaceChildren(canvas);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 10000);
  camera.up.set(0, 0, 1);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.screenSpacePanning = true;
  const group = new THREE.Group();
  scene.add(group, new THREE.HemisphereLight(0xffffff, 0xbbc0c6, 1.65));
  for (const [x, y, z, intensity] of [[3, -4, 6, 2.25], [-3, 3, 2, 1.15]]) {
    const light = new THREE.DirectionalLight(0xffffff, intensity);
    light.position.set(x, y, z);
    scene.add(light);
  }
  const materials = [0xafb6bd, 0x3c9d7b, 0xf2a331].map(color => new THREE.MeshStandardMaterial({
    color, roughness: 0.76, metalness: 0.08, side: THREE.DoubleSide
  }));
  const parts = new Map();
  const ray = new THREE.Raycaster();
  let task = null, disposed = false, spans = null, selection = null, annotations = [], drag = null;
  let pointerMode = 'rotate';
  function render() {
    if (!disposed) renderer.render(scene, camera);
  }
  controls.addEventListener('change', render);
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h || disposed) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    render();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  function clear() {
    for (const { mesh } of parts.values()) mesh.geometry.dispose();
    group.clear();
    group.position.set(0, 0, 0);
    parts.clear();
    spans = null;
    selection = null;
    annotations = [];
  }
  function fit() {
    if (!spans) return;
    const radius = Math.max(spans.length() / 2, 0.001);
    const back = new THREE.Vector3(1.2, -1.6, 1.1).normalize();
    const right = new THREE.Vector3().crossVectors(camera.up, back).normalize();
    const up = new THREE.Vector3().crossVectors(back, right);
    const slopeY = 0.78 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const slopeX = slopeY * camera.aspect;
    let left = Infinity, bottom = Infinity, top = -Infinity, rightmost = -Infinity, nearest = -Infinity;
    const vertex = new THREE.Vector3();
    // Accumulate the bounds against the four perspective frustum planes. Using mesh vertices
    // also fits a thin bar mounted diagonally inside its much larger axis-aligned bounding box.
    for (const { mesh } of parts.values()) {
      const positions = mesh.geometry.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        vertex.fromBufferAttribute(positions, i).add(group.position);
        const x = vertex.dot(right), y = vertex.dot(up), z = vertex.dot(back);
        left = Math.min(left, x - slopeX * z);
        rightmost = Math.max(rightmost, x + slopeX * z);
        bottom = Math.min(bottom, y - slopeY * z);
        top = Math.max(top, y + slopeY * z);
        nearest = Math.max(nearest, z);
      }
    }
    const distance = Math.max((rightmost - left) / (2 * slopeX), (top - bottom) / (2 * slopeY), nearest + radius * 0.01);
    controls.minDistance = radius * 0.005;
    controls.maxDistance = Math.max(radius, distance) * 12;
    camera.near = radius / 10000;
    camera.far = controls.maxDistance + radius * 8;
    controls.target.copy(right).multiplyScalar((rightmost + left) / 2).addScaledVector(up, (top + bottom) / 2);
    camera.position.copy(controls.target).addScaledVector(back, distance);
    camera.updateProjectionMatrix();
    controls.update();
    render();
  }
  function build(meshes) {
    let triangles = 0, faceCount = 0;
    meshes.forEach((source, meshIndex) => {
      const positions = source.attributes?.position?.array;
      if (!positions?.length) return;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      if (source.index?.array) geometry.setIndex(new THREE.BufferAttribute(source.index.array, 1));
      if (source.attributes.normal?.array?.length === positions.length) {
        geometry.setAttribute('normal', new THREE.BufferAttribute(source.attributes.normal.array, 3));
      } else {
        geometry.computeVertexNormals();
      }
      const count = Math.floor((geometry.index?.count ?? geometry.attributes.position.count) / 3);
      if (!count) { geometry.dispose(); return; }
      // Some STEP files have empty or non-triangulated BRep faces. Keep original indices.
      const ranges = (source.brep_faces || []).map(({ first, last }, faceIndex) => ({ first, last, faceIndex }))
        .filter(r => Number.isInteger(r.first) && Number.isInteger(r.last) && r.first >= 0 && r.last >= r.first && r.last < count)
        .sort((a, b) => a.first - b.first);
      const mesh = new THREE.Mesh(geometry, materials);
      mesh.userData.meshIndex = meshIndex;
      geometry.addGroup(0, count * 3, 0);
      parts.set(meshIndex, { mesh, count, ranges, byFace: new Map(ranges.map(r => [r.faceIndex, r])) });
      group.add(mesh);
      triangles += count;
      faceCount += ranges.length;
    });
    const box = new THREE.Box3().setFromObject(group);
    if (box.isEmpty()) throw new Error('STEP 中没有可显示的实体。');
    spans = box.getSize(new THREE.Vector3());
    if (!Number.isFinite(spans.length()) || spans.length() === 0) throw new Error('模型尺寸无效，请重新导出 STEP。');
    group.position.copy(box.getCenter(new THREE.Vector3())).multiplyScalar(-1);
    group.updateMatrixWorld(true);
    resize();
    fit();
    return { dimensions: spans.toArray(), meshCount: parts.size, faceCount, triangleCount: triangles };
  }
  function cancelLoad() {
    if (!task) return;
    task.worker.terminate();
    task.reject(new DOMException('载入已取消', 'AbortError'));
    task = null;
  }
  async function load(bytes) {
    if (disposed) throw new DOMException('预览已关闭', 'AbortError');
    cancelLoad();
    clear();
    render();
    const buffer = bytes instanceof ArrayBuffer ? bytes : bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    return new Promise((resolve, reject) => {
      const worker = new Worker('/cad-worker.js');
      task = { worker, reject };
      function done(error, message) {
        if (task?.worker !== worker) return;
        worker.terminate();
        task = null;
        if (error) { reject(error); return; }
        try { resolve(build(message.meshes)); }
        catch (e) { clear(); render(); reject(e); }
      }
      worker.onmessage = ({ data }) => done(data.ok ? null : new Error(data.error || 'STEP 解析失败。'), data);
      worker.onerror = () => done(new Error('STEP 解析器加载失败，请检查 NAS 的 CAD 资源。'));
      worker.onmessageerror = () => done(new Error('无法读取 STEP 几何数据。'));
      // Ownership of this ArrayBuffer is transferred; callers can re-read their original File or Blob.
      try { worker.postMessage({ format: 'step', bytes: buffer }, [buffer]); }
      catch (e) { done(e); }
    });
  }
  function updateHighlights() {
    // Only highlighted spans need draw groups. Triangle indices and normals stay unchanged.
    const highlights = new Map();
    function add(face, material) {
      const range = parts.get(face?.meshIndex)?.byFace.get(face.faceIndex);
      if (!range) return;
      if (!highlights.has(face.meshIndex)) highlights.set(face.meshIndex, new Map());
      highlights.get(face.meshIndex).set(face.faceIndex, { ...range, material });
    }
    annotations.forEach(face => add(face, 1));
    if (selection) add(selection, 2);
    for (const [id, { mesh, count }] of parts) {
      const geometry = mesh.geometry;
      geometry.clearGroups();
      let cursor = 0;
      for (const range of [...(highlights.get(id)?.values() || [])].sort((a, b) => a.first - b.first)) {
        if (cursor < range.first) geometry.addGroup(cursor * 3, (range.first - cursor) * 3, 0);
        geometry.addGroup(range.first * 3, (range.last - range.first + 1) * 3, range.material);
        cursor = range.last + 1;
      }
      if (cursor < count) geometry.addGroup(cursor * 3, (count - cursor) * 3, 0);
    }
    render();
  }
  function selectFace(face, { focus = false } = {}) {
    const part = face && parts.get(face.meshIndex);
    selection = part?.byFace.has(face.faceIndex) ? face : null;
    if (focus && selection && Array.isArray(face.point) && face.point.length === 3 && face.point.every(Number.isFinite)) {
      const target = part.mesh.localToWorld(new THREE.Vector3(...face.point));
      camera.position.add(new THREE.Vector3().subVectors(target, controls.target));
      controls.target.copy(target);
      controls.update();
    }
    updateHighlights();
  }
  function faceAt(ranges, triangle) {
    let lo = 0, hi = ranges.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1, range = ranges[mid];
      if (triangle < range.first) hi = mid - 1;
      else if (triangle > range.last) lo = mid + 1;
      else return range.faceIndex;
    }
    return null;
  }
  function start(event) {
    drag = event.isPrimary && event.button === 0 && pointerMode === 'rotate' && !event.ctrlKey && !event.shiftKey && !event.metaKey
      ? { id: event.pointerId, x: event.clientX, y: event.clientY } : null;
  }
  function move(event) {
    if (drag?.id === event.pointerId && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 5) drag = null;
  }
  function finish(event) {
    move(event);
    const click = drag?.id === event.pointerId;
    drag = null;
    if (!click || !onPick || !spans) return;
    const rect = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2), camera);
    const [hit] = ray.intersectObjects(group.children, false);
    if (!hit) return;
    const meshIndex = hit.object.userData.meshIndex;
    const faceIndex = faceAt(parts.get(meshIndex).ranges, hit.faceIndex);
    if (faceIndex === null) { onUnavailable?.('这个三角面没有原始 BRep 面编号，无法标注。'); return; }
    const point = hit.object.worldToLocal(hit.point.clone()).toArray();
    const face = { meshIndex, faceIndex, point };
    selectFace(face);
    onPick(face);
  }
  function cancelDrag() { drag = null; }
  canvas.addEventListener('pointerdown', start);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', cancelDrag);
  return {
    load, fit, selectFace,
    setAnnotations(list) { annotations = Array.isArray(list) ? list : []; updateHighlights(); },
    setMode(mode) {
      pointerMode = mode === 'pan' ? 'pan' : 'rotate';
      controls.mouseButtons.LEFT = pointerMode === 'pan' ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
      controls.touches.ONE = pointerMode === 'pan' ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
      canvas.classList.toggle('pan-mode', pointerMode === 'pan');
    },
    zoom(factor) {
      if (!spans || !(factor > 0)) return;
      const offset = camera.position.clone().sub(controls.target);
      offset.setLength(THREE.MathUtils.clamp(offset.length() / factor, controls.minDistance, controls.maxDistance));
      camera.position.copy(controls.target).add(offset);
      controls.update();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelLoad();
      observer.disconnect();
      controls.dispose();
      canvas.removeEventListener('pointerdown', start);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', finish);
      canvas.removeEventListener('pointercancel', cancelDrag);
      clear();
      materials.forEach(material => material.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    }
  };
}

window.GitpolarProcurementViewer = Object.freeze({ create });
