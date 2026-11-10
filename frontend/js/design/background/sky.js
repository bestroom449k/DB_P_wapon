// 밤하늘: 카메라를 감싼 큰 구 안쪽에 셰이더로 그린다.
// 아래는 차가운 남회색, 위는 짙은 남색이고, 그 위에 흰빛 파랑 오로라 커튼, 반짝이는 별, 작은 달을 얹는다.
// 하늘은 채도를 낮게 두어, 화면에서 가장 진한 색은 늘 무기 등급 색이 되게 한다.
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

    // 하늘 색: 지평선의 남회색 → 중간 남색 → 꼭대기 거의 검은 남색
    vec3 mid = vec3(0.026, 0.034, 0.078);
    vec3 col = mix(HORIZON, mid, smoothstep(-0.02, 0.22, h));
    col = mix(col, vec3(0.008, 0.011, 0.034), smoothstep(0.22, 0.85, h));
    col = mix(col, mid * 0.7, smoothstep(0.0, -0.3, h));

    if (h > 0.0) { // 오로라와 별은 지평선 위에만 있으니 아래쪽은 계산을 건너뛴다
      // 오로라 커튼: 아래 가장자리는 또렷하고 위로 갈수록 빛살이 흩어진다
      float az = atan(d.z, d.x);
      float warp = fbm(vec2(az * 1.3 + uTime * 0.01, 2.3));
      float above = h - (0.12 + (warp - 0.5) * 0.2);
      float shape = smoothstep(-0.012, 0.012, above) * exp(-max(above, 0.0) / 0.11);
      float rays = smoothstep(0.32, 0.82, fbm(vec2(az * 17.0 + warp * 4.0 + uTime * 0.03, uTime * 0.025)));
      float patchy = smoothstep(0.3, 0.68, fbm(vec2(az * 0.9 + 3.0, uTime * 0.004)));
      vec3 aurora = mix(vec3(0.78, 0.88, 1.0), vec3(0.36, 0.52, 0.95), smoothstep(0.0, 0.16, above)); // 아래 가장자리는 흰빛, 위로 갈수록 차가운 파랑
      col += mix(aurora, uTint, 0.2) * shape * (0.2 + 0.8 * rays) * patchy * 0.42;

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
    }

    // 달과 달무리: 작고 차가운 빛 (5등급 성광의 따뜻한 흰빛과 겹치지 않게)
    float md = max(dot(d, normalize(vec3(0.186, 0.225, -0.957))), 0.0);
    col += vec3(0.86, 0.90, 1.0) * smoothstep(0.99993, 0.99997, md) * 1.0;
    col += vec3(0.62, 0.70, 1.0) * (pow(md, 80.0) * 0.06 + pow(md, 10.0) * 0.012);

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
