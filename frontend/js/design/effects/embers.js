// 떠오르는 불씨와 반딧불: 점 560개를 셰이더 안에서 위로 흘려보낸다 (CPU 계산 없음).
// 각 점은 높이가 끝까지 올라가면 아래에서 다시 시작하고, 깜빡이며 좌우로 흔들린다.
import * as THREE from 'three';
import { GLOW } from '../shared/materials.js';

const COUNT = 560; // 불씨 개수
const PALETTE = [0xffb35a, 0xffd28a, 0xffc06b, 0xd8ff9a, 0xc8a6ff].map((c) => new THREE.Color(c)); // 불씨 색 (호박색, 금색, 연두, 보라)

const vertexShader = /* glsl */ ` // 불씨 위치 셰이더 (위로 흐르기, 흔들기, 깜빡이기)
  attribute float aSeed;
  attribute float aSize;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float travel = mod(p.y + 4.0 + uTime * 0.2 * (0.5 + aSeed), 10.0); // 높이 -4 ~ 6 사이를 돈다
    p.y = travel - 4.0;
    p.x += sin(uTime * 0.55 + aSeed * 23.0) * 0.35;
    p.z += cos(uTime * 0.45 + aSeed * 17.0) * 0.35;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float life = travel / 10.0;
    float twinkle = 0.45 + 0.55 * sin(uTime * (1.2 + aSeed * 3.0) + aSeed * 40.0);
    vAlpha = smoothstep(0.0, 0.12, life) * smoothstep(1.0, 0.85, life) * twinkle;
    vColor = aColor;
    gl_PointSize = aSize * uPixelRatio * (12.0 / -mv.z); // 가까울수록 크게
  }
`;

const fragmentShader = /* glsl */ ` // 불씨 색 셰이더 (둥글고 부드러운 점)
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5)); // 동그랗고 부드러운 점
    gl_FragColor = vec4(vColor * (0.5 + 1.8 * a * a), a * vAlpha * 0.9);
  }
`;

export function create({ scene, renderer }) { // 불씨 만들기
  const position = new Float32Array(COUNT * 3); // 처음 위치
  const color = new Float32Array(COUNT * 3); // 색
  const seed = new Float32Array(COUNT); // 저마다 다른 속도와 깜빡임
  const size = new Float32Array(COUNT); // 크기
  for (let i = 0; i < COUNT; i++) { // 불씨마다 값 정하기
    position.set([(Math.random() * 2 - 1) * 9, Math.random() * 10 - 4, (Math.random() * 2 - 1) * 6], i * 3);
    PALETTE[i % PALETTE.length].toArray(color, i * 3);
    seed[i] = Math.random();
    size[i] = 2 + Math.random() * 5;
  }
  const geometry = new THREE.BufferGeometry(); // 점 묶음
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1));

  const uniforms = { uTime: { value: 0 }, uPixelRatio: { value: renderer.getPixelRatio() } }; // 셰이더에 넘길 값 (선명도는 stage.js에서 정한 값)
  const points = new THREE.Points(geometry, new THREE.ShaderMaterial({ ...GLOW, uniforms, vertexShader, fragmentShader })); // 불씨 (빛을 더하듯 그려짐)
  points.frustumCulled = false;
  scene.add(points);

  return (s, t) => { // 매 프레임: 불씨
    uniforms.uTime.value = t; // 움직임은 셰이더가 시간으로 계산
  };
}
