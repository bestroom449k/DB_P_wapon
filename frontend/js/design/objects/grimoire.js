// 마도서: 가죽 표지에 금속 장식, 등급 빛으로 빛나는 표지 룬과 보석. 등급이 오를수록 깨어난다.
//   1등급 사슬 두 줄에 묶인 낡은 책 → 2등급 사슬 한 줄, 룬이 켜짐 → 3등급 놋쇠 장식, 금박 책장
//   → 4등급 사슬이 끊어지고 빛 균열, 도는 수정 조각 → 5등급 금빛 장식, 떠다니는 낱장, 빛의 날개
// 기를 모을 때 떠오르며 떨고, 내려치는 순간 번쩍이며 가라앉고, 5등급에서는 높이 떠 한 바퀴 돈다.
// 다 만든 책은 빛 기둥을 타고 위로 올라가 보관되고(--reforge), 사슬에 묶인 새 책이 위에서 내려온다.
// s.open(0~1)이 오르면 사슬이 끊어지고 표지가 열리며 페이지의 주문이 떠오른다 (게임 시작 연출용).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { glowTexture } from '../shared/textures.js';
import { GLOW } from '../shared/materials.js';
import { mulberry32, runeCircleTexture, pageTextures, pageEdgeTexture, leatherGrain, glyphTextures, veinTexture, wingTexture, WING_ROOT } from './grimoire-textures.js';

export const BOOK_Y = 0.25; // 책 가운데 높이 (등급 고리, 충격파, 불꽃도 이 높이를 씀)

const TAU = Math.PI * 2;
const SCALE = 1.2; // 크기
const smooth = THREE.MathUtils.smoothstep;

// 등급별 모습. 등급이 바뀌면 이 값들로 1초쯤에 걸쳐 바뀐다 (사슬이 흩어지고, 장식이 자라고, 날개가 돋는다)
const LOOKS = [
  { leather: 0x3e3539, metal: 0x8d8a96, rough: 0.5, rune: 0.2, gem: 0.6, glow: 0.8, spikes: 0, corner: 0.8, gild: 0, chainA: 1, chainB: 1, veins: 0, shards: 0, pages: 0, wings: 0, aura: 0.22 }, // 1 무쇠: 바랜 가죽, 쇠 장식, 사슬 두 줄
  { leather: 0x26362f, metal: 0x8d8a96, rough: 0.45, rune: 0.8, gem: 0.8, glow: 1.8, spikes: 0.55, corner: 0.9, gild: 0.35, chainA: 1, chainB: 0, veins: 0, shards: 0, pages: 0, wings: 0, aura: 0.3 }, // 2 비취: 사슬 한 줄, 룬이 켜짐
  { leather: 0x3d2246, metal: 0xc79c5c, rough: 0.3, rune: 1.15, gem: 1, glow: 2.6, spikes: 1, corner: 1, gild: 1, chainA: 1, chainB: 0, veins: 0, shards: 0, pages: 0, wings: 0, aura: 0.36 }, // 3 자수정: 놋쇠 장식, 금박 책장
  { leather: 0x4a1a2b, metal: 0xd6a85e, rough: 0.24, rune: 1.45, gem: 1.15, glow: 3.4, spikes: 1.15, corner: 1.1, gild: 1, chainA: 0, chainB: 0, veins: 1, shards: 1, pages: 0, wings: 0, aura: 0.44 }, // 4 홍옥: 사슬이 풀리고 빛 균열, 수정 조각
  { leather: 0x2a1c4e, metal: 0xf2c35c, rough: 0.16, rune: 1.8, gem: 1.3, glow: 4.2, spikes: 1.3, corner: 1.22, gild: 1, chainA: 0, chainB: 0, veins: 1, shards: 1, pages: 1, wings: 1, aura: 0.52 }, // 5 황금: 금빛 장식, 낱장, 날개
].map((look) => ({ ...look, leather: new THREE.Color(look.leather), metal: new THREE.Color(look.metal) }));
const KEYS = ['rough', 'rune', 'gem', 'glow', 'spikes', 'corner', 'gild', 'chainA', 'chainB', 'veins', 'shards', 'pages', 'wings', 'aura']; // 천천히 바뀌는 숫자 값

function roundedRect(w, h, r) { // 모서리가 둥근 사각형
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function cornerShape(s) { // 모서리 장식: 안쪽은 오목하고 바깥으로 가시가 뻗는다 (책의 윤곽을 만드는 부품)
  const sh = new THREE.Shape();
  sh.moveTo(-s, 0);
  sh.lineTo(-s * 0.66, 0);
  sh.lineTo(-s * 0.6, 0.07); // 위쪽 작은 가시
  sh.lineTo(-s * 0.54, 0);
  sh.lineTo(-0.07, 0);
  sh.lineTo(0.12, 0.12); // 모서리 큰 가시
  sh.lineTo(0, -0.07);
  sh.lineTo(0, -s * 0.54);
  sh.lineTo(0.07, -s * 0.6); // 옆쪽 작은 가시
  sh.lineTo(0, -s * 0.66);
  sh.lineTo(0, -s);
  sh.quadraticCurveTo(-s * 0.28, -s * 0.28, -s, 0);
  return sh;
}

export function create({ scene }) { // 마도서 만들기
  const W = 1.5, H = 2.0, T = 0.6, CB = 0.06; // 표지 너비, 높이, 책 두께, 표지 판 두께
  const ZC = T / 2 - CB / 2; // 표지 판 가운데 깊이
  const FACE = CB / 2; // 표지 바깥면 (표지 기준)
  const PX = -0.0225, PW = 1.425, PH = H - 0.12, PD = T - 2 * CB - 0.01; // 책장 묶음 위치, 너비, 높이, 두께
  const EY = 0.12; // 표지 문장 높이

  const grain = leatherGrain(); // 가죽 결 (표지)
  grain.repeat.set(2, 2);
  const spineGrain = grain.clone(); // 가죽 결 (책등, 세로로 긴 면)
  spineGrain.repeat.set(1.1, 4);
  spineGrain.needsUpdate = true;
  const { page, glow: pageInk } = pageTextures();

  const leather = new THREE.MeshStandardMaterial({ roughness: 1.2, roughnessMap: grain, bumpMap: grain, bumpScale: 2.5, envMapIntensity: 0.7 }); // 표지 가죽 (색은 등급마다)
  const spineLeather = leather.clone(); // 책등 가죽
  spineLeather.roughnessMap = spineGrain;
  spineLeather.bumpMap = spineGrain;
  const inset = new THREE.MeshStandardMaterial({ color: 0x170c1c, roughness: 0.55, envMapIntensity: 0.5 }); // 문장 아래 어두운 원판
  const metal = new THREE.MeshPhysicalMaterial({ metalness: 1 }); // 장식 금속 (쇠 → 놋쇠 → 금)
  const iron = new THREE.MeshStandardMaterial({ color: 0x77737f, metalness: 1, roughness: 0.42 }); // 사슬과 자물쇠 고리
  const gem = new THREE.MeshStandardMaterial({ color: 0x0c0c12, emissive: 0xffffff, roughness: 0.12 }); // 보석 (등급 색)
  const rune = new THREE.MeshBasicMaterial({ ...GLOW, map: runeCircleTexture(), toneMapped: false }); // 표지 룬
  const backRune = rune.clone(); // 뒤표지 룬 (희미하게)
  const veins = new THREE.MeshBasicMaterial({ ...GLOW, map: veinTexture(), toneMapped: false, color: 0x000000 }); // 빛 균열
  const paper = new THREE.MeshStandardMaterial({ map: page, roughness: 0.92 }); // 첫 장
  const edgeFore = new THREE.MeshStandardMaterial({ map: pageEdgeTexture(false) }); // 책장 단면 (등급이 오르면 금박)
  const edgeTop = new THREE.MeshStandardMaterial({ map: pageEdgeTexture(true) });
  const ink = new THREE.MeshBasicMaterial({ ...GLOW, map: pageInk, toneMapped: false, color: 0x000000 }); // 빛나는 주문
  const endpaper = new THREE.MeshStandardMaterial({ color: 0x5a1c2c, roughness: 0.85 }); // 표지 안쪽 면지
  const ribbon = new THREE.MeshStandardMaterial({ color: 0x9a1f36, roughness: 0.5, side: THREE.DoubleSide }); // 책갈피 끈

  const add = (parent, geometry, material, x = 0, y = 0, z = 0) => { // 부품 하나 붙이기
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  const book = new THREE.Group(); // 책 (움직이는 단위: 둥실, 회전, 기울기)
  book.rotation.order = 'YXZ'; // 펼칠 때 제 몸 기준으로 뒤로 젖힌 뒤 돌아서게
  book.scale.setScalar(SCALE);
  const body = new THREE.Group(); // 책 부품 묶음
  book.add(body);
  scene.add(book);

  // 표지 판, 금속 테두리, 모서리 장식 (앞뒤가 같이 씀)
  const coverGeo = new THREE.ExtrudeGeometry(roundedRect(W - 0.03, H - 0.03, 0.06), { depth: CB - 0.03, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 3, curveSegments: 8 }).center();
  const frameShape = roundedRect(W - 0.16, H - 0.16, 0.04);
  frameShape.holes.push(roundedRect(W - 0.2, H - 0.2, 0.025));
  const frameGeo = new THREE.ExtrudeGeometry(frameShape, { depth: 0.006, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 1, curveSegments: 6 });
  const cornerGeo = new THREE.ExtrudeGeometry(cornerShape(0.36), { depth: CB + 0.012, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 10 }).translate(0, 0, -(CB + 0.012) / 2); // 표지 모서리를 위아래로 감쌈
  const rivetGeo = new THREE.SphereGeometry(0.02, 16, 10);
  const corners = []; // 등급이 오를수록 커지는 모서리 장식
  function dress(cover) { // 표지 하나 꾸미기
    add(cover, coverGeo, leather);
    add(cover, frameGeo, metal, 0, 0, FACE);
    for (const sx of [1, -1]) for (const sy of [1, -1]) {
      corners.push({ mesh: add(cover, cornerGeo, metal, sx * (W / 2 + 0.006), sy * (H / 2 + 0.006), 0), sx, sy });
      add(cover, rivetGeo, metal, sx * (W / 2 - 0.075), sy * (H / 2 - 0.075), FACE + 0.012).scale.z = 0.55; // 못
    }
  }

  // 앞표지: 책등 쪽 경첩을 축으로 열린다
  const hinge = new THREE.Group();
  hinge.position.set(-W / 2, 0, ZC);
  body.add(hinge);
  const front = new THREE.Group();
  front.position.x = W / 2;
  hinge.add(front);
  dress(front);
  add(front, new THREE.CircleGeometry(0.56, 64), inset, 0, EY, FACE + 0.001);
  add(front, new THREE.PlaneGeometry(1.2, 1.2), rune, 0, EY, FACE + 0.002); // 빛나는 마법진
  add(front, new THREE.PlaneGeometry(W - 0.04, H - 0.04), veins, 0, 0, FACE + 0.0025); // 빛 균열
  add(front, new THREE.TorusGeometry(0.585, 0.018, 10, 96), metal, 0, EY, FACE + 0.006); // 마법진 바깥 테
  add(front, new THREE.CylinderGeometry(0.15, 0.17, 0.025, 32), metal, 0, EY, FACE + 0.012).rotation.x = Math.PI / 2; // 보석 받침
  add(front, new THREE.TorusGeometry(0.18, 0.028, 12, 48), metal, 0, EY, FACE + 0.016); // 보석 테
  const spikeGeo = new THREE.ConeGeometry(0.045, 0.26, 4);
  const spikes = Array.from({ length: 8 }, (_, i) => { // 보석 테에서 뻗는 가시 (긴 것 넷, 짧은 것 넷)
    const angle = (i * Math.PI) / 4;
    const mesh = add(front, spikeGeo, metal);
    mesh.rotation.z = angle - Math.PI / 2; // 바깥을 향하게
    return { mesh, angle, len: i % 2 === 0 ? 1 : 0.6 };
  });
  const jewel = add(front, new THREE.OctahedronGeometry(0.15), gem, 0, EY, FACE + 0.05); // 보석
  add(front, new THREE.PlaneGeometry(W - 0.12, H - 0.12), endpaper, 0, 0, -FACE - 0.002).rotation.y = Math.PI; // 면지

  // 뒤표지
  const back = new THREE.Group();
  back.position.z = -ZC;
  back.rotation.y = Math.PI;
  body.add(back);
  dress(back);
  add(back, new THREE.PlaneGeometry(0.8, 0.8), backRune, 0, EY, FACE + 0.002);

  // 책등: 반원기둥 + 가죽 띠 네 줄 + 위아래 금속 마개
  const half = (r, h) => new THREE.CylinderGeometry(r, r, h, 32, 1, false, Math.PI, Math.PI); // 바깥(-x)으로 볼록한 반원기둥
  const SX = -W / 2 + 0.015;
  add(body, half(T / 2, H - 0.01), spineLeather, SX).scale.x = 0.42;
  for (const y of [-0.62, -0.21, 0.21, 0.62]) add(body, half(T / 2 + 0.012, 0.07), spineLeather, SX, y).scale.x = 0.47;
  for (const y of [-1, 1]) add(body, half(T / 2 + 0.008, 0.06), metal, SX, y * 0.972).scale.x = 0.45;

  // 책장 묶음과 첫 장의 빛나는 주문
  add(body, new THREE.BoxGeometry(PW, PH, PD), [edgeFore, edgeFore, edgeTop, edgeTop, paper, edgeFore], PX); // 면 순서: 오른 왼 위 아래 앞 뒤
  add(body, new THREE.PlaneGeometry(PW, PH), ink, PX, 0, PD / 2 + 0.0015);

  // 책갈피 끈 (아래로 늘어져 흔들림)
  const ribbonGeo = new THREE.PlaneGeometry(0.07, 0.5, 1, 10).translate(0, -0.25, 0);
  const rp = ribbonGeo.attributes.position;
  for (let i = 0; i < rp.count; i++) rp.setZ(i, Math.sin(-rp.getY(i) * 4) * 0.03); // 살짝 물결치게
  ribbonGeo.computeVertexNormals();
  const ribbonPivot = new THREE.Group();
  ribbonPivot.position.set(0.25, -PH / 2 + 0.04, 0.06);
  body.add(ribbonPivot);
  add(ribbonPivot, ribbonGeo, ribbon);

  // 사슬: 책 허리를 감는다. 끊어지면(0 → 1) 고리들이 바깥으로 튀며 사라진다
  const UP = new THREE.Vector3(0, 1, 0);
  const linkGeo = new THREE.TorusGeometry(0.042, 0.013, 6, 14).scale(1.45, 1, 1); // 사슬 고리 하나 (길쭉하게)
  function chain(y, seed, withLock) { // 사슬 한 줄 만들기 → 끊어진 정도를 받는 함수를 돌려준다
    const loop = [];
    for (let i = 0; i < 72; i++) { // 책 단면을 감싸는 둥근 사각형 길
      const a = (i / 72) * TAU, c = Math.cos(a), sn = Math.sin(a);
      loop.push(new THREE.Vector3(-0.06 + 0.88 * Math.sign(c) * Math.abs(c) ** 0.2, y, 0.36 * Math.sign(sn) * Math.abs(sn) ** 0.2));
    }
    const path = new THREE.CatmullRomCurve3(loop, true, 'centripetal');
    const count = Math.round(path.getLength() / 0.085 / 2) * 2; // 짝수 (세운 고리와 눕힌 고리가 번갈아)
    const mesh = new THREE.InstancedMesh(linkGeo, iron, count);
    mesh.frustumCulled = false;
    body.add(mesh);
    const r = mulberry32(seed);
    const links = Array.from({ length: count }, (_, i) => {
      const tangent = path.getTangentAt(i / count);
      const out = new THREE.Vector3().crossVectors(UP, tangent).normalize(); // 책 바깥쪽
      const basis = i % 2
        ? new THREE.Matrix4().makeBasis(tangent, out, UP) // 눕힌 고리
        : new THREE.Matrix4().makeBasis(tangent, UP, out.clone().negate()); // 세운 고리
      return { at: path.getPointAt(i / count), out, turn: new THREE.Quaternion().setFromRotationMatrix(basis), kick: r() * 2 - 1 };
    });
    let lock = null;
    if (withLock) { // 자물쇠 (앞표지 가운데에 매달림)
      lock = new THREE.Group();
      lock.position.set(-0.06, y, 0.385);
      body.add(lock);
      add(lock, new THREE.TorusGeometry(0.06, 0.016, 8, 24, Math.PI), iron, 0, -0.07, 0); // 고리
      add(lock, new RoundedBoxGeometry(0.2, 0.2, 0.08, 2, 0.025), metal, 0, -0.17, 0); // 몸통
      add(lock, new THREE.CircleGeometry(0.026, 20), gem, 0, -0.145, 0.041); // 빛나는 열쇠 구멍
      const slot = new THREE.Shape();
      slot.moveTo(-0.011, 0); slot.lineTo(0.011, 0); slot.lineTo(0.02, -0.055); slot.lineTo(-0.02, -0.055); slot.lineTo(-0.011, 0);
      add(lock, new THREE.ShapeGeometry(slot), gem, 0, -0.15, 0.041);
    }
    const matrix = new THREE.Matrix4(), at = new THREE.Vector3(), size = new THREE.Vector3();
    let last = -1;
    return (broken) => { // 0 = 감겨 있음, 1 = 다 흩어짐
      if (broken === last) return;
      last = broken;
      links.forEach((link, i) => {
        at.copy(link.at).addScaledVector(link.out, broken * (0.45 + 0.35 * Math.abs(link.kick))); // 바깥으로 튐
        at.y += broken * link.kick * 0.3;
        mesh.setMatrixAt(i, matrix.compose(at, link.turn, size.setScalar(Math.max(0.001, 1 - broken))));
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.visible = broken < 0.999;
      if (!lock) return;
      lock.position.y = y - broken * 0.5; // 자물쇠는 떨어지며 사라짐
      lock.rotation.z = broken * 0.9;
      lock.scale.setScalar(Math.max(0.001, 1 - broken));
      lock.visible = broken < 0.999;
    };
  }
  const lowerChain = chain(-0.5, 12, true); // 아래 사슬 + 자물쇠 (1~3등급)
  const upperChain = chain(0.75, 13, false); // 위 사슬 (1등급만)

  // 펼쳤을 때: 페이지 빛, 떠오르는 글자 조각
  const pageLight = new THREE.PointLight(0xffffff, 0, 0, 2);
  pageLight.position.set(PX, 0.3, PD / 2 + 0.6);
  body.add(pageLight);
  const motes = new THREE.Group();
  motes.position.set(PX, 0, PD / 2);
  body.add(motes);
  const glyphs = glyphTextures();
  const letters = Array.from({ length: 22 }, (_, i) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ ...GLOW, map: glyphs[i % glyphs.length], toneMapped: false, opacity: 0 }));
    motes.add(sprite);
    return { sprite, age: 1, life: 1, size: 0.15, velocity: new THREE.Vector3() };
  });
  function rise(letter) { // 글자 조각 하나를 첫 장의 마법진에서 다시 띄우기
    const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * 0.5;
    letter.age = -Math.random() * 1.2; // 한꺼번에 튀지 않게 조금씩 늦게
    letter.life = 1.8 + Math.random() * 1.6;
    letter.size = 0.13 + Math.random() * 0.09;
    letter.sprite.position.set(Math.cos(a) * r, 0.3 + Math.sin(a) * r, 0.02);
    letter.velocity.set((Math.random() - 0.5) * 0.12, 0.1 + Math.random() * 0.18, 0.3 + Math.random() * 0.35);
  }

  // 책 뒤의 후광
  const aura = new THREE.Sprite(new THREE.SpriteMaterial({ ...GLOW, map: glowTexture(), toneMapped: false }));
  book.add(aura);

  // 책 둘레 효과 묶음 (책과 같이 뜨지만 같이 돌지는 않는다)
  const halo = new THREE.Group();
  scene.add(halo);

  const shardGroup = new THREE.Group(); // 도는 수정 조각 (4등급부터)
  halo.add(shardGroup);
  const shardGlow = new THREE.MeshStandardMaterial({ color: 0x0c0c12, emissive: 0xffffff, emissiveIntensity: 3, roughness: 0.1 });
  const shardGeo = new THREE.OctahedronGeometry(0.07);
  const shards = Array.from({ length: 8 }, (_, i) => {
    const mesh = new THREE.Mesh(shardGeo, shardGlow);
    shardGroup.add(mesh);
    return { mesh, angle: (i / 8) * TAU, y: i % 2 ? 0.3 : -0.25, radius: 1.2 + (i % 3) * 0.12, spin: 1 + (i % 4) * 0.4 };
  });

  const pageGroup = new THREE.Group(); // 떠다니는 낱장 (5등급)
  halo.add(pageGroup);
  const loosePaper = new THREE.MeshStandardMaterial({ map: page, roughness: 0.9, side: THREE.DoubleSide, transparent: true });
  const looseInk = new THREE.MeshBasicMaterial({ ...GLOW, map: pageInk, side: THREE.DoubleSide, toneMapped: false });
  const looseGeo = new THREE.PlaneGeometry(0.42, 0.56);
  const sheets = [0.9, -0.4, 0.5, -0.9, 1.2, 0.1].map((y, i) => {
    const sheet = new THREE.Group();
    pageGroup.add(sheet);
    add(sheet, looseGeo, loosePaper);
    add(sheet, looseGeo, looseInk, 0, 0, 0.002);
    return { sheet, y, angle: (i / 6) * TAU + 0.3, radius: 1.5 + (i % 2) * 0.22 };
  });

  // 빛의 날개 (5등급): 카메라 쪽을 향한 채 책 뒤에서 천천히 날갯짓한다
  const wingGlow = new THREE.MeshBasicMaterial({ ...GLOW, map: wingTexture(), side: THREE.DoubleSide, toneMapped: false });
  const WS = 2.3; // 날개 한쪽 크기
  const wingGeo = new THREE.PlaneGeometry(WS, WS).translate(WS / 2 - WING_ROOT[0] * WS, WS / 2 - WING_ROOT[1] * WS, 0); // 날개 뿌리가 원점에 오게
  const wings = [1, -1].map((side) => { // 오른쪽, 왼쪽 (왼쪽은 뒤집어서)
    const mesh = new THREE.Mesh(wingGeo, wingGlow);
    mesh.position.set(side * 0.3, -0.25, -0.55);
    halo.add(mesh);
    return { mesh, side };
  });

  const rim = new THREE.PointLight(0xffffff, 0, 7, 2); // 책 뒤에서 등급 색으로 윤곽을 그리는 빛 (어두운 하늘에서 책이 묻히지 않게)
  scene.add(rim);

  const PARCH = new THREE.Color(0xd9ccb0); // 책장 단면: 바랜 종이
  const GOLD = new THREE.Color(0xe2bd6e); // 책장 단면: 금박
  let now = null; // 지금 모습 (등급 모습으로 천천히 다가감)
  let faceTurn = null; // 펼칠 때 돌아설 각도 (펼치기 시작할 때 정함)

  return (s, t, dt) => { // 매 프레임: 마도서
    const look = LOOKS[s.level - 1];
    if (!now) now = { ...look, leather: look.leather.clone(), metal: look.metal.clone() };
    const follow = 1 - Math.exp(-dt * (2.6 + s.reforge * 30)); // 보관하러 올라가 있을 때는 거의 바로 바뀜
    for (const key of KEYS) now[key] += (look[key] - now[key]) * follow;
    now.leather.lerp(look.leather, follow);
    now.metal.lerp(look.metal, follow);

    const broken = smooth(s.open, 0, 0.3); // 사슬이 끊어지는 정도 (먼저)
    const opened = smooth(s.open, 0.22, 1); // 표지가 열리는 정도 (그다음)
    const shine = smooth(s.open, 0.6, 1); // 페이지 빛 (거의 다 펼쳤을 때)

    // 움직임
    const away = smooth(s.reforge, 0, 1) * 7; // 화면 위로 올라간 거리 (완성된 책 보관 → 새 책 등장)
    const spin = t * 0.32 + s.spin * TAU; // 천천히 + 5등급 한 바퀴
    if (opened > 0 && faceTurn === null) faceTurn = Math.round(spin / TAU) * TAU; // 펼치면 가장 가까운 정면으로
    if (opened === 0) faceTurn = null;
    book.position.y = BOOK_Y + Math.sin(t * 0.9) * 0.07 + s.charge * 0.22 - s.pulse * 0.1 + s.finale * 0.3 + away + opened * 0.12; // 둥실 + 기 모으기 + 내려치기 + 5등급 + 보관 + 펼치기
    book.rotation.set(
      -0.3 * opened, // 펼치면 뒤로 젖혀 페이지가 보이게
      faceTurn === null ? spin : THREE.MathUtils.lerp(spin, faceTurn, opened),
      Math.sin(t * 0.5) * 0.03 * (1 - opened) + Math.sin(t * 47) * 0.012 * s.charge, // 기우뚱 + 기 모을 때 떨림
    );
    body.position.x = opened * 0.72; // 펼친 두 면이 가운데 오도록
    hinge.rotation.y = -opened * 0.92 * Math.PI; // 앞표지 열기
    ribbonPivot.rotation.x = Math.sin(t * 1.4) * 0.12;

    // 재질
    leather.color.copy(now.leather);
    spineLeather.color.copy(now.leather).multiplyScalar(0.78);
    metal.color.copy(now.metal);
    metal.roughness = now.rough;
    for (const edge of [edgeFore, edgeTop]) {
      edge.color.copy(PARCH).lerp(GOLD, now.gild);
      edge.metalness = 0.75 * now.gild;
      edge.roughness = 0.95 - 0.6 * now.gild;
    }

    // 장식 크기
    for (const c of corners) c.mesh.scale.set(c.sx * now.corner, c.sy * now.corner, 1);
    const grow = Math.max(0.001, now.spikes);
    for (const spike of spikes) {
      const len = spike.len * grow, r = 0.2 + 0.13 * len; // 뿌리는 보석 테에 붙어 있다
      spike.mesh.position.set(Math.cos(spike.angle) * r, EY + Math.sin(spike.angle) * r, FACE + 0.012);
      spike.mesh.scale.set(grow, len, 0.45 * grow);
      spike.mesh.visible = now.spikes > 0.02;
    }
    jewel.scale.set(1, 1.35, 0.55).multiplyScalar(now.gem);
    lowerChain(Math.max(broken, 1 - now.chainA));
    upperChain(Math.max(broken, 1 - now.chainB));

    // 빛 (기 모을 때 차오르고, 내려치는 순간 번쩍)
    const L = s.light;
    const surge = s.charge * 0.6 + s.pulse * 1.2;
    rune.color.copy(L).multiplyScalar(now.rune * (1 + Math.sin(t * 1.7) * 0.25) + surge);
    backRune.color.copy(L).multiplyScalar(0.4 * now.rune);
    veins.color.copy(L).multiplyScalar(now.veins * (1.2 + Math.sin(t * 3) * 0.5 + surge));
    gem.emissive.copy(L);
    gem.emissiveIntensity = now.glow + Math.sin(t * 2.3) * 0.5 + opened + s.charge * 1.5 + s.pulse * 2.5;
    ink.color.copy(L).multiplyScalar(shine * (1.3 + Math.sin(t * 2.1) * 0.25));
    pageLight.color.copy(L);
    pageLight.intensity = shine * 5;
    const unseal = Math.sin(Math.PI * broken) * 0.6 * Math.max(now.chainA, now.chainB); // 봉인이 풀리는 순간 번쩍
    aura.material.color.copy(L);
    aura.material.opacity = now.aura + opened * 0.15 + unseal + s.pulse * 0.3;
    aura.scale.setScalar(4.5 + now.aura * 4);
    rim.position.set(0, book.position.y + 1.5, -2.6);
    rim.color.copy(L);
    rim.intensity = 8 + now.aura * 12 + opened * 6;

    // 책 둘레 효과
    halo.position.copy(book.position);
    halo.scale.setScalar(SCALE * (1 + opened * 0.12));

    shardGroup.rotation.y = t * 0.6;
    shardGlow.emissive.copy(L);
    shards.forEach((p, i) => {
      p.mesh.visible = now.shards > 0.01;
      p.mesh.position.set(Math.cos(p.angle) * p.radius, p.y + Math.sin(t * 1.3 + i) * 0.12, Math.sin(p.angle) * p.radius);
      p.mesh.rotation.set(t * p.spin, t * p.spin * 0.7, 0);
      p.mesh.scale.set(1, 2.2, 1).multiplyScalar(Math.max(0.001, now.shards));
    });

    pageGroup.rotation.y = -t * 0.25;
    loosePaper.opacity = now.pages;
    looseInk.color.copy(L).multiplyScalar(1.2 * now.pages);
    sheets.forEach((p, i) => {
      p.sheet.visible = now.pages > 0.01;
      p.sheet.position.set(Math.cos(p.angle) * p.radius, p.y + Math.sin(t * 0.9 + i) * 0.1, Math.sin(p.angle) * p.radius);
      p.sheet.rotation.set(Math.sin(t * 1.7 + i) * 0.35, -p.angle + Math.sin(t * 1.2 + i) * 0.3, Math.sin(t * 1.1 + i * 2) * 0.25); // 팔랑팔랑
      p.sheet.scale.setScalar(Math.max(0.001, now.pages));
    });

    wingGlow.color.copy(L).multiplyScalar(1.1 * now.wings + s.pulse * 0.5);
    const flap = Math.sin(t * 1.6); // 날갯짓
    for (const { mesh, side } of wings) {
      mesh.visible = now.wings > 0.01;
      mesh.scale.set(side * Math.max(0.001, now.wings), Math.max(0.001, now.wings), 1);
      mesh.rotation.set(0, side * (0.3 + flap * 0.12), side * flap * 0.07);
    }

    // 글자 조각 (펼쳤을 때)
    for (const letter of letters) {
      letter.age += dt;
      if (letter.age > letter.life) {
        if (s.open > 0.75) rise(letter);
        else { letter.sprite.material.opacity = 0; continue; }
      }
      if (letter.age < 0) { letter.sprite.material.opacity = 0; continue; }
      const k = letter.age / letter.life;
      letter.sprite.position.addScaledVector(letter.velocity, dt);
      letter.sprite.material.opacity = Math.sin(Math.PI * k) * shine;
      letter.sprite.material.color.copy(L).multiplyScalar(1.6);
      letter.sprite.scale.setScalar(letter.size * (0.6 + k * 0.6));
    }
  };
}
