// 먼 산맥 두 겹: 커다란 원통의 안쪽 면에 노이즈로 들쭉날쭉한 능선을 깎는다.
// 뒤쪽 산일수록 지평선 색에 더 많이 섞여 안개 낀 것처럼 보인다.
import * as THREE from 'three';
import { NOISE, UV_VERTEX as vertexShader } from '../shared/glsl.js'; // 산 모양 셰이더는 공용 (UV 전달)

const fragmentShader = /* glsl */ ` // 산 색 셰이더 (능선 깎기)
  uniform float uSeed;
  uniform float uHaze;
  uniform vec3 uColor;
  varying vec2 vUv;
  ${NOISE}
  void main() {
    float x = vUv.x * 40.0 + uSeed;
    float ridge = 0.28 + fbm(vec2(x * 0.35, uSeed)) * 0.5 + vnoise(vec2(x * 2.5, uSeed)) * 0.05;
    if (vUv.y > ridge) discard; // 능선 위는 비워 하늘이 보이게
    vec3 col = mix(uColor, HORIZON, uHaze + vUv.y * 0.25);
    col += vec3(0.40, 0.48, 0.72) * smoothstep(ridge - 0.035, ridge, vUv.y) * 0.09; // 능선의 희미한 테두리 빛
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function create({ scene }) { // 산맥 만들기
  const layers = [
    { radius: 135, seed: 7.7, color: 0x131a2e, haze: 0.55, y: -3 }, // 뒷산 (흐릿함)
    { radius: 95, seed: 3.1, color: 0x080b1a, haze: 0.28, y: -4 }, // 앞산 (짙음)
  ];
  for (const { radius, seed, color, haze, y } of layers) { // 산 한 겹씩
    const uniforms = { uSeed: { value: seed }, uHaze: { value: haze }, uColor: { value: new THREE.Color(color) } };
    const ridge = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius, 26, 200, 1, true),
      new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, side: THREE.BackSide }),
    );
    ridge.position.y = y;
    scene.add(ridge);
  }
  return () => {}; // 산은 움직이지 않는다
}
