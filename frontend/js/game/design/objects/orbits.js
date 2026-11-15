// 궤도 고리: 가운데 카드를 비스듬히 감싸는 가는 빛 고리 두 개. 혜성처럼 밝은 머리가 꼬리를 끌며 돌고, 머리에는 별빛이 반짝인다.
// 고리마다 타이틀 화면과 같은 룬 글자 띠가 흐르고, 큰 고리에는 다섯 등급 색 보석이 함께 돈다 (두 화면이 같은 세계로 보이게).
// 뽑기 연출 중에는 기를 모을수록 빨라지고 밝아진다.
import * as THREE from 'three';
import { GLOW } from '../../../design/shared/materials.js';
import { UV_VERTEX } from '../../../design/shared/glsl.js';
import { runeBandTexture } from '../../../design/objects/grimoire-textures.js';
import { glowTexture } from '../../../design/shared/textures.js';
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
const BAND_COLOR = new THREE.Color(0x8e98d6); // 룬 띠 색 (달빛 파랑, 은은하게)
const css = getComputedStyle(document.documentElement);
const GRADES = [1, 2, 3, 4, 5].map((i) => new THREE.Color(css.getPropertyValue(`--g${i}`).trim())); // 다섯 등급 색 (css/tokens.css)

export function create({ scene }) { // 궤도 고리 만들기
  const band = runeBandTexture(); // 룬 띠 그림 (타이틀의 등급 룬 띠와 같은 그림)
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

    const map = band.clone(); // 흐르는 위치만 따로
    map.repeat.x = Math.round((Math.PI * 2 * radius) / 3);
    map.needsUpdate = true;
    const runes = new THREE.Mesh( // 고리를 따라 흐르는 룬 글자 띠
      new THREE.CylinderGeometry(radius, radius, 0.13, 256, 1, true).rotateX(Math.PI / 2), // 고리와 같은 면에 눕힌 띠
      new THREE.MeshBasicMaterial({ ...GLOW, map, side: THREE.DoubleSide, color: BAND_COLOR.clone() }),
    );
    runes.renderOrder = 2;
    ring.add(runes);

    const heads = [0, 0.5].map((offset) => { // 머리의 별빛
      const glint = new THREE.Sprite(new THREE.SpriteMaterial({ ...GLOW, map: sparkTexture(), color: new THREE.Color(1.4, 1.4, 1.55) }));
      glint.scale.setScalar(offset ? 0.55 : 0.85);
      glint.renderOrder = 2;
      scene.add(glint);
      return { glint, offset };
    });
    return { ring, uniforms, radius, speed, heads, map, runes };
  });

  const gems = GRADES.map((color) => { // 큰 고리를 따라 도는 다섯 등급 색 보석 (등급 색 빛무리 + 반짝이는 심)
    const gem = new THREE.Group();
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ ...GLOW, map: glowTexture(), color: color.clone().multiplyScalar(1.2) }));
    aura.scale.setScalar(0.9);
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ ...GLOW, map: sparkTexture(), color: color.clone().multiplyScalar(2.4) }));
    core.scale.setScalar(0.75);
    aura.renderOrder = core.renderOrder = 2;
    gem.add(aura, core);
    gem.userData.core = core;
    scene.add(gem);
    return gem;
  });

  const spot = new THREE.Vector3();
  return (s, t, dt) => { // 매 프레임: 고리 돌리기
    for (const { ring, uniforms, radius, speed, heads, map, runes } of rings) {
      uniforms.uPhase.value += dt * speed * (1 + s.charge * 9);
      uniforms.uGain.value = 1 + s.charge * 1.3 + s.flash * 1.5;
      map.offset.x -= dt * speed * 0.6 * (1 + s.charge * 6); // 룬 글자가 고리를 따라 흐른다
      runes.material.color.copy(BAND_COLOR).multiplyScalar(0.55 + s.charge * 0.8 + s.flash);
      ring.updateMatrixWorld();
      for (const { glint, offset } of heads) {
        const angle = (uniforms.uPhase.value + offset) * Math.PI * 2; // 머리가 있는 각도
        glint.position.copy(ring.localToWorld(spot.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0)));
        glint.material.rotation = t * 0.8;
      }
    }

    const big = rings[0]; // 큰 고리
    gems.forEach((gem, i) => {
      const angle = -big.uniforms.uPhase.value * Math.PI * 2 * 0.6 + (i / gems.length) * Math.PI * 2; // 머리와 반대로 천천히
      gem.position.copy(big.ring.localToWorld(spot.set(Math.cos(angle) * big.radius, Math.sin(angle) * big.radius, 0)));
      gem.userData.core.material.rotation = t * 0.5 + i;
      gem.scale.setScalar(1 + Math.sin(t * 1.6 + i * 1.3) * 0.12 + s.charge * 0.4); // 숨 쉬듯 커졌다 작아짐
    });
  };
}
