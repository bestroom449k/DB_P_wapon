// 마지막 화면 처리: 물체끼리 맞닿은 곳의 은은한 음영(N8AO), 1보다 밝은 곳(빛 기둥, 고리, 가운데 카드)만 번져 보이는 빛 번짐,
// 가장자리를 살짝 누르는 비네트, 뽑기 순간의 섬광, 마지막으로 계단 현상 지우기(SMAA).
// 다른 부품이 모두 움직인 뒤 맨 마지막에 화면에 그린다. (타이틀 화면 js/design/effects/bloom.js와 같은 구성)
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { N8AOPass } from 'n8ao'; // 음영 효과 라이브러리 (game.html의 importmap에서 불러옴)
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
      col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, 0.84); // 채도를 조금 빼서 타이틀처럼 차분한 밤으로 (진한 색은 등급 색만)
      col *= mix(0.62, 1.0, smoothstep(0.9, 0.25, length(c * vec2(1.0, 0.85)))); // 비네트 (밤이라 가장자리를 눌러 가운데 카드로 눈이 가게)
      col = mix(col, vec3(0.95, 0.96, 1.0), clamp(uFlash * (1.1 - length(c) * 1.1), 0.0, 1.0)); // 달빛 흰 섬광 (가운데에서 퍼지고, 가장자리는 밤이 남는다)
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

const BLOOM = 0.62; // 빛 번짐 세기 (밤이라 바탕이 어두워서 빛나는 것들이 조금 더 번져도 된다)

export function create({ renderer, scene, camera }) { // 빛 번짐 만들기
  const target = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType }); // 화면 처리용 화면 (계단 현상은 마지막 SMAA가 지움)
  const composer = new EffectComposer(renderer, target);
  const ao = new N8AOPass(scene, camera, innerWidth, innerHeight); // 1단계: 장면 그리기 + 맞닿은 곳의 음영
  ao.configuration.aoRadius = 1.6; // 음영이 퍼지는 거리 (기둥 굵기, 난간 높이에 맞춤)
  ao.configuration.distanceFalloff = 0.8; // 멀어질수록 음영이 사라지는 정도
  ao.configuration.intensity = 2.6; // 음영 진하기 (밤이라 약하게)
  ao.configuration.color = new THREE.Color(0x0a0c22); // 그늘 색: 검정이 아니라 짙은 남색
  ao.configuration.halfRes = true; // 절반 해상도로 계산 (속도)
  ao.configuration.gammaCorrection = false; // 색 변환은 뒤의 OutputPass가 한 번만
  ao.setQualityMode('Medium');
  composer.addPass(ao);
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), BLOOM, 0.32, 1.0); // 2단계: 빛 번짐 (세기, 퍼지는 넓이, 밝기 1을 넘는 곳만)
  composer.addPass(bloom);
  composer.addPass(new OutputPass()); // 3단계: 색 맞추기
  const finish = new ShaderPass(finishShader); // 4단계: 마무리
  composer.addPass(finish);
  composer.addPass(new SMAAPass(innerWidth, innerHeight)); // 5단계: 물체 가장자리의 계단 현상 지우기

  const resize = () => { // 화면 크기 맞추기
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(innerWidth, innerHeight);
  };
  addEventListener('resize', resize);
  resize();

  return (s) => { // 매 프레임 화면에 그리기
    bloom.strength = BLOOM + s.charge * 0.15 + s.flash * 0.5;
    finish.uniforms.uFlash.value = s.flash * 0.6; // 밤 장면이 다 하얗게 덮이지 않을 만큼
    composer.render();
  };
}
