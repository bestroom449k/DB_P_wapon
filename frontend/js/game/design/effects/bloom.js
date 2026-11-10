// 마지막 화면 처리: 1보다 밝은 곳(빛 기둥, 고리, 가운데 카드)만 번져 보이는 빛 번짐, 가장자리를 살짝 누르는 비네트, 뽑기 순간의 흰 섬광.
// 다른 부품이 모두 움직인 뒤 맨 마지막에 화면에 그린다. (타이틀 화면 js/design/effects/bloom.js와 같은 구성, 낮 장면에 맞게 조절)
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UV_VERTEX } from '../../../design/shared/glsl.js';

const finishShader = { // 마무리 셰이더 (비네트, 섬광)
  uniforms: { tDiffuse: { value: null }, uFlash: { value: 0 } },
  vertexShader: UV_VERTEX,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uFlash;
    varying vec2 vUv;
    void main() {
      vec2 c = vUv - 0.5;
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      col *= mix(0.88, 1.0, smoothstep(0.85, 0.3, length(c * vec2(1.0, 0.85)))); // 비네트 (낮이라 아주 옅게)
      col = mix(col, vec3(1.0), clamp(uFlash * (1.1 - length(c) * 0.9), 0.0, 1.0)); // 흰 섬광 (가운데에서 퍼진다)
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

const BLOOM = 0.45; // 빛 번짐 세기 (낮 장면은 바탕이 밝아서 조금만 번져도 화면이 하얘진다)

export function create({ renderer, scene, camera }) { // 빛 번짐 만들기
  const target = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4 }); // 장면을 그릴 화면 (4배 샘플링으로 계단 현상 줄이기)
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera)); // 1단계: 장면 그리기
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), BLOOM, 0.35, 1.0); // 2단계: 빛 번짐 (세기, 퍼지는 넓이, 밝기 1을 넘는 곳만)
  composer.addPass(bloom);
  composer.addPass(new OutputPass()); // 3단계: 색 맞추기
  const finish = new ShaderPass(finishShader); // 4단계: 마무리
  composer.addPass(finish);

  const resize = () => { // 화면 크기 맞추기
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(innerWidth, innerHeight);
  };
  addEventListener('resize', resize);
  resize();

  return (s) => { // 매 프레임 화면에 그리기
    bloom.strength = BLOOM + s.charge * 0.15 + s.flash * 0.5;
    finish.uniforms.uFlash.value = s.flash * 0.85;
    composer.render();
  };
}
