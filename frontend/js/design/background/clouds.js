// 구름바다: 섬 아래로 펼쳐진 큰 평면에 노이즈 구름을 천천히 흘려보낸다.
// 섬 근처는 등급 색으로 물들고, 멀어질수록 지평선 색에 녹아든다.
import * as THREE from 'three';
import { NOISE } from '../shared/glsl.js';

const vertexShader = /* glsl */ ` // 구름 모양 셰이더 (월드 좌표 전달)
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragmentShader = /* glsl */ ` // 구름 색 셰이더 (흐르는 구름, 섬 아래 빛)
  uniform float uTime;
  uniform vec3 uTint;
  varying vec3 vWorld;
  ${NOISE}
  void main() {
    vec2 p = vWorld.xz * 0.045;
    float n = fbm(p + vec2(uTime * 0.010, uTime * 0.004));
    float n2 = fbm(p * 2.7 + vec2(-uTime * 0.018, uTime * 0.007) + n);
    float cloud = smoothstep(0.34, 0.78, n * 0.65 + n2 * 0.45);
    vec3 col = mix(vec3(0.014, 0.018, 0.042), vec3(0.13, 0.155, 0.26), cloud * cloud); // 구름 사이 → 구름 꼭대기 (차가운 남색)
    col += uTint * exp(-length(vWorld.xz) * 0.16) * 0.45 * cloud; // 섬 아래로 번지는 등급 빛
    float dist = length(vWorld.xz - cameraPosition.xz);
    col = mix(col, HORIZON * 0.85, smoothstep(30.0, 110.0, dist));
    gl_FragColor = vec4(col, mix(0.6, 1.0, cloud) * smoothstep(125.0, 90.0, dist));
  }
`;

export function create({ scene }) { // 구름바다 만들기
  const uniforms = { uTime: { value: 0 }, uTint: { value: new THREE.Color() } }; // 셰이더에 넘길 값 (시간, 등급 색)
  const sea = new THREE.Mesh( // 섬 아래 넓은 바닥 판
    new THREE.PlaneGeometry(260, 260),
    new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -6.5;
  scene.add(sea);

  return (s, t) => { // 매 프레임: 구름바다
    uniforms.uTime.value = t; // 구름이 흐르게
    uniforms.uTint.value.copy(s.light);
  };
}
