// 하늘, 구름, 산맥 셰이더가 같이 쓰는 GLSL 조각.
// 노이즈: 무작위처럼 보이지만 부드럽게 이어지는 값. 여러 크기를 겹친 것이 fbm이다.
export const NOISE = /* glsl */ ` // 노이즈 함수 묶음
  const vec3 HORIZON = vec3(0.150, 0.070, 0.180); // 지평선의 자줏빛

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
