// 여러 셰이더가 같이 쓰는 GLSL 조각.

// 평면용 꼭짓점 셰이더: 위치를 그대로 그리고, 판 위의 좌표(UV)만 색 셰이더에 넘긴다 (산맥, 충격파, 마무리 화면)
export const UV_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// 노이즈: 무작위처럼 보이지만 부드럽게 이어지는 값. 여러 크기를 겹친 것이 fbm이다. (하늘, 구름, 산맥)
export const NOISE = /* glsl */ ` // 노이즈 함수 묶음
  const vec3 HORIZON = vec3(0.070, 0.082, 0.128); // 지평선의 차가운 남회색 (등급 색이 가장 진한 색이 되도록 채도를 낮춤)

  float hash12(vec2 p) { // 2D 좌표 → 무작위 값
    vec3 p3 = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float hash13(vec3 p3) { // 3D 좌표 → 무작위 값
    p3 = fract(p3 * .1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
  }
  float vnoise(vec2 p) { // 부드러운 노이즈
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
               mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) { // 여러 크기 노이즈 겹치기 (구름, 오로라, 능선)
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 5; i++) {
      v += a * vnoise(p);
      p = m * p;
      a *= 0.5;
    }
    return v;
  }
`;
