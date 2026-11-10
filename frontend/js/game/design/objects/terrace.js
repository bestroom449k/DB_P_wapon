// 대리석 테라스: 하늘이 비치는 반질반질한 둥근 바닥과, 그 뒤를 반원으로 두른 돌 난간.
// 바닥은 Reflector(거울)로 위의 장면을 비추고, 셰이더에서 살짝 흐리게 한 뒤 대리석 타일 색과 섞는다.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { NOISE } from '../../../design/shared/glsl.js';
import { marble, marbleTrim } from '../shared/stone.js';

export const FLOOR_RADIUS = 18; // 바닥 반지름
const FLOOR_Z = 1.5; // 바닥 중심의 깊이
const RAIL = { from: THREE.MathUtils.degToRad(196), to: THREE.MathUtils.degToRad(344), radius: 17.4 }; // 난간이 두르는 각도와 반지름

const floorShader = { // 바닥 셰이더: 흐린 거울 + 대리석 타일
  name: 'TerraceFloor',
  uniforms: {
    color: { value: null }, // Reflector가 채우는 값 (거울 색)
    tDiffuse: { value: null }, // Reflector가 채우는 값 (비친 장면)
    textureMatrix: { value: null }, // Reflector가 채우는 값
    uBase: { value: new THREE.Color(0xeef0fc) }, // 대리석 바탕
    uLine: { value: new THREE.Color(0xc3c8ee) }, // 타일 줄눈
    uHaze: { value: new THREE.Color(0xe2ebfb) }, // 먼 바닥이 묻히는 색
    uBlur: { value: 0.006 }, // 비친 모습 흐림 정도
  },
  vertexShader: /* glsl */ `
    uniform mat4 textureMatrix;
    varying vec4 vUv;
    varying vec3 vWorld;
    void main() {
      vUv = textureMatrix * vec4(position, 1.0);
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorld = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 color;
    uniform sampler2D tDiffuse;
    uniform vec3 uBase;
    uniform vec3 uLine;
    uniform vec3 uHaze;
    uniform float uBlur;
    varying vec4 vUv;
    varying vec3 vWorld;
    ${NOISE}
    float seam(float v) { // 타일 줄눈 (화면 크기에 맞춰 늘 가늘게)
      float d = abs(fract(v - 0.5) - 0.5) / fwidth(v);
      return 1.0 - min(d, 1.0);
    }
    void main() {
      vec2 p = vWorld.xz;
      float tiles = max(seam(p.x / 2.6), seam(p.y / 2.6));
      float vein = smoothstep(0.58, 0.72, fbm(p * 0.22 + vec2(3.0, 7.0))) * 0.5; // 대리석 결
      vec3 base = mix(uBase, uLine, tiles * 0.55 + vein * 0.12);

      vec3 mirror = vec3(0.0); // 비친 장면을 주변 9곳에서 모아 살짝 흐리게
      for (int i = 0; i < 9; i++) {
        float a = float(i) * 2.39996;
        vec2 o = (i == 0) ? vec2(0.0) : vec2(cos(a), sin(a)) * uBlur * sqrt(float(i) / 8.0);
        mirror += texture2DProj(tDiffuse, vUv + vec4(o * vUv.w, 0.0, 0.0)).rgb;
      }
      mirror = min(mirror / 9.0, vec3(1.25)); // 빛 기둥이 비친 곳이 너무 넓게 번지지 않게

      vec3 toEye = normalize(cameraPosition - vWorld);
      float fresnel = mix(0.3, 0.78, pow(1.0 - toEye.y, 4.0)); // 비스듬히 볼수록(먼 바닥) 더 잘 비친다
      vec3 col = mix(base, mirror * color, fresnel);

      float dist = length(vWorld - cameraPosition);
      col = mix(col, uHaze, smoothstep(22.0, 40.0, dist) * 0.6);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

function balusterGeometry() { // 난간 기둥 하나: 항아리 모양을 돌려 깎는다
  const profile = [
    [0, 0], [0.1, 0], [0.1, 0.08], [0.065, 0.13], [0.055, 0.24], [0.1, 0.46], [0.115, 0.58],
    [0.07, 0.76], [0.05, 0.86], [0.085, 0.92], [0.085, 0.98], [0, 0.98],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(profile, 10);
}

export function create({ scene, renderer }) { // 테라스 만들기
  // 바닥 (거울)
  const ratio = renderer.getPixelRatio() * 0.5; // 거울은 화면의 절반 해상도로 (흐리게 쓰니 충분하다)
  const floor = new Reflector(new THREE.CircleGeometry(FLOOR_RADIUS, 128), {
    shader: floorShader,
    textureWidth: innerWidth * ratio,
    textureHeight: innerHeight * ratio,
    clipBias: 0.003,
    color: 0xd8dcff,
    multisample: 0,
  });
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = FLOOR_Z;
  scene.add(floor);

  const rim = new THREE.Mesh(new THREE.CylinderGeometry(FLOOR_RADIUS, FLOOR_RADIUS - 0.6, 1.2, 128, 1, true), marbleTrim); // 바닥 가장자리 돌 띠
  rim.position.set(0, -0.6, FLOOR_Z);
  scene.add(rim);

  // 난간: 기둥(post) 사이에 작은 난간 기둥(baluster)을 줄지어 세우고, 위아래로 띠를 얹는다
  const posts = [];
  const spans = Math.round(((RAIL.to - RAIL.from) * RAIL.radius) / 2.6); // 기둥 사이 칸 수
  for (let i = 0; i <= spans; i++) posts.push(RAIL.from + ((RAIL.to - RAIL.from) * i) / spans);
  const at = (angle, r = RAIL.radius) => new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r + FLOOR_Z);

  const box = new THREE.BoxGeometry(1, 1, 1);
  const pieces = []; // [위치, 크기, 회전, 재질]
  for (const angle of posts) { // 큰 기둥: 받침, 몸통, 머리
    const p = at(angle);
    const turn = -angle + Math.PI / 2;
    pieces.push([p.clone().setY(0.08), [0.62, 0.16, 0.62], turn, marbleTrim]);
    pieces.push([p.clone().setY(0.66), [0.46, 1.04, 0.46], turn, marble]);
    pieces.push([p.clone().setY(1.24), [0.62, 0.14, 0.62], turn, marbleTrim]);
  }
  for (let i = 0; i < spans; i++) { // 기둥 사이 띠 (아래 받침, 위 손잡이)
    const a = (posts[i] + posts[i + 1]) / 2;
    const length = 2 * RAIL.radius * Math.sin((posts[i + 1] - posts[i]) / 2) - 0.46;
    const p = at(a, RAIL.radius * Math.cos((posts[i + 1] - posts[i]) / 2));
    const turn = -a + Math.PI / 2;
    pieces.push([p.clone().setY(0.07), [length, 0.14, 0.42], turn, marbleTrim]);
    pieces.push([p.clone().setY(1.1), [length, 0.13, 0.4], turn, marble]);
  }
  for (const material of [marble, marbleTrim]) { // 같은 재질끼리 한 번에 그리기
    const list = pieces.filter((piece) => piece[3] === material);
    const mesh = new THREE.InstancedMesh(box, material, list.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    list.forEach(([position, size, turn], i) => {
      q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, turn);
      mesh.setMatrixAt(i, m.compose(position, q, new THREE.Vector3(...size)));
    });
    scene.add(mesh);
  }

  const balusters = []; // 작은 난간 기둥 위치
  for (let i = 0; i < spans; i++) {
    const count = 6;
    for (let k = 1; k <= count; k++) balusters.push(posts[i] + ((posts[i + 1] - posts[i]) * k) / (count + 1));
  }
  const balusterMesh = new THREE.InstancedMesh(balusterGeometry(), marble, balusters.length);
  const m = new THREE.Matrix4();
  balusters.forEach((angle, i) => {
    const p = at(angle);
    balusterMesh.setMatrixAt(i, m.makeTranslation(p.x, 0.14, p.z));
  });
  scene.add(balusterMesh);

  addEventListener('resize', () => { // 화면 크기가 바뀌면 거울 해상도도 맞추기
    const r = renderer.getPixelRatio() * 0.5;
    floor.getRenderTarget().setSize(innerWidth * r, innerHeight * r);
  });

  return () => {}; // 테라스는 움직이지 않는다
}
