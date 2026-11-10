// 빛 기둥: 하늘에서 가운데 카드 뒤를 지나 바닥까지 내리꽂히는 흰 빛. 바닥에 닿는 곳에서는 가로로 빛이 번진다.
// 늘 카메라 쪽을 보는 판에 셰이더로 그린다. 뽑기 연출 중에는 굵어지고 밝아진다.
import * as THREE from 'three';
import { GLOW } from '../../../design/shared/materials.js';
import { UV_VERTEX } from '../../../design/shared/glsl.js';
import { glowTexture } from '../../../design/shared/textures.js';
import { CARD_CENTER } from '../objects/cards.js';

const beamShader = /* glsl */ ` // 기둥 색 셰이더 (가는 심지 + 부드러운 빛 + 위로 흐르는 결)
  uniform vec3 uColor;
  uniform float uGain;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float x = vUv.x - 0.5;
    float h = vUv.y; // 0 바닥 ~ 1 꼭대기
    float flow = 0.85 + 0.15 * sin(h * 70.0 - uTime * 3.0 + sin(x * 30.0 + uTime));
    float light = exp(-x * x * 2600.0) * 2.4 + exp(-x * x * 200.0) * 0.32 * flow + exp(-x * x * 26.0) * 0.05;
    light *= smoothstep(0.0, 0.012, h) * mix(1.0, 0.55, h);
    gl_FragColor = vec4(uColor * light * uGain, 1.0);
  }
`;

const flareShader = /* glsl */ ` // 바닥 섬광 셰이더 (가로로 긴 빛줄기 + 둥근 심)
  uniform vec3 uColor;
  uniform float uGain;
  varying vec2 vUv;
  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float streak = exp(-p.y * p.y * 120.0) * exp(-p.x * p.x * 3.6) * 0.5;
    float core = exp(-dot(p * vec2(9.0, 2.2), p * vec2(9.0, 2.2))) * 0.7;
    gl_FragColor = vec4(uColor * (streak + core) * uGain, 1.0);
  }
`;

const BEAM_Z = CARD_CENTER.z - 0.6; // 가운데 카드 바로 뒤

export function create({ scene, camera }) { // 빛 기둥 만들기
  const color = new THREE.Color(0xeee9ff);
  const beamUniforms = { uColor: { value: color }, uGain: { value: 1 }, uTime: { value: 0 } };
  const beamGeometry = new THREE.PlaneGeometry(3.4, 40);
  beamGeometry.translate(0, 20, 0); // 바닥에서 위로
  const beam = new THREE.Mesh(beamGeometry, new THREE.ShaderMaterial({ ...GLOW, uniforms: beamUniforms, vertexShader: UV_VERTEX, fragmentShader: beamShader }));
  beam.position.set(0, 0, BEAM_Z);
  beam.renderOrder = 3; // 카드 다음에 (가운데 카드가 기둥을 가린다)

  const flareUniforms = { uColor: { value: color }, uGain: { value: 1 } };
  const flare = new THREE.Mesh(new THREE.PlaneGeometry(18, 1.4), new THREE.ShaderMaterial({ ...GLOW, uniforms: flareUniforms, vertexShader: UV_VERTEX, fragmentShader: flareShader }));
  flare.position.set(0, 0.08, BEAM_Z);
  flare.renderOrder = 3;

  const foot = new THREE.Sprite(new THREE.SpriteMaterial({ ...GLOW, map: glowTexture(), color: new THREE.Color(0xd8d0ff) })); // 바닥에 닿는 곳의 둥근 빛
  foot.scale.set(3.6, 1.6, 1);
  foot.position.set(0, 0.2, BEAM_Z);
  scene.add(beam, flare, foot);

  return (s, t) => { // 매 프레임: 빛 기둥
    const face = Math.atan2(camera.position.x - beam.position.x, camera.position.z - beam.position.z); // 카메라 쪽으로 돌리기 (세로축만)
    beam.rotation.y = face;
    flare.rotation.y = face;
    const gain = 1 + s.charge * 0.6 + s.flash * 2;
    beamUniforms.uTime.value = t;
    beamUniforms.uGain.value = gain;
    flareUniforms.uGain.value = gain * (0.9 + Math.sin(t * 2.1) * 0.08);
    beam.scale.x = 1 + s.charge * 0.25 + s.flash * 1.2;
    foot.material.opacity = 0.22 + s.charge * 0.2;
  };
}
