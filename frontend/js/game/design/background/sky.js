// 낮 하늘: 카메라를 감싼 큰 구 안쪽에 셰이더로 그린다.
// 지평선은 거의 흰 하늘색, 위로 갈수록 맑은 파랑. 빛 기둥이 솟는 가운데 위쪽이 살짝 밝고, 옅은 새털구름이 흐른다.
import * as THREE from 'three';
import { NOISE } from '../../../design/shared/glsl.js';

const vertexShader = /* glsl */ ` // 하늘 모양 셰이더 (방향 전달)
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ ` // 하늘 색 셰이더 (하늘 색, 밝은 쪽, 새털구름)
  uniform vec3 uTop;
  uniform vec3 uMid;
  uniform vec3 uLow;
  uniform vec3 uBelow;
  uniform float uTime;
  varying vec3 vDir;
  ${NOISE}
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y; // 위로 갈수록 1, 지평선이 0

    vec3 col = mix(uLow, uMid, smoothstep(-0.02, 0.3, h));
    col = mix(col, uTop, smoothstep(0.3, 0.95, h));
    col = mix(col, uBelow, smoothstep(0.0, -0.1, h)); // 지평선 아래는 구름바다처럼 뿌옇게

    float glow = pow(max(dot(d, normalize(vec3(0.0, 0.28, -1.0))), 0.0), 5.0); // 빛 기둥 쪽이 밝게
    col = mix(col, vec3(0.92, 0.92, 1.0), glow * 0.35);

    if (h > 0.03) { // 새털구름: 옆으로 길게 늘인 노이즈
      vec2 p = vec2(atan(d.x, -d.z) * 2.6, h * 5.0);
      float n = fbm(vec2(p.x * 1.4 + uTime * 0.006, p.y * 5.0 + 3.0));
      float wisp = smoothstep(0.56, 0.86, n) * smoothstep(0.06, 0.22, h) * smoothstep(0.75, 0.32, h);
      col = mix(col, vec3(1.0), wisp * 0.4);
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function create({ scene, camera }) { // 하늘 만들기
  const uniforms = { // 셰이더에 넘길 값 (색은 css/game/base.css의 --sky-* 와 같다)
    uTop: { value: new THREE.Color(0x3a66d4) },
    uMid: { value: new THREE.Color(0x79a3ee) },
    uLow: { value: new THREE.Color(0xd4e5fb) },
    uBelow: { value: new THREE.Color(0xe9eefb) },
    uTime: { value: 0 },
  };
  const sky = new THREE.Mesh( // 카메라를 감싸는 큰 구
    new THREE.SphereGeometry(400, 64, 32),
    new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, side: THREE.BackSide, depthWrite: false }),
  );
  sky.renderOrder = -10;
  scene.add(sky);

  return (s, t) => { // 매 프레임: 하늘
    uniforms.uTime.value = t; // 새털구름이 흐르게
    sky.position.copy(camera.position); // 하늘은 늘 카메라를 감싼다
  };
}
