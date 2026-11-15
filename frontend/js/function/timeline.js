// css/timeline.css의 룬 각인 타임라인과 공방 입장 연출이 매 순간 바꾸는 값을 읽어 온다.
// 3D 부품들은 이 값만 보고 움직이므로, "언제 무엇이 일어나는지"는 CSS 한 곳에서 정해진다.
import * as THREE from 'three';

const css = getComputedStyle(document.documentElement); // CSS 값 읽기 도구
const read = (name) => css.getPropertyValue(name).trim(); // CSS 변수 하나 읽기
const NUMBERS = ['charge', 'pulse', 'burst', 'finale', 'spin', 'reforge', 'push', 'open', 'flip', 'dive']; // 매 프레임 읽는 숫자 값 이름
const RADIANT = new THREE.Color(1, 0.94, 0.8); // 5등급 빛 기둥이 솟을 때 황금빛에 섞는 밝은 금빛

export const state = { // 각인 상태
  intro: parseFloat(read('--intro')) || 2.4, // 로딩 화면이 걷히는 시각(초), css/title.css의 --intro
  colors: [1, 2, 3, 4, 5].map((i) => new THREE.Color(read(`--g${i}`))), // 등급 색 5개 (css/tokens.css)
  level: 1, // 지금 등급 (1~5)
  charge: 0, // 새기기 직전 룬 조각이 모여드는 정도 (0~1)
  pulse: 0, // 룬이 새겨지는 순간의 번쩍임 (1에서 0으로 줄어듦)
  burst: 1, // 룬 마법진과 빛이 퍼진 정도 (0에서 1로)
  finale: 0, // 5등급 빛 기둥 (0~1)
  spin: 0, // 5등급에서 책이 도는 정도 (1 = 한 바퀴)
  reforge: 0, // 완성된 책이 빛 기둥을 타고 올라갔다가 새 책이 내려오는 정도 (0~1)
  push: 0, // 로그인 창이 열릴 때 카메라가 다가간 정도
  open: 0, // 공방 입장: 사슬이 끊어지고 표지가 열린 정도 (0~1)
  flip: 0, // 공방 입장: 책장이 넘어간 정도 (0~1)
  dive: 0, // 공방 입장: 카메라가 책 속으로 들어간 정도 (0~1)
  light: new THREE.Color(), // 지금 빛나는 색 (등급 색)
};

export function readTimeline() { // 타임라인 읽기
  state.level = parseInt(read('--level'), 10) || 1; // 등급
  for (const key of NUMBERS) state[key] = parseFloat(read(`--${key}`)) || 0; // 나머지 숫자 값들
  state.light.set(read('--grade')); // 빛 색
  if (state.finale > 0) state.light.lerp(RADIANT, state.finale * 0.3); // 빛 기둥이 솟으면 황금빛이 조금 더 밝아진다 (무지갯빛이 아니라 황금빛 그대로)
}
