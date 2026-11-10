// 마지막 화면 처리: 밝은 곳이 번져 보이는 빛 번짐(블룸), 그리고 비네트, 필름 그레인, 강화 순간의 섬광.
// 다른 부품이 모두 움직인 뒤 맨 마지막에 화면에 그린다.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UV_VERTEX } from '../shared/glsl.js';

const finishShader = { // 마무리 셰이더 (비네트, 그레인, 섬광)
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uFlash: { value: 0 },
    uFlashColor: { value: new THREE.Color() },
    uFade: { value: 0 },
  },
  vertexShader: UV_VERTEX,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uFlash;
    uniform vec3 uFlashColor;
    uniform float uFade;
    varying vec2 vUv;
    void main() {
      vec2 c = vUv - 0.5;
      float shift = 0.0012 + uFlash * 0.006; // 가장자리 색 번짐
      vec3 col = vec3(texture2D(tDiffuse, vUv + c * shift).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - c * shift).b);
      col *= mix(0.5, 1.0, smoothstep(0.95, 0.22, length(c * vec2(1.0, 0.82)))); // 비네트
      col += uFlashColor * uFlash * 0.22 * (1.0 - length(c) * 1.3); // 섬광
      col += (fract(sin(dot(vUv * 1000.0 + fract(uTime * 7.0) * 100.0, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.015; // 그레인 (아주 옅게)
      gl_FragColor = vec4(col * uFade, 1.0);
    }
  `,
};

const BLOOM = 0.5; // 빛 번짐 세기 (높을수록 화면 전체가 뿌옇게 번짐)

export function create({ renderer, scene, camera }) { // 빛 번짐 만들기
  const target = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 }); // 장면을 그릴 화면 (4배 샘플링으로 계단 현상 줄이기)
  const composer = new EffectComposer(renderer, target); // 화면 처리 단계 묶음
  composer.addPass(new RenderPass(scene, camera)); // 1단계: 장면 그리기
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), BLOOM, 0.5, 0.88); // 2단계: 빛 번짐 (세기, 퍼지는 넓이, 이 밝기 넘는 곳만)
  composer.addPass(bloom);
  composer.addPass(new OutputPass()); // 3단계: 색 맞추기
  const finish = new ShaderPass(finishShader); // 4단계: 마무리
  composer.addPass(finish);

  const resize = () => { // 화면 크기 맞추기
    composer.setPixelRatio(renderer.getPixelRatio()); // 선명도는 stage.js에서 정한 값을 따름
    composer.setSize(innerWidth, innerHeight);
  };
  addEventListener('resize', resize);
  resize();

  return (s, t) => { // 매 프레임 화면에 그리기
    bloom.strength = BLOOM + s.finale * 0.1; // 5등급에서 더 번지게
    finish.uniforms.uTime.value = t; // 그레인 움직임
    finish.uniforms.uFlash.value = s.pulse * 0.8; // 섬광 세기
    finish.uniforms.uFlashColor.value.copy(s.light); // 섬광 색
    finish.uniforms.uFade.value = THREE.MathUtils.clamp((t - s.intro) / 1.8, 0, 1); // 로딩이 걷힐 때 1.8초 동안 서서히 밝아진다
    composer.render(); // 모든 단계를 거쳐 화면에 그리기
  };
}
