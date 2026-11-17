// 룬 마법진 퍼짐: 룬이 새겨지는 순간, 룬 띠가 눕는 면에 룬 마법진이 찍히며 퍼지고, 제단 바닥에서는 빛 고리가 퍼진다.
// 타임라인의 --burst(0→1)를 그대로 크기와 투명도로 쓴다.
import * as THREE from 'three';
import { BOOK_Y } from '../objects/grimoire.js';
import { runeCircleTexture } from '../../shared/grimoire-textures.js';
import { ISLAND_TOP } from '../objects/island.js';
import { FLAT_TILT } from '../objects/rings.js';
import { UV_VERTEX as vertexShader } from '../../shared/glsl.js'; // 바닥 고리 판 셰이더는 공용 (UV 전달)
import { GLOW } from '../../shared/materials.js';

// 바닥 빛 고리: 평면 위에 테두리가 부드러운 고리 하나를 그린다
const fragmentShader = /* glsl */ ` // 빛 고리 셰이더
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    float ring = exp(-pow((r - 0.86) / 0.035, 2.0));
    float fill = smoothstep(0.86, 0.0, r) * 0.12;
    gl_FragColor = vec4(uColor * 1.4, (ring + fill) * uOpacity * step(r, 1.0));
  }
`;

export function create({ scene }) { // 룬 마법진과 빛 고리 만들기
  const seal = new THREE.Mesh( // 공중에 찍히는 룬 마법진
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ ...GLOW, map: runeCircleTexture(), side: THREE.DoubleSide, toneMapped: false }),
  );
  seal.position.y = BOOK_Y;
  seal.rotation.x = FLAT_TILT;
  scene.add(seal);

  const uniforms = { uColor: { value: new THREE.Color() }, uOpacity: { value: 0 } };
  const ring = new THREE.Mesh( // 제단 바닥 빛 고리
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({ ...GLOW, uniforms, vertexShader, fragmentShader, side: THREE.DoubleSide }),
  );
  ring.position.y = ISLAND_TOP + 0.03;
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);

  return (s) => { // 매 프레임: 퍼짐
    const bigger = 1 + s.finale * 0.6; // 빛 기둥이 솟을 때는 더 크게
    const fade = 1 - s.burst; // 퍼질수록 흐려짐
    seal.visible = ring.visible = s.burst < 0.999; // 다 퍼지면 숨기기
    seal.scale.setScalar((1.2 + s.burst * 4.2) * bigger); // 찍힌 자리에서 바깥으로 퍼진다
    seal.rotation.z = s.burst * 0.8; // 퍼지며 살짝 돈다
    seal.material.color.copy(s.light).multiplyScalar(1.6 * fade * fade);
    ring.scale.setScalar((0.4 + s.burst * 5.6) * bigger);
    uniforms.uOpacity.value = fade;
    uniforms.uColor.value.copy(s.light); // 등급 색
  };
}
