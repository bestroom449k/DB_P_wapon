// 강화 충격파: 내려치는 순간 고리가 정렬되는 면과 섬 바닥에서 빛 고리가 퍼진다.
// 타임라인의 --burst(0→1)를 그대로 크기와 투명도로 쓴다.
import * as THREE from 'three';
import { SWORD_Y } from '../objects/sword.js';
import { ISLAND_TOP } from '../objects/island.js';

const vertexShader = /* glsl */ ` // 충격파 판 셰이더 (UV 전달)
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// 평면 위에 테두리가 부드러운 고리 하나를 그린다
const fragmentShader = /* glsl */ ` // 충격파 고리 셰이더
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uWidth;
  varying vec2 vUv;
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    float ring = exp(-pow((r - 0.86) / uWidth, 2.0));
    float fill = smoothstep(0.86, 0.0, r) * 0.12;
    gl_FragColor = vec4(uColor * 1.4, (ring + fill) * uOpacity * step(r, 1.0));
  }
`;

export function create({ scene }) { // 충격파 만들기
  const wave = (y, tilt, width, size) => { // 충격파 한 겹
    const uniforms = { uColor: { value: new THREE.Color() }, uOpacity: { value: 0 }, uWidth: { value: width } };
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    );
    mesh.position.y = y;
    mesh.rotation.x = tilt;
    scene.add(mesh);
    return { mesh, uniforms, size };
  };
  const waves = [wave(SWORD_Y, Math.PI / 2 + 0.38, 0.03, 6.4), wave(ISLAND_TOP + 0.03, -Math.PI / 2, 0.035, 5.6)]; // 공중 충격파, 바닥 충격파

  return (s) => { // 매 프레임: 충격파
    const bigger = 1 + s.finale * 0.6; // 5등급에서는 더 크게
    for (const { mesh, uniforms, size } of waves) {
      mesh.visible = s.burst < 0.999; // 다 퍼지면 숨기기
      mesh.scale.setScalar((0.4 + s.burst * size) * bigger); // 퍼지는 크기
      uniforms.uOpacity.value = 1 - s.burst; // 퍼질수록 흐려짐
      uniforms.uColor.value.copy(s.light); // 등급 색
    }
  };
}
