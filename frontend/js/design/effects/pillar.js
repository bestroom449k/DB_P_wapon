// 5등급에 섬에서 하늘로 솟는 빛 기둥. 타임라인의 --finale(0→1→0)에 따라 나타났다 사라진다.
// 기둥 가운데가 밝고 가장자리와 위쪽은 흐려지며, 빛줄기가 위로 흐른다.
import * as THREE from 'three';
import { ISLAND_TOP } from '../objects/island.js';
import { GLOW } from '../shared/materials.js';

const vertexShader = /* glsl */ ` // 빛 기둥 모양 셰이더 (면 방향 전달)
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ ` // 빛 기둥 색 셰이더 (흐르는 빛줄기)
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float facing = abs(dot(normalize(vNormal), normalize(vView))); // 정면일수록 1
    float fade = pow(1.0 - vUv.y, 1.8) * smoothstep(0.0, 0.03, vUv.y);
    float streak = 0.65 + 0.35 * sin(vUv.x * 75.0 + uTime * 5.0) * sin(vUv.y * 18.0 - uTime * 9.0);
    gl_FragColor = vec4(uColor * 1.6, fade * uOpacity * (0.25 + 0.75 * facing) * streak);
  }
`;

export function create({ scene }) { // 빛 기둥 만들기
  const uniforms = { uColor: { value: new THREE.Color() }, uOpacity: { value: 0 }, uTime: { value: 0 } }; // 셰이더에 넘길 값
  const geometry = new THREE.CylinderGeometry(0.55, 1.15, 16, 64, 1, true); // 위가 좁은 원통
  geometry.translate(0, 8, 0); // 바닥이 섬 윗면에 오도록
  const pillar = new THREE.Mesh(geometry, new THREE.ShaderMaterial({ ...GLOW, uniforms, vertexShader, fragmentShader, side: THREE.DoubleSide })); // 빛 기둥
  pillar.position.y = ISLAND_TOP;
  scene.add(pillar);

  return (s, t) => { // 매 프레임: 빛 기둥
    pillar.visible = s.finale > 0.002; // 5등급 때만 보이기
    uniforms.uTime.value = t; // 빛줄기가 흐르게
    uniforms.uColor.value.copy(s.light); // 무지갯빛
    uniforms.uOpacity.value = s.finale * 0.25; // 나타났다 사라지기 (책을 가리지 않을 만큼만)
    const breathe = 1 + Math.sin(t * 9) * 0.04; // 굵기가 살짝 떨림
    pillar.scale.set(breathe, 1, breathe);
  };
}
