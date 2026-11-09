// 내려치는 순간 사방으로 튀는 불꽃.
// 타임라인의 --pulse가 0에서 1로 뛰는 순간을 감지해 불꽃을 터뜨리고,
// 불꽃 하나하나는 중력과 공기 저항을 받으며 떨어지다 사라진다.
import * as THREE from 'three';
import { SWORD_Y } from '../objects/sword.js';

const COUNT = 900; // 한꺼번에 날 수 있는 불꽃 수
const WHITE = new THREE.Color(1, 1, 1); // 흰빛 (불꽃 색을 섞을 때)

const vertexShader = /* glsl */ ` // 불꽃 위치 셰이더 (사라질수록 작게)
  attribute float aAlpha;
  attribute float aSize;
  attribute vec3 aColor;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    vColor = aColor;
    vAlpha = aAlpha;
    gl_PointSize = aSize * uPixelRatio * (12.0 / -mv.z) * (0.4 + aAlpha);
  }
`;

const fragmentShader = /* glsl */ ` // 불꽃 색 셰이더 (가운데가 뜨거운 점)
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float a = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
    gl_FragColor = vec4(vColor * (0.8 + 1.6 * a * a), a * vAlpha);
  }
`;

export function create({ scene }) { // 불꽃 만들기
  const position = new Float32Array(COUNT * 3); // 위치
  const velocity = new Float32Array(COUNT * 3); // 속도
  const color = new Float32Array(COUNT * 3); // 색
  const alpha = new Float32Array(COUNT); // 투명도
  const size = new Float32Array(COUNT); // 크기
  const life = new Float32Array(COUNT); // 남은 수명
  const lifespan = new Float32Array(COUNT).fill(1); // 처음 수명

  const geometry = new THREE.BufferGeometry(); // 점 묶음
  const attribute = (array, n) => new THREE.BufferAttribute(array, n).setUsage(THREE.DynamicDrawUsage); // 매 프레임 바뀌는 값
  geometry.setAttribute('position', attribute(position, 3));
  geometry.setAttribute('aColor', attribute(color, 3));
  geometry.setAttribute('aAlpha', attribute(alpha, 1));
  geometry.setAttribute('aSize', attribute(size, 1));
  const points = new THREE.Points(geometry, new THREE.ShaderMaterial({ // 불꽃 (빛을 더하듯 그려짐)
    uniforms: { uPixelRatio: { value: Math.min(devicePixelRatio, 1.75) } },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
  points.frustumCulled = false;
  scene.add(points);

  let next = 0; // 다음에 쓸 불꽃 번호 (다 쓰면 처음부터 다시)
  let armed = true; // 한 번 터진 뒤 --pulse가 잦아들어야 다시 터질 수 있다
  const tint = new THREE.Color(); // 불꽃 하나의 색

  function burst(light, amount, power) { // 불꽃 터뜨리기
    for (let k = 0; k < amount; k++, next = (next + 1) % COUNT) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (1.8 + Math.random() * 3.4) * power;
      position.set([0, SWORD_Y - 1.6 + Math.random() * 2.5, 0], next * 3); // 칼날 어딘가에서
      velocity.set([Math.cos(angle) * speed, (0.15 + Math.random() * 0.85) * speed * 0.7, Math.sin(angle) * speed], next * 3); // 사방으로, 살짝 위로
      tint.copy(light).lerp(WHITE, Math.random() * 0.35).multiplyScalar(0.9 + Math.random() * 1.1).toArray(color, next * 3); // 등급 색 + 흰빛
      life[next] = lifespan[next] = 0.55 + Math.random(); // 0.5~1.5초 동안
      size[next] = 2 + Math.random() * 4; // 크기
    }
    geometry.attributes.aColor.needsUpdate = true;
    geometry.attributes.aSize.needsUpdate = true;
  }

  return (s, t, dt) => { // 매 프레임: 불꽃
    if (s.pulse > 0.6 && armed) { // 내려치는 순간 감지
      const finale = s.pulse > 1.1; // 5등급 순간에는 더 크게
      burst(s.light, finale ? 200 : 50 + s.level * 10, finale ? 1.6 : 1);
    }
    armed = s.pulse < 0.3;

    const drag = Math.max(0, 1 - 1.8 * dt); // 공기 저항
    for (let i = 0; i < COUNT; i++) { // 불꽃 하나씩 움직이기
      if (life[i] <= 0) {
        alpha[i] = 0;
        continue;
      }
      life[i] -= dt;
      velocity[i * 3] *= drag;
      velocity[i * 3 + 1] = velocity[i * 3 + 1] * drag - 3 * dt; // 중력
      velocity[i * 3 + 2] *= drag;
      for (let k = 0; k < 3; k++) position[i * 3 + k] += velocity[i * 3 + k] * dt; // 위치 이동
      alpha[i] = (Math.max(life[i], 0) / lifespan[i]) ** 1.3; // 수명이 줄수록 흐려짐
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aAlpha.needsUpdate = true;
  };
}
