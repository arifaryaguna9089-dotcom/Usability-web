

/* Rubik's cube 3x3 (CSS 3D): klik sisi untuk memutar, seret untuk mengubah sudut pandang */
(() => {
  const cube = document.getElementById('cube');
  const stage = document.getElementById('stage');
  const S = 66; // jarak antar cubie
  const FACES = [ // [axis, dir, transform, warna]
    ['z', 1, 'translateZ(33px)', '#ffffff'],
    ['z',-1, 'rotateY(180deg) translateZ(33px)', '#3b9eff'],
    ['x', 1, 'rotateY(90deg) translateZ(33px)', '#3ad389'],
    ['x',-1, 'rotateY(-90deg) translateZ(33px)', '#ff9592'],
    ['y',-1, 'rotateX(90deg) translateZ(33px)', '#9281f7'],
    ['y', 1, 'rotateX(-90deg) translateZ(33px)', '#ffca16'],
  ];
  const cubies = [];
  const faceCubies = new WeakMap();
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    const el = document.createElement('div');
    el.className = 'cubie';
    const home = new DOMMatrix().translate(x * S, y * S, z * S);
    const c = { el, home, m: new DOMMatrix(home.toFloat64Array()) };
    FACES.forEach(([axis, dir, tf, color]) => {
      const f = document.createElement('div');
      const isOuterFace = ({x, y, z}[axis] === dir);
      f.className = 'face' + (isOuterFace ? ' out' : '');
      f.style.transform = tf;
      f.style.setProperty('--c', color);
      if (isOuterFace) {
        f.setAttribute('role', 'button');
        f.tabIndex = 0;
        f.setAttribute('aria-label', 'Putar sisi kubus 90 derajat');
        faceCubies.set(f, { cubie: c, axis, dir });
      }
      el.appendChild(f);
    });
    el.style.transform = c.m.toString();
    cube.appendChild(el); cubies.push(c);
  }

  // ---- Rotasi seluruh kubus ----
  let rx = -25, ry = -35, tx = 0, ty = 0, vx = 0, vy = 0, idle = 0, dragging = false, moved = false, last = null, pointerStart = null, pressedFace = null;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  addEventListener('pointermove', e => {          // kubus mengikuti kursor
    if (dragging) return;
    tx = (e.clientX / innerWidth - .5) * 60;
    ty = -(e.clientY / innerHeight - .5) * 40;
  });
  stage.addEventListener('pointerdown', e => {
    pressedFace = e.target.closest('.face.out');
    moved = false;
    pointerStart = { x: e.clientX, y: e.clientY };
    dragging = true; last = e; stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', e => {    // drag untuk memutar bebas
    if (!dragging) return;
    if (Math.abs(e.clientX - pointerStart.x) + Math.abs(e.clientY - pointerStart.y) > 5) moved = true;
    vy = (e.clientX - last.clientX) * .5; vx = -(e.clientY - last.clientY) * .5;
    ry += vy; rx += vx; last = e;
  });
  const end = () => { dragging = false; };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', () => { dragging = false; pressedFace = null; });

  // ---- Putar satu lapisan ----
  let busy = false;
  function twist(axis, layer, dir) {
    return new Promise(resolve => {
      const vec = { x: [1,0,0], y: [0,1,0], z: [0,0,1] }[axis];
      const group = cubies.filter(c => Math.round({ x: c.m.m41, y: c.m.m42, z: c.m.m43 }[axis] / S) === layer);
      const rot = a => new DOMMatrix().rotateAxisAngle(...vec, a);
      const t0 = performance.now(), dur = 450;
      (function step(now) {
        const p = Math.min((now - t0) / dur, 1);
        const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        group.forEach(c => c.el.style.transform = rot(90 * dir * e).multiply(c.m).toString());
        if (p < 1) return requestAnimationFrame(step);
        group.forEach(c => { c.m = rot(90 * dir).multiply(c.m); c.el.style.transform = c.m.toString(); });
        resolve();
      })(t0);
    });
  }
  async function scramble(n = 8) {
    if (busy) return;
    busy = true;
    try {
      for (let i = 0; i < n; i++) {
        await twist('xyz'[Math.random() * 3 | 0], (Math.random() * 3 | 0) - 1, Math.random() < .5 ? 1 : -1);
      }
    } finally {
      busy = false;
    }
  }

  function turnFace(face) {
    if (busy) return;
    busy = true;
    const faceInfo = faceCubies.get(face);
    const { cubie, axis: originalAxis, dir: originalDir } = faceInfo;
    const normal = { x: 0, y: 0, z: 0 };
    normal[originalAxis] = originalDir;
    const rotatedNormal = {
      x: normal.x * cubie.m.m11 + normal.y * cubie.m.m21 + normal.z * cubie.m.m31,
      y: normal.x * cubie.m.m12 + normal.y * cubie.m.m22 + normal.z * cubie.m.m32,
      z: normal.x * cubie.m.m13 + normal.y * cubie.m.m23 + normal.z * cubie.m.m33,
    };
    const turnAxis = ['x', 'y', 'z'].reduce((best, key) => Math.abs(rotatedNormal[key]) > Math.abs(rotatedNormal[best]) ? key : best, 'x');
    const position = { x: cubie.m.m41, y: cubie.m.m42, z: cubie.m.m43 };
    const layer = Math.round(position[turnAxis] / S);
    const direction = rotatedNormal[turnAxis] > 0 ? -1 : 1;
    twist(turnAxis, layer, direction).finally(() => {
      busy = false;
    });
  }
  stage.addEventListener('click', e => {
    const face = e.target.closest('.face.out') || pressedFace;
    if (moved) {
      moved = false;
      pressedFace = null;
      return;
    }
    pressedFace = null;
    if (face) turnFace(face);
  });
  cube.addEventListener('keydown', e => {
    if ((e.key !== 'Enter' && e.key !== ' ') || !e.target.matches('.face.out')) return;
    e.preventDefault();
    turnFace(e.target);
  });
  setTimeout(() => scramble(3), 1400); // gerakan pembuka

  // ---- Loop animasi ----
  (function loop() {
    if (!dragging) {
      vx *= .95; vy *= .95; rx += vx; ry += vy;
      if (!reduce) idle += .15;
    }
    cube.style.transform = `rotateX(${rx + ty}deg) rotateY(${ry + tx + idle}deg)`;
    requestAnimationFrame(loop);
  })();
})();

