// 밤하늘: 카메라를 감싼 큰 구 안쪽에 셰이더로 그린다.
// 아래는 자줏빛, 위는 짙은 남색이고, 그 위에 오로라 커튼, 반짝이는 별, 달을 얹는다.
import * as THREE from 'three';
import { NOISE } from '../shared/glsl.js';

const vertexShader = /* glsl */ ` // 하늘 모양 셰이더 (방향 전달)
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ ` // 하늘 색 셰이더 (하늘, 오로라, 별, 달)
  uniform float uTime;
  uniform vec3 uTint;
  varying vec3 vDir;
  ${NOISE}
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y; // 위로 갈수록 1, 지평선이 0

    // 하늘 색: 지평선의 자줏빛 → 중간 남보라 → 꼭대기 짙은 남색
    vec3 mid = vec3(0.036, 0.030, 0.115);
    vec3 col = mix(HORIZON, mid, smoothstep(-0.02, 0.22, h));
    col = mix(col, vec3(0.010, 0.014, 0.055), smoothstep(0.22, 0.85, h));
    col = mix(col, mid * 0.7, smoothstep(0.0, -0.3, h));

    // 오로라 커튼: 아래 가장자리는 또렷하고 위로 갈수록 빛살이 흩어진다
    float az = atan(d.z, d.x);
    float warp = fbm(vec2(az * 1.3 + uTime * 0.01, 2.3));
    float above = h - (0.12 + (warp - 0.5) * 0.2);
    float shape = smoothstep(-0.012, 0.012, above) * exp(-max(above, 0.0) / 0.11);
    float rays = smoothstep(0.32, 0.82, fbm(vec2(az * 17.0 + warp * 4.0 + uTime * 0.03, uTime * 0.025)));
    float patchy = smoothstep(0.3, 0.68, fbm(vec2(az * 0.9 + 3.0, uTime * 0.004)));
    vec3 aurora = mix(vec3(0.16, 0.95, 0.68), vec3(0.6, 0.36, 1.0), smoothstep(0.0, 0.16, above));
    col += mix(aurora, uTint, 0.25) * shape * (0.2 + 0.8 * rays) * patchy * 0.75;

    // 별: 하늘을 작은 칸으로 나눠 몇몇 칸에만 반짝이는 점을 찍는다
    vec3 g = d * 210.0;
    vec3 id = floor(g);
    float r = hash13(id);
    if (r > 0.982) {
      vec3 offset = (vec3(hash13(id + 1.7), hash13(id + 4.3), hash13(id + 7.9)) - 0.5) * 0.5;
      float star = smoothstep(0.17, 0.0, length(fract(g) - 0.5 - offset));
      float twinkle = 0.55 + 0.45 * sin(uTime * (0.8 + r * 40.0) + r * 300.0);
      vec3 tone = mix(vec3(1.0, 0.86, 0.70), vec3(0.75, 0.85, 1.0), hash13(id + 9.1));
      col += tone * star * twinkle * smoothstep(0.02, 0.25, h) * 1.7;
    }

    // 달과 달무리
    float md = max(dot(d, normalize(vec3(0.186, 0.225, -0.957))), 0.0);
    col += vec3(1.0, 0.96, 0.88) * smoothstep(0.99955, 0.99975, md) * 2.4;
    col += vec3(0.62, 0.70, 1.0) * (pow(md, 80.0) * 0.12 + pow(md, 10.0) * 0.02);

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function create({ scene, camera }) { // 하늘 만들기
  const uniforms = { uTime: { value: 0 }, uTint: { value: new THREE.Color() } }; // 셰이더에 넘길 값 (시간, 등급 색)
  const sky = new THREE.Mesh( // 카메라를 감싸는 큰 구
    new THREE.SphereGeometry(150, 64, 32),
    new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, side: THREE.BackSide, depthWrite: false }),
  );
  sky.renderOrder = -10;
  scene.add(sky);

  return (s, t) => { // 매 프레임: 하늘
    uniforms.uTime.value = t; // 오로라와 별이 흐르게
    uniforms.uTint.value.copy(s.light); // 오로라가 등급 색을 살짝 띤다
    sky.position.copy(camera.position); // 하늘은 늘 카메라를 감싼다
  };
}
