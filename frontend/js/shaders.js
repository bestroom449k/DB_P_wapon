// 장면에 쓰는 GLSL 셰이더 모음. 하늘, 구름바다, 산맥, 입자, 빛 기둥, 후처리.

const NOISE = /* glsl */ `
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float hash13(vec3 p3) {
    p3 = fract(p3 * .1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
               mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
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

const HORIZON = /* glsl */ `
  vec3 horizonColor(float day) {
    return mix(vec3(0.150, 0.070, 0.180), vec3(0.780, 0.390, 0.330), day);
  }
`;

export const skyShader = {
  vertex: /* glsl */ `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragment: /* glsl */ `
    uniform float uTime;
    uniform float uDay;
    uniform float uStorm;
    uniform float uFlash;
    uniform vec3 uTint;
    uniform vec3 uMoonDir;
    varying vec3 vDir;
    ${NOISE}
    ${HORIZON}
    void main() {
      vec3 d = normalize(vDir);
      float h = d.y;

      vec3 top = mix(vec3(0.010, 0.014, 0.055), vec3(0.060, 0.080, 0.230), uDay);
      vec3 mid = mix(vec3(0.036, 0.030, 0.115), vec3(0.220, 0.140, 0.320), uDay);
      vec3 hor = horizonColor(uDay);
      vec3 col = mix(hor, mid, smoothstep(-0.02, 0.22, h));
      col = mix(col, top, smoothstep(0.22, 0.85, h));
      col = mix(col, mid * 0.7, smoothstep(0.0, -0.3, h));
      col = mix(col, col * 0.55 + vec3(0.02), uStorm * 0.6);

      // 오로라 커튼: 아래 가장자리는 또렷하고 위로 갈수록 빛살이 흩어진다
      float az = atan(d.z, d.x);
      float warp = fbm(vec2(az * 1.3 + uTime * 0.01, 2.3));
      float bandY = 0.12 + (warp - 0.5) * 0.2;
      float above = h - bandY;
      float shape = smoothstep(-0.012, 0.012, above) * exp(-max(above, 0.0) / 0.11);
      float rays = smoothstep(0.32, 0.82, fbm(vec2(az * 17.0 + warp * 4.0 + uTime * 0.03, uTime * 0.025)));
      float patchy = smoothstep(0.3, 0.68, fbm(vec2(az * 0.9 + 3.0, uTime * 0.004)));
      float curtain = shape * (0.2 + 0.8 * rays) * patchy;
      vec3 aur = mix(vec3(0.16, 0.95, 0.68), vec3(0.6, 0.36, 1.0), smoothstep(0.0, 0.16, above));
      aur = mix(aur, uTint, 0.25);
      col += aur * curtain * 0.75 * (1.0 - uDay * 0.75) * (1.0 - uStorm * 0.85);

      // 별
      vec3 g = d * 210.0;
      vec3 id = floor(g);
      vec3 f = fract(g) - 0.5;
      float r = hash13(id);
      if (r > 0.982) {
        vec3 o = (vec3(hash13(id + 1.7), hash13(id + 4.3), hash13(id + 7.9)) - 0.5) * 0.5;
        float s = smoothstep(0.17, 0.0, length(f - o));
        float tw = 0.55 + 0.45 * sin(uTime * (0.8 + r * 40.0) + r * 300.0);
        vec3 sc = mix(vec3(1.0, 0.86, 0.70), vec3(0.75, 0.85, 1.0), hash13(id + 9.1));
        col += sc * s * tw * smoothstep(0.02, 0.25, h) * (1.0 - uDay * 0.85) * (1.0 - uStorm) * 1.7;
      }

      // 달
      float md = max(dot(d, normalize(uMoonDir)), 0.0);
      float disc = smoothstep(0.99955, 0.99975, md);
      col += vec3(1.0, 0.96, 0.88) * disc * 2.4 * (1.0 - uStorm * 0.8);
      col += vec3(0.62, 0.70, 1.0) * (pow(md, 80.0) * 0.12 + pow(md, 10.0) * 0.02) * (1.0 - uStorm * 0.6);

      // 번개
      col += vec3(0.70, 0.75, 1.0) * uFlash * 0.7 * smoothstep(-0.1, 0.5, h);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export const cloudShader = {
  vertex: /* glsl */ `
    varying vec3 vWorld;
    void main() {
      vec4 w = modelMatrix * vec4(position, 1.0);
      vWorld = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }
  `,
  fragment: /* glsl */ `
    uniform float uTime;
    uniform float uDay;
    uniform float uDensity;
    uniform vec3 uTint;
    varying vec3 vWorld;
    ${NOISE}
    ${HORIZON}
    void main() {
      vec2 p = vWorld.xz * 0.045;
      float n = fbm(p + vec2(uTime * 0.010, uTime * 0.004));
      float n2 = fbm(p * 2.7 + vec2(-uTime * 0.018, uTime * 0.007) + n);
      float c = smoothstep(0.34 - uDensity * 0.12, 0.78, n * 0.65 + n2 * 0.45);
      vec3 deep = mix(vec3(0.018, 0.016, 0.055), vec3(0.10, 0.07, 0.16), uDay);
      vec3 lit = mix(vec3(0.19, 0.16, 0.38), vec3(0.85, 0.55, 0.55), uDay);
      vec3 col = mix(deep, lit, c * c);
      float dIsland = length(vWorld.xz);
      col += uTint * exp(-dIsland * 0.16) * 0.45 * c;
      float dist = length(vWorld.xz - cameraPosition.xz);
      col = mix(col, horizonColor(uDay) * 0.85, smoothstep(30.0, 110.0, dist));
      float alpha = mix(0.6, 1.0, c) * smoothstep(125.0, 90.0, dist);
      gl_FragColor = vec4(col, alpha);
    }
  `,
};

export const ridgeShader = {
  vertex: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragment: /* glsl */ `
    uniform float uSeed;
    uniform float uDay;
    uniform float uHaze;
    uniform vec3 uColor;
    uniform vec3 uRim;
    varying vec2 vUv;
    ${NOISE}
    ${HORIZON}
    void main() {
      float x = vUv.x * 40.0 + uSeed;
      float ridge = 0.28 + fbm(vec2(x * 0.35, uSeed)) * 0.5 + vnoise(vec2(x * 2.5, uSeed)) * 0.05;
      if (vUv.y > ridge) discard;
      float edge = smoothstep(ridge - 0.035, ridge, vUv.y);
      vec3 col = mix(uColor, horizonColor(uDay), uHaze + vUv.y * 0.25);
      col += uRim * edge * 0.16;
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

// 위로 떠오르는 불씨와 반딧불 입자 셰이더
export const driftShader = {
  vertex: /* glsl */ `
    attribute float aSeed;
    attribute float aSize;
    attribute vec3 aColor;
    uniform float uTime;
    uniform float uPixelRatio;
    uniform float uDir;
    uniform float uSpeed;
    uniform float uMin;
    uniform float uHeight;
    uniform float uSway;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      vec3 p = position;
      float speed = uSpeed * (0.5 + aSeed);
      float travel = mod(p.y - uMin + uDir * uTime * speed, uHeight);
      p.y = uMin + travel;
      p.x += sin(uTime * 0.55 + aSeed * 23.0) * uSway;
      p.z += cos(uTime * 0.45 + aSeed * 17.0) * uSway;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mv;
      float life = travel / uHeight;
      float edge = smoothstep(0.0, 0.12, life) * smoothstep(1.0, 0.85, life);
      float tw = 0.45 + 0.55 * sin(uTime * (1.2 + aSeed * 3.0) + aSeed * 40.0);
      vAlpha = edge * tw;
      vColor = aColor;
      gl_PointSize = aSize * uPixelRatio * (12.0 / -mv.z);
    }
  `,
  fragment: /* glsl */ `
    uniform float uOpacity;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.0, d);
      gl_FragColor = vec4(vColor * (0.5 + 1.8 * a * a), a * vAlpha * uOpacity);
    }
  `,
};

// 강화 순간 튀는 불꽃 (CPU에서 위치를 갱신)
export const sparkShader = {
  vertex: /* glsl */ `
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
  `,
  fragment: /* glsl */ `
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      float a = smoothstep(0.5, 0.0, d);
      gl_FragColor = vec4(vColor * (0.8 + 1.6 * a * a), a * vAlpha);
    }
  `,
};

// 강화 충격파: 평면 위에 그리는 부드러운 고리
export const shockShader = {
  vertex: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragment: /* glsl */ `
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uWidth;
    varying vec2 vUv;
    void main() {
      float r = length(vUv - 0.5) * 2.0;
      float ring = exp(-pow((r - 0.86) / uWidth, 2.0));
      float fill = smoothstep(0.86, 0.0, r) * 0.12;
      float a = (ring + fill) * uOpacity * step(r, 1.0);
      gl_FragColor = vec4(uColor * 1.4, a);
    }
  `,
};

export const pillarShader = {
  vertex: /* glsl */ `
    varying vec2 vUv;
    varying vec3 vN;
    varying vec3 vV;
    void main() {
      vUv = uv;
      vec4 w = modelMatrix * vec4(position, 1.0);
      vN = normalize(mat3(modelMatrix) * normal);
      vV = normalize(cameraPosition - w.xyz);
      gl_Position = projectionMatrix * viewMatrix * w;
    }
  `,
  fragment: /* glsl */ `
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vN;
    varying vec3 vV;
    void main() {
      float facing = abs(dot(normalize(vN), normalize(vV)));
      float fade = pow(1.0 - vUv.y, 1.8) * smoothstep(0.0, 0.03, vUv.y);
      float streak = 0.65 + 0.35 * sin(vUv.x * 75.0 + uTime * 5.0) * sin(vUv.y * 18.0 - uTime * 9.0);
      float a = fade * uOpacity * (0.25 + 0.75 * facing) * streak;
      gl_FragColor = vec4(uColor * 1.6, a);
    }
  `,
};

// 마지막 화면 처리: 색수차, 비네트, 필름 그레인, 강화 섬광
export const finishShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uFlash: { value: 0 },
    uFlashColor: { value: null },
    uGrain: { value: 0.035 },
    uFade: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uFlash;
    uniform vec3 uFlashColor;
    uniform float uGrain;
    uniform float uFade;
    varying vec2 vUv;
    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }
    void main() {
      vec2 c = vUv - 0.5;
      float ca = 0.0012 + uFlash * 0.006;
      vec3 col;
      col.r = texture2D(tDiffuse, vUv + c * ca).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - c * ca).b;
      float vig = smoothstep(0.95, 0.22, length(c * vec2(1.0, 0.82)));
      col *= mix(0.5, 1.0, vig);
      col += uFlashColor * uFlash * 0.22 * (1.0 - length(c) * 1.3);
      col += (rand(vUv * 1000.0 + fract(uTime * 7.0) * 100.0) - 0.5) * uGrain;
      gl_FragColor = vec4(col * uFade, 1.0);
    }
  `,
};
