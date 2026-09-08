/* Black Ridge Syndicate — 3D hero scene (ridge silhouette + rising embers) */
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  camera.position.set(0, 1.4, 9);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  /* ---- Ridge / roofline silhouette (low-poly jagged mountain range doubling as a rooftop skyline) ---- */
  const emberColor = new THREE.Color(0xff5a1f);
  const goldColor = new THREE.Color(0xe8b04b);

  function buildRidge(zPos, color, height, opacity, peakCount) {
    const points = [];
    const width = 26;
    points.push(new THREE.Vector2(-width / 2, -4));
    let x = -width / 2;
    const step = width / peakCount;
    for (let i = 0; i <= peakCount; i++) {
      const peak = (i % 2 === 0) ? height * (0.55 + Math.random() * 0.45) : height * (0.25 + Math.random() * 0.3);
      points.push(new THREE.Vector2(x, peak));
      x += step;
    }
    points.push(new THREE.Vector2(width / 2, -4));

    const shape = new THREE.Shape(points);
    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = zPos;
    mesh.position.y = -2.4;
    return mesh;
  }

  const ridgeBack = buildRidge(-6, 0x1a1c22, 3.2, 0.9, 9);
  const ridgeMid = buildRidge(-3, 0x24262e, 2.4, 0.95, 11);
  const ridgeFront = buildRidge(-1, 0x2c2f38, 1.7, 1, 14);
  scene.add(ridgeBack, ridgeMid, ridgeFront);

  /* thin ember edge line along the front ridge */
  const edgeGeo = new THREE.EdgesGeometry(ridgeFront.geometry);
  const edgeMat = new THREE.LineBasicMaterial({ color: emberColor, transparent: true, opacity: 0.5 });
  const edgeLines = new THREE.LineSegments(edgeGeo, edgeMat);
  edgeLines.position.copy(ridgeFront.position);
  scene.add(edgeLines);

  /* ---- Rising embers particle field ---- */
  const particleCount = window.innerWidth < 700 ? 90 : 220;
  const positions = new Float32Array(particleCount * 3);
  const speeds = new Float32Array(particleCount);
  const drifts = new Float32Array(particleCount);
  const sizes = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 22;
    positions[i * 3 + 1] = -3 + Math.random() * 8;
    positions[i * 3 + 2] = -5 + Math.random() * 8;
    speeds[i] = 0.004 + Math.random() * 0.01;
    drifts[i] = (Math.random() - 0.5) * 0.006;
    sizes[i] = 0.02 + Math.random() * 0.05;
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const canvasTex = (() => {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,200,140,1)');
    grad.addColorStop(0.4, 'rgba(255,120,40,0.8)');
    grad.addColorStop(1, 'rgba(255,90,31,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();

  const particleMat = new THREE.PointsMaterial({
    size: 0.16,
    map: canvasTex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    color: goldColor,
  });
  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  /* ---- Ambient fill light (visual only — materials are basic, kept for future PBR swap) ---- */
  scene.fog = new THREE.FogExp2(0x08090b, 0.045);

  let targetX = 0, targetY = 0;
  window.addEventListener('mousemove', (e) => {
    targetX = (e.clientX / window.innerWidth - 0.5) * 0.6;
    targetY = (e.clientY / window.innerHeight - 0.5) * 0.3;
  });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  window.addEventListener('resize', resize);
  resize();

  let raf;
  function animate() {
    const pos = particleGeo.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3 + 1] += speeds[i];
      pos[i * 3] += drifts[i];
      if (pos[i * 3 + 1] > 5) {
        pos[i * 3 + 1] = -3;
        pos[i * 3] = (Math.random() - 0.5) * 22;
      }
    }
    particleGeo.attributes.position.needsUpdate = true;

    camera.position.x += (targetX - camera.position.x) * 0.02;
    camera.position.y += (1.4 - targetY - camera.position.y) * 0.02;
    camera.lookAt(0, 0.4, 0);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(animate);
  }

  if (reduceMotion) {
    renderer.render(scene, camera);
  } else {
    animate();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); }
    else if (!reduceMotion) { animate(); }
  });
})();
