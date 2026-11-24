// 게임 화면의 3D 부품이 같이 읽는 상태: 등급 색과 움직임 줄이기 설정
import * as THREE from 'three';

const css = getComputedStyle(document.documentElement); // CSS 값 읽기 도구
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)'); // 움직임 줄이기 설정

export const state = {
  colors: [1, 2, 3, 4, 5].map((i) => new THREE.Color(css.getPropertyValue(`--g${i}`).trim())), // 등급 색 5개 (css/tokens.css, 타이틀 js/title/function/timeline.js와 같음)
  still: reduceMotion.matches, // 움직임 줄이기를 켰으면 true (장면이 거의 멈춘다)
};

reduceMotion.addEventListener('change', () => (state.still = reduceMotion.matches));
