// css/timeline.css의 강화 타임라인이 매 순간 바꾸는 값을 읽어 온다.
// 3D 부품들은 이 값만 보고 움직이므로, "언제 무엇이 일어나는지"는 CSS 한 곳에서 정해진다.
import * as THREE from 'three';

const css = getComputedStyle(document.documentElement); // CSS 값 읽기 도구
const read = (name) => css.getPropertyValue(name).trim(); // CSS 변수 하나 읽기
const NUMBERS = ['charge', 'pulse', 'burst', 'finale', 'spin', 'reforge', 'push']; // 매 프레임 읽는 숫자 값 이름
const rainbow = new THREE.Color(); // 5등급 무지갯빛

export const state = { // 강화 상태
  intro: parseFloat(read('--intro')) || 2.4, // 로딩 화면이 걷히는 시각(초), css/title.css의 --intro
  colors: [1, 2, 3, 4, 5].map((i) => new THREE.Color(read(`--g${i}`))), // 등급 색 5개
  level: 1, // 지금 등급 (1~5)
  charge: 0, // 내려치기 직전 기를 모으는 정도 (0~1)
  pulse: 0, // 내려치는 순간의 번쩍임 (1에서 0으로 줄어듦)
  burst: 1, // 불꽃과 충격파가 퍼진 정도 (0에서 1로)
  finale: 0, // 5등급 빛 기둥 (0~1)
  spin: 0, // 5등급에서 검이 도는 정도 (1 = 한 바퀴)
  reforge: 0, // 완성된 검이 빛 기둥을 타고 올라갔다가 새 검이 내려오는 정도 (0~1)
  push: 0, // "게임 시작"을 눌렀을 때 카메라가 다가간 정도
  light: new THREE.Color(), // 지금 빛나는 색 (5등급에서는 무지갯빛으로 돈다)
};

export function readTimeline(t) { // 타임라인 읽기
  state.level = parseInt(read('--level'), 10) || 1; // 등급
  for (const key of NUMBERS) state[key] = parseFloat(read(`--${key}`)) || 0; // 나머지 숫자 값들
  state.light.set(read('--grade')); // 빛 색
  if (state.finale > 0) state.light.lerp(rainbow.setHSL((t * 0.32) % 1, 0.5, 0.74), state.finale); // 5등급에서는 은은한 무지갯빛 (검이 하얗게 날아가지 않게)
}
