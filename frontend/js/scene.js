import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildSword } from './sword.js';
import { magicCircleTexture, glowTexture } from './textures.js';
import * as S from './shaders.js';
import { readGradeColors } from './grades.js';

// 구름바다 위에 떠 있는 작은 공방 섬. 섬 위의 검을 다섯 개의 등급 고리가 감싼다.
const HERO = new THREE.Vector3(0, 0.25, 0);
const ISLAND_Y = -2.15;
const RING_TILT = Math.PI / 2 + 0.38; // 고리가 정렬될 때의 기울기 (살짝 위에서 내려다보는 각)

function seeded(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

// 같은 위치의 정점은 같은 만큼 흔들어 면이 갈라지지 않게 한다
function jitter(geo, amount, seed, keep = () => false) {
  const rand = seeded(seed);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const offsets = new Map();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    if (keep(v)) continue;
    const key = `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`;
    if (!offsets.has(key)) offsets.set(key, [rand() - 0.5, rand() - 0.5, rand() - 0.5]);
    const [dx, dy, dz] = offsets.get(key);
    pos.setXYZ(i, v.x + dx * amount, v.y + dy * amount, v.z + dz * amount);
  }
  geo.computeVertexNormals();
  return geo;
}

// 금속이 비출 주변 풍경: 남색 하늘, 등불의 호박색, 달빛, 보랏빛 테두리
function buildEnvironment(renderer) {
  const env = new THREE.Scene();
  env.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(10, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'varying vec3 vP; void main(){ vec3 c = mix(vec3(0.32, 0.15, 0.10), vec3(0.08, 0.10, 0.30), smoothstep(-0.6, 0.6, vP.y)); gl_FragColor = vec4(c, 1.0); }',
      }),
    ),
  );
  const panel = (color, intensity, pos, sx, sy) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }),
    );
    m.position.copy(pos);
    m.scale.set(sx, sy, 1);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  panel(0xdfe6ff, 7, new THREE.Vector3(4, 5, 3), 4, 1.6);
  panel(0xffb066, 5, new THREE.Vector3(-5, -2, 2.5), 3, 3);
  panel(0x9a7bff, 3.5, new THREE.Vector3(0, 2, -6), 7, 1.4);
  panel(0x7fe3ff, 2, new THREE.Vector3(-4, 4, -3), 1.4, 4);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.02).texture;
  pmrem.dispose();
  return tex;
}

function makeDrift(shared, rand, { count, rx, rz, z0 = 0, min, height, size, colors, dir, speed, sway, opacity }) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const sz = new Float32Array(count);
  const col = new Float32Array(count * 3);
  const palette = colors.map((c) => new THREE.Color(c));
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (rand() * 2 - 1) * rx;
    pos[i * 3 + 1] = min + rand() * height;
    pos[i * 3 + 2] = z0 + (rand() * 2 - 1) * rz;
    seed[i] = rand();
    sz[i] = size[0] + rand() * (size[1] - size[0]);
    const c = palette[Math.floor(rand() * palette.length)];
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: shared.uTime,
      uPixelRatio: shared.uPixelRatio,
      uDir: { value: dir },
      uSpeed: { value: speed },
      uMin: { value: min },
      uHeight: { value: height },
      uSway: { value: sway },
      uOpacity: { value: opacity },
    },
    vertexShader: S.driftShader.vertex,
    fragmentShader: S.driftShader.fragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.userData.count = count;
  return points;
}

function makeSparks(shared, count) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const alpha = new Float32Array(count);
  const size = new Float32Array(count);
  const vel = new Float32Array(count * 3);
  const life = new Float32Array(count);
  const max = new Float32Array(count).fill(1);
  const attr = (arr, n) => new THREE.BufferAttribute(arr, n).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', attr(pos, 3));
  geo.setAttribute('aColor', attr(col, 3));
  geo.setAttribute('aAlpha', attr(alpha, 1));
  geo.setAttribute('aSize', attr(size, 1));
  const points = new THREE.Points(
    geo,
    new THREE.ShaderMaterial({
      uniforms: { uPixelRatio: shared.uPixelRatio },
      vertexShader: S.sparkShader.vertex,
      fragmentShader: S.sparkShader.fragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  points.frustumCulled = false;

  let cursor = 0;
  const white = new THREE.Color(1, 1, 1);
  const tmp = new THREE.Color();

  function emit(color, n, { origin, speed = [1.8, 5.2], up = 1.4, height = [-1.6, 0.9] } = {}) {
    for (let k = 0; k < n; k++) {
      const i = cursor;
      cursor = (cursor + 1) % count;
      const th = Math.random() * Math.PI * 2;
      const sp = speed[0] + Math.random() * (speed[1] - speed[0]);
      pos[i * 3] = origin.x + (Math.random() - 0.5) * 0.2;
      pos[i * 3 + 1] = origin.y + height[0] + Math.random() * (height[1] - height[0]);
      pos[i * 3 + 2] = origin.z + (Math.random() - 0.5) * 0.2;
      vel[i * 3] = Math.cos(th) * sp;
      vel[i * 3 + 1] = (0.15 + Math.random() * 0.85) * up * sp * 0.55;
      vel[i * 3 + 2] = Math.sin(th) * sp;
      tmp.copy(color).lerp(white, Math.random() * 0.35).multiplyScalar(0.9 + Math.random() * 1.1);
      col.set([tmp.r, tmp.g, tmp.b], i * 3);
      max[i] = life[i] = 0.55 + Math.random() * 1.0;
      size[i] = 2 + Math.random() * 4;
    }
    geo.attributes.aColor.needsUpdate = true;
    geo.attributes.aSize.needsUpdate = true;
  }

  function update(dt) {
    const drag = Math.max(0, 1 - 1.8 * dt);
    for (let i = 0; i < count; i++) {
      if (life[i] <= 0) {
        alpha[i] = 0;
        continue;
      }
      life[i] -= dt;
      vel[i * 3] *= drag;
      vel[i * 3 + 1] = vel[i * 3 + 1] * drag - 3.0 * dt;
      vel[i * 3 + 2] *= drag;
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      alpha[i] = Math.pow(Math.max(life[i], 0) / max[i], 1.3);
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aAlpha.needsUpdate = true;
  }

  return { points, emit, update };
}

export function createScene(canvas, options = {}) {
  const reduced = !!options.reducedMotion;
  const gradeColors = readGradeColors();
  const rand = seeded(42);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x120f2a, 0.018);
  scene.environment = buildEnvironment(renderer);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 400);
  const camBase = new THREE.Vector3(0, 0, 11.5);
  const camLook = new THREE.Vector3(0, 0.15, 0);

  const shared = { uTime: { value: 0 }, uDay: { value: 0 }, uPixelRatio: { value: 1 } };

  // 빛
  scene.add(new THREE.HemisphereLight(0x5560b0, 0x1a0f22, 0.8));
  const moonLight = new THREE.DirectionalLight(0xc8d2ff, 2.4);
  moonLight.position.set(5, 6, 4);
  scene.add(moonLight);
  const lampLight = new THREE.PointLight(0xffa860, 22, 9, 2);
  lampLight.position.set(0, ISLAND_Y + 0.6, 1.4);
  scene.add(lampLight);
  const strikeLight = new THREE.PointLight(0xffffff, 0, 12, 2);
  strikeLight.position.copy(HERO);
  scene.add(strikeLight);

  // 하늘
  const skyU = {
    uTime: shared.uTime,
    uDay: shared.uDay,
    uStorm: { value: 0 },
    uFlash: { value: 0 },
    uTint: { value: new THREE.Color(gradeColors[0]) },
    uMoonDir: { value: new THREE.Vector3(0.186, 0.225, -0.957).normalize() },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(150, 64, 32),
    new THREE.ShaderMaterial({
      uniforms: skyU,
      vertexShader: S.skyShader.vertex,
      fragmentShader: S.skyShader.fragment,
      side: THREE.BackSide,
      depthWrite: false,
    }),
  );
  sky.renderOrder = -10;
  scene.add(sky);

  // 먼 산맥 두 겹
  for (const [radius, seed, color, haze, y] of [
    [135, 7.7, 0x1c1438, 0.55, -3],
    [95, 3.1, 0x0c0a22, 0.28, -4],
  ]) {
    const ridge = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, 26, 200, 1, true),
      new THREE.ShaderMaterial({
        uniforms: {
          uSeed: { value: seed },
          uDay: shared.uDay,
          uHaze: { value: haze },
          uColor: { value: new THREE.Color(color) },
          uRim: { value: new THREE.Color(0x6a5fc0) },
        },
        vertexShader: S.ridgeShader.vertex,
        fragmentShader: S.ridgeShader.fragment,
        side: THREE.BackSide,
      }),
    );
    ridge.position.y = y;
    scene.add(ridge);
  }

  // 구름바다
  const cloudU = { uTime: shared.uTime, uDay: shared.uDay, uDensity: { value: 0 }, uTint: { value: new THREE.Color() } };
  const clouds = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 260),
    new THREE.ShaderMaterial({
      uniforms: cloudU,
      vertexShader: S.cloudShader.vertex,
      fragmentShader: S.cloudShader.fragment,
      transparent: true,
      depthWrite: false,
    }),
  );
  clouds.rotation.x = -Math.PI / 2;
  clouds.position.y = -6.5;
  scene.add(clouds);

  // 떠 있는 섬과 구각형 제단
  const stone = new THREE.MeshStandardMaterial({ color: 0x2b2a48, roughness: 0.92, metalness: 0.05, flatShading: true });
  const brassTrim = new THREE.MeshPhysicalMaterial({ color: 0xc79c5c, metalness: 1, roughness: 0.35 });
  const altar = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.38, 0.34, 10, 1), stone);
  altar.position.y = ISLAND_Y - 0.17;
  scene.add(altar);
  const trim = new THREE.Mesh(new THREE.CylinderGeometry(2.53, 2.53, 0.05, 10, 1, true), brassTrim);
  trim.position.y = ISLAND_Y - 0.03;
  scene.add(trim);
  const coneH = 3.4;
  const coneGeo = jitter(new THREE.ConeGeometry(2.38, coneH, 10, 5), 0.35, 11, (v) => Math.abs(v.y + coneH / 2) < 1e-3);
  coneGeo.rotateX(Math.PI);
  const cone = new THREE.Mesh(coneGeo, stone);
  cone.position.y = ISLAND_Y - 0.34 - coneH / 2;
  scene.add(cone);

  // 마법진 (바깥, 안쪽이 서로 반대로 돈다)
  const circleTex = magicCircleTexture();
  const circleMat = new THREE.MeshBasicMaterial({
    map: circleTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const circleOuter = new THREE.Mesh(new THREE.CircleGeometry(2.25, 96), circleMat);
  circleOuter.rotation.x = -Math.PI / 2;
  const circleSpin = new THREE.Group();
  circleSpin.position.y = ISLAND_Y + 0.006;
  circleSpin.add(circleOuter);
  scene.add(circleSpin);
  const innerMat = circleMat.clone();
  const circleInner = new THREE.Mesh(new THREE.CircleGeometry(1.05, 96), innerMat);
  circleInner.rotation.x = -Math.PI / 2;
  const innerSpin = new THREE.Group();
  innerSpin.position.y = ISLAND_Y + 0.012;
  innerSpin.add(circleInner);
  scene.add(innerSpin);

  const glowTex = glowTexture();
  const groundGlowMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.5,
  });
  const groundGlow = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), groundGlowMat);
  groundGlow.rotation.x = -Math.PI / 2;
  groundGlow.position.y = ISLAND_Y + 0.02;
  scene.add(groundGlow);

  // 섬 둘레를 도는 돌 조각들
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x2e2c48,
    roughness: 0.9,
    metalness: 0.05,
    flatShading: true,
    envMapIntensity: 0.5,
  });
  const rocks = [];
  for (let i = 0; i < 9; i++) {
    const r = 0.06 + rand() * 0.15;
    const mesh = new THREE.Mesh(jitter(new THREE.DodecahedronGeometry(r, 0), r * 0.55, 100 + i), rockMat);
    scene.add(mesh);
    rocks.push({
      mesh,
      ang: (i / 9) * Math.PI * 2 + rand() * 0.4,
      rad: 3.3 + rand() * 1.6,
      y: ISLAND_Y - 0.6 + rand() * 3.4,
      speed: (0.035 + rand() * 0.05) * (i % 3 === 0 ? -1 : 1),
      bob: rand() * Math.PI * 2,
      spin: new THREE.Vector3(rand(), rand(), rand()).multiplyScalar(0.5),
    });
  }

  // 검과 후광
  const { sword, inlay, gem } = buildSword();
  sword.position.copy(HERO);
  sword.scale.setScalar(1.1);
  scene.add(sword);
  const auraMat = new THREE.SpriteMaterial({
    map: glowTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0.45,
  });
  const aura = new THREE.Sprite(auraMat);
  aura.scale.setScalar(6.5);
  aura.position.set(HERO.x, HERO.y, -0.8);
  scene.add(aura);

  // 강화 순간 가로로 번지는 렌즈 빛줄기
  const streakMat = new THREE.SpriteMaterial({
    map: glowTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    opacity: 0,
  });
  const streak = new THREE.Sprite(streakMat);
  streak.scale.set(11, 0.2, 1);
  scene.add(streak);

  // 다섯 개의 등급 고리 (혼천의처럼 제각각 돌다가 강화될 때마다 하나씩 정렬된다)
  const ringGroup = new THREE.Group();
  ringGroup.position.copy(HERO);
  scene.add(ringGroup);
  const rings = gradeColors.map((hex, i) => {
    const radius = 1.3 + i * 0.3;
    const color = new THREE.Color(hex);
    const mat = new THREE.MeshBasicMaterial({
      color: color.clone(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const beadMat = mat.clone();
    const holder = new THREE.Group();
    holder.add(new THREE.Mesh(new THREE.TorusGeometry(radius, 0.009 + i * 0.0015, 6, 240), mat));
    const beadGeo = new THREE.SphereGeometry(0.032 + i * 0.005, 12, 8);
    const beads = 1 + (i % 3);
    for (let b = 0; b < beads; b++) {
      const a = (b / beads) * Math.PI * 2 + i;
      const bead = new THREE.Mesh(beadGeo, beadMat);
      bead.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
      holder.add(bead);
    }
    ringGroup.add(holder);
    const sign = () => (rand() < 0.5 ? -1 : 1);
    return {
      holder,
      mat,
      beadMat,
      color,
      align: 0,
      glow: 0.32,
      phase: new THREE.Vector3(rand() * 6.28, rand() * 6.28, rand() * 6.28),
      speed: new THREE.Vector3((0.1 + rand() * 0.22) * sign(), (0.08 + rand() * 0.18) * sign(), (0.06 + rand() * 0.14) * sign()),
    };
  });

  // 입자들
  const embers = makeDrift(shared, rand, {
    count: 560,
    rx: 9,
    rz: 6,
    min: -4,
    height: 10,
    size: [2, 7],
    colors: [0xffb35a, 0xffd28a, 0xffc06b, 0xd8ff9a, 0xc8a6ff],
    dir: 1,
    speed: 0.2,
    sway: 0.35,
    opacity: 0.9,
  });
  scene.add(embers);
  const sparks = makeSparks(shared, 900);
  scene.add(sparks.points);

  // 충격파
  const shocks = Array.from({ length: 6 }, () => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color() }, uOpacity: { value: 0 }, uWidth: { value: 0.05 } },
        vertexShader: S.shockShader.vertex,
        fragmentShader: S.shockShader.fragment,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  });
  let shockCursor = 0;
  function emitShock(color, { ground = false, scale = 6.5, duration = 1.2, width = 0.045 } = {}) {
    const mesh = shocks[shockCursor];
    shockCursor = (shockCursor + 1) % shocks.length;
    const u = mesh.material.uniforms;
    u.uColor.value.copy(color);
    u.uWidth.value = width;
    if (ground) {
      mesh.position.set(0, ISLAND_Y + 0.03, 0);
      mesh.rotation.set(-Math.PI / 2, 0, 0);
    } else {
      mesh.position.copy(sword.position);
      mesh.rotation.set(RING_TILT, 0, 0);
    }
    mesh.visible = true;
    gsap.killTweensOf(mesh.scale);
    gsap.killTweensOf(u.uOpacity);
    gsap.fromTo(mesh.scale, { x: 0.4, y: 0.4 }, { x: scale, y: scale, duration, ease: 'expo.out' });
    gsap.fromTo(u.uOpacity, { value: 1 }, { value: 0, duration, ease: 'power2.out', onComplete: () => (mesh.visible = false) });
  }

  // 9등급 달성 때 솟는 빛 기둥
  const pillarU = { uColor: { value: new THREE.Color() }, uOpacity: { value: 0 }, uTime: shared.uTime };
  const pillarGeo = new THREE.CylinderGeometry(0.55, 1.15, 16, 64, 1, true);
  pillarGeo.translate(0, 8, 0);
  const pillar = new THREE.Mesh(
    pillarGeo,
    new THREE.ShaderMaterial({
      uniforms: pillarU,
      vertexShader: S.pillarShader.vertex,
      fragmentShader: S.pillarShader.fragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  pillar.position.y = ISLAND_Y;
  pillar.visible = false;
  scene.add(pillar);

  // 후처리
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.72, 0.5, 0.78);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const finish = new ShaderPass(S.finishShader);
  finish.uniforms.uFlashColor.value = new THREE.Color(1, 1, 1);
  finish.uniforms.uFade.value = 0;
  composer.addPass(finish);

  // 강화 의식 타임라인이 조작하는 값들
  const state = {
    gradeColor: new THREE.Color(gradeColors[0]),
    inlayGlow: 2.2,
    lift: 0,
    spin: 0,
    flash: 0,
    strike: 0,
    circleGlow: 0.6,
    aura: 0.45,
    pillar: 0,
    prism: 0,
    shake: 0,
    bloomBoost: 0,
    push: 0,
  };

  const intro = { p: 1 };
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
  });

  function resize() {
    const w = innerWidth;
    const h = innerHeight;
    const pr = Math.min(devicePixelRatio, 1.75);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    shared.uPixelRatio.value = pr;
    const aspect = w / h;
    camera.aspect = aspect;
    const wide = aspect > 1.2 && w > 860;
    if (wide) camera.setViewOffset(w, h, -w * 0.17, 0, w, h);
    else camera.clearViewOffset();
    camBase.z = Math.max(11.5, 3.0 / (Math.tan(THREE.MathUtils.degToRad(16)) * aspect));
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  const lit = new THREE.Color();
  const prismColor = new THREE.Color();
  const amber = new THREE.Color(0xffa860);
  const qa = new THREE.Quaternion();
  const qb = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const smooth = (x) => x * x * (3 - 2 * x);
  const clock = new THREE.Clock();
  let elapsed = 0;

  function frame() {
    const dt = Math.min(clock.getDelta(), 1 / 20);
    elapsed += dt;
    shared.uTime.value = elapsed;
    const motion = reduced ? 0.35 : 1;

    // 지금 빛나는 색 (9등급 피날레에서는 무지갯빛으로 돈다)
    lit.copy(state.gradeColor);
    if (state.prism > 0) {
      prismColor.setHSL((elapsed * 0.32) % 1, 0.9, 0.66);
      lit.lerp(prismColor, state.prism);
    }

    inlay.color.copy(lit).multiplyScalar(state.inlayGlow);
    gem.emissive.copy(lit);
    gem.emissiveIntensity = 1.2 + state.inlayGlow * 0.8;
    circleMat.color.copy(lit).multiplyScalar(state.circleGlow);
    innerMat.color.copy(lit).multiplyScalar(state.circleGlow * 1.25);
    groundGlowMat.color.copy(lit);
    groundGlowMat.opacity = 0.25 + state.circleGlow * 0.3;
    auraMat.color.copy(lit);
    auraMat.opacity = state.aura;
    strikeLight.color.copy(lit);
    strikeLight.intensity = state.strike * 30;
    lampLight.color.copy(amber).lerp(lit, 0.3);
    skyU.uTint.value.copy(lit);
    cloudU.uTint.value.copy(lit);
    pillarU.uColor.value.copy(lit);
    pillarU.uOpacity.value = state.pillar * 0.45;
    pillar.visible = state.pillar > 0.002;
    pillar.scale.set(1 + Math.sin(elapsed * 9) * 0.04, 1, 1 + Math.sin(elapsed * 9) * 0.04);
    bloom.strength = 0.72 + state.bloomBoost;
    finish.uniforms.uTime.value = elapsed;
    finish.uniforms.uFlash.value = state.flash * (reduced ? 0.35 : 1);
    finish.uniforms.uFlashColor.value.copy(lit);

    // 검
    sword.position.y = HERO.y + Math.sin(elapsed * 0.9) * 0.07 * motion + state.lift * 0.22;
    sword.rotation.y = elapsed * 0.32 * motion + state.spin;
    sword.rotation.z = Math.sin(elapsed * 0.5) * 0.035 * motion;
    aura.position.y = sword.position.y;
    ringGroup.position.y = sword.position.y * 0.6 + HERO.y * 0.4;
    streak.position.set(sword.position.x, sword.position.y + 0.55, 0.6);
    streakMat.color.copy(lit);
    streakMat.opacity = Math.min(state.flash, 1) * (reduced ? 0.3 : 0.85);

    // 고리
    rings.forEach((r, i) => {
      const t = elapsed * motion;
      euler.set(r.phase.x + t * r.speed.x, r.phase.y + t * r.speed.y, r.phase.z + t * r.speed.z);
      qa.setFromEuler(euler);
      euler.set(RING_TILT, 0, t * 0.14 * (i % 2 ? 1 : -1) + i);
      qb.setFromEuler(euler);
      r.holder.quaternion.slerpQuaternions(qa, qb, smooth(Math.min(Math.max(r.align, 0), 1)));
      r.mat.color.copy(r.color).multiplyScalar(r.glow);
      r.beadMat.color.copy(r.color).multiplyScalar(r.glow * 1.8 + 0.5);
    });

    circleSpin.rotation.y = elapsed * 0.05 * motion;
    innerSpin.rotation.y = -elapsed * 0.09 * motion;

    for (const r of rocks) {
      r.ang += r.speed * dt * motion;
      // 궤도를 앞뒤로 눌러 카메라 바로 앞을 가로막지 않게 한다
      r.mesh.position.set(Math.cos(r.ang) * r.rad, r.y + Math.sin(elapsed * 0.6 + r.bob) * 0.14, Math.sin(r.ang) * r.rad * 0.55);
      r.mesh.rotation.x += r.spin.x * dt * motion;
      r.mesh.rotation.y += r.spin.y * dt * motion;
    }

    sparks.update(dt);

    // 카메라: 도입부 이동 + 마우스 시차 + 강화 순간의 흔들림
    pointer.sx += (pointer.x - pointer.sx) * Math.min(1, dt * 2.5);
    pointer.sy += (pointer.y - pointer.sy) * Math.min(1, dt * 2.5);
    const ip = 1 - intro.p;
    const shake = reduced ? 0 : state.shake;
    const swayX = Math.sin(elapsed * 0.07) * 0.6 * motion;
    const swayY = Math.sin(elapsed * 0.11) * 0.15 * motion;
    camera.position.set(
      camBase.x + swayX + pointer.sx * 0.55 * motion + (Math.random() - 0.5) * shake * 0.08,
      camBase.y + swayY - pointer.sy * 0.3 * motion + ip * 3.4 + (Math.random() - 0.5) * shake * 0.08,
      camBase.z + ip * 10 - state.push * 4.5,
    );
    camera.lookAt(camLook.x, camLook.y + ip * 1.2, camLook.z);
    sky.position.copy(camera.position);

    composer.render(dt);
  }

  return {
    rig: {
      state,
      rings,
      emitSparks: (color, n, opts) => sparks.emit(color, n, { origin: sword.position, ...opts }),
      emitShock,
    },
    start() {
      clock.start();
      renderer.setAnimationLoop(frame);
    },
    warmup() {
      renderer.compile(scene, camera);
      composer.render(0.016);
    },
    playIntro(duration = 3.8) {
      intro.p = 0;
      gsap.to(finish.uniforms.uFade, { value: 1, duration: 1.8, ease: 'power2.out' });
      return gsap.to(intro, { p: 1, duration, ease: 'expo.out' });
    },
    pushIn() {
      return gsap
        .timeline()
        .to(state, { push: 1, duration: 0.7, ease: 'power3.in' })
        .fromTo(state, { flash: 0.9 }, { flash: 0, duration: 0.9, ease: 'expo.out', immediateRender: false })
        .to(state, { push: 0, duration: 1.4, ease: 'expo.out' }, '<');
    },
  };
}
