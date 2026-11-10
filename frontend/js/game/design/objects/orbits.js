// 궤도 고리: 가운데 카드를 비스듬히 감싸는 가는 빛 고리 두 개. 혜성처럼 밝은 머리가 꼬리를 끌며 돌고, 머리에는 별빛이 반짝인다.
// 뽑기 연출 중에는 기를 모을수록 빨라지고 밝아진다.
import * as THREE from 'three';
import { GLOW } from '../../../design/shared/materials.js';
import { UV_VERTEX } from '../../../design/shared/glsl.js';
import { sparkTexture } from '../shared/textures.js';
import { CARD_CENTER } from './cards.js';

const fragmentShader = /* glsl */ ` // 고리 색 셰이더 (희미한 고리 + 꼬리를 끄는 밝은 머리 두 개)
  uniform vec3 uColor;
  uniform float uPhase;
  uniform float uGain;
  varying vec2 vUv;
  void main() {
    float a = fract(vUv.x - uPhase); // 머리가 a = 1 쪽, 꼬리가 그 뒤로
    float b = fract(vUv.x - uPhase + 0.5);
    float light = 0.2 + pow(a, 4.0) * 0.55 + pow(a, 26.0) * 2.6 + pow(b, 30.0) * 1.4;
    gl_FragColor = vec4(uColor * light * uGain, 1.0);
  }
`;

// [반지름, 앞뒤로 눕힌 각도, 화면에서 기운 각도, 도는 빠르기]
const RINGS = [
  [3.25, 1.18, 0.42, 0.06], // 크게 비스듬히
  [2.6, 1.42, -0.1, -0.085], // 납작하게 가로로
];

export function create({ scene }) { // 궤도 고리 만들기
  const rings = RINGS.map(([radius, lie, lean, speed], k) => {
    const uniforms = { uColor: { value: new THREE.Color(0xe6e0ff) }, uPhase: { value: k * 0.37 }, uGain: { value: 1 } };
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.014, 6, 320),
      new THREE.ShaderMaterial({ ...GLOW, uniforms, vertexShader: UV_VERTEX, fragmentShader }),
    );
    ring.rotation.order = 'ZYX'; // 먼저 앞뒤로 눕히고, 그다음 화면에서 기울인다
    ring.rotation.set(lie, 0, lean);
    ring.position.copy(CARD_CENTER);
    ring.renderOrder = 2; // 카드 다음에 그려서 카드 뒤로 지나가는 부분은 가려진다
    scene.add(ring);

    const heads = [0, 0.5].map((offset) => { // 머리의 별빛
      const glint = new THREE.Sprite(new THREE.SpriteMaterial({ ...GLOW, map: sparkTexture(), color: new THREE.Color(1.4, 1.4, 1.55) }));
      glint.scale.setScalar(offset ? 0.55 : 0.85);
      glint.renderOrder = 2;
      scene.add(glint);
      return { glint, offset };
    });
    return { ring, uniforms, radius, speed, heads };
  });

  const spot = new THREE.Vector3();
  return (s, t, dt) => { // 매 프레임: 고리 돌리기
    for (const { ring, uniforms, radius, speed, heads } of rings) {
      uniforms.uPhase.value += dt * speed * (1 + s.charge * 9);
      uniforms.uGain.value = 1 + s.charge * 1.3 + s.flash * 1.5;
      ring.updateMatrixWorld();
      for (const { glint, offset } of heads) {
        const angle = (uniforms.uPhase.value + offset) * Math.PI * 2; // 머리가 있는 각도
        glint.position.copy(ring.localToWorld(spot.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0)));
        glint.material.rotation = t * 0.8;
      }
    }
  };
}
