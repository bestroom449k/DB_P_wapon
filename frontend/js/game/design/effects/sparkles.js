// 반짝이: 카드 둘레에서 깜빡이는 네 갈래 별 90개, 마법진에서 천천히 떠오르는 빛가루 220개 (셰이더 안에서 움직임, CPU 계산 없음).
// 그리고 고리와 기둥 둘레에 큰 별빛 여섯 개. 뽑기 연출 중에는 빛가루가 빨리 솟는다.
import * as THREE from 'three';
import { GLOW } from '../../../design/shared/materials.js';
import { random } from '../shared/random.js';
import { sparkTexture } from '../shared/textures.js';
import { CARD_CENTER } from '../objects/cards.js';

const STARS = 90; // 깜빡이는 별 수
const DUST = 220; // 떠오르는 빛가루 수
const RISE = 9; // 빛가루가 올라가는 높이

const vertexShader = /* glsl */ ` // 위치 셰이더 (별은 깜빡이고, 빛가루는 떠오른다)
  attribute float aSeed;
  attribute float aSize;
  attribute float aStar;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uCharge;
  varying float vAlpha;
  varying float vStar;
  void main() {
    vec3 p = position;
    float alpha;
    if (aStar > 0.5) {
      alpha = pow(0.5 + 0.5 * sin(uTime * (0.7 + aSeed * 2.2) + aSeed * 60.0), 3.0); // 깜빡임
    } else {
      float travel = mod(p.y + uTime * (0.22 + aSeed * 0.3) * (1.0 + uCharge * 4.0), ${RISE.toFixed(1)});
      p.y = travel;
      p.x += sin(uTime * 0.5 + aSeed * 20.0) * 0.3;
      float life = travel / ${RISE.toFixed(1)};
      alpha = smoothstep(0.0, 0.1, life) * smoothstep(1.0, 0.6, life) * (0.5 + 0.5 * sin(uTime * 2.0 + aSeed * 30.0));
    }
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    vAlpha = alpha;
    vStar = aStar;
    gl_PointSize = aSize * uPixelRatio * (14.0 / -mv.z) * (aStar > 0.5 ? 0.5 + alpha : 1.0);
  }
`;

const fragmentShader = /* glsl */ ` // 색 셰이더 (별은 네 갈래, 빛가루는 둥글게)
  uniform vec3 uColor;
  varying float vAlpha;
  varying float vStar;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float shape;
    if (vStar > 0.5) {
      vec2 a = abs(c);
      shape = exp(-a.x * 70.0) * exp(-a.y * 7.0) + exp(-a.y * 70.0) * exp(-a.x * 7.0) + exp(-dot(c, c) * 120.0) * 1.2;
    } else {
      shape = smoothstep(0.5, 0.0, length(c));
      shape *= shape;
    }
    gl_FragColor = vec4(uColor * shape * vAlpha * 1.1, 1.0);
  }
`;

// 큰 별빛 자리 (가운데 카드 기준)
const BIG = [[0.1, 2.7, 0], [-1.8, 1.4, 0.2], [2.1, -1.2, 0.4], [0.3, -2.6, 0.7], [-3.3, -0.8, -0.3], [2.8, 1.9, -0.6]];

export function create({ scene, renderer }) { // 반짝이 만들기
  const rand = random(17);
  const total = STARS + DUST;
  const position = new Float32Array(total * 3);
  const seed = new Float32Array(total);
  const size = new Float32Array(total);
  const star = new Float32Array(total);
  const near = () => (rand() + rand() + rand()) / 3 - 0.5; // 가운데에 몰린 무작위 수 (-0.5 ~ 0.5)
  for (let i = 0; i < total; i++) {
    const isStar = i < STARS;
    if (isStar) position.set([near() * 17, CARD_CENTER.y + near() * 8, CARD_CENTER.z + near() * 6], i * 3);
    else position.set([near() * 12, rand() * RISE, CARD_CENTER.z + near() * 8], i * 3);
    seed[i] = rand();
    size[i] = isStar ? 8 + rand() * 16 : 2 + rand() * 4;
    star[i] = isStar ? 1 : 0;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geometry.setAttribute('aStar', new THREE.BufferAttribute(star, 1));
  const uniforms = {
    uTime: { value: 0 },
    uPixelRatio: { value: renderer.getPixelRatio() },
    uCharge: { value: 0 },
    uColor: { value: new THREE.Color(0xf1edff) },
  };
  const points = new THREE.Points(geometry, new THREE.ShaderMaterial({ ...GLOW, uniforms, vertexShader, fragmentShader }));
  points.frustumCulled = false;
  points.renderOrder = 4;
  scene.add(points);

  const big = BIG.map(([x, y, z], k) => { // 큰 별빛
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ ...GLOW, map: sparkTexture(), color: new THREE.Color(1.25, 1.25, 1.4) }));
    sprite.position.copy(CARD_CENTER).add(new THREE.Vector3(x, y, z));
    sprite.userData.phase = k * 1.7;
    sprite.renderOrder = 4;
    scene.add(sprite);
    return sprite;
  });

  return (s, t) => { // 매 프레임: 반짝이
    uniforms.uTime.value = t;
    uniforms.uCharge.value = s.charge;
    for (const sprite of big) {
      const twinkle = 0.5 + 0.5 * Math.sin(t * 1.1 + sprite.userData.phase);
      sprite.scale.setScalar(0.35 + twinkle * 0.5 + s.charge * 0.5);
      sprite.material.rotation = Math.sin(t * 0.3 + sprite.userData.phase) * 0.2;
    }
  };
}
