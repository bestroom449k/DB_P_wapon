// css/game/timeline.css의 뽑기 연출 타임라인이 바꾸는 값을 읽어 온다.
// 3D 부품들은 이 값만 보고 움직이므로, "언제 무엇이 일어나는지"는 CSS 한 곳에서 정해진다.

const css = getComputedStyle(document.documentElement); // CSS 값 읽기 도구
const read = (name) => parseFloat(css.getPropertyValue(name)) || 0; // CSS 숫자 변수 하나 읽기
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)'); // 움직임 줄이기 설정

export const state = { // 뽑기 상태
  charge: 0, // 기 모으기 (0~1)
  flash: 0, // 번쩍임 (0~1)
  still: reduceMotion.matches, // 움직임 줄이기를 켰으면 true (장면이 거의 멈춘다)
};

reduceMotion.addEventListener('change', () => (state.still = reduceMotion.matches));

export function readTimeline() { // 매 프레임 타임라인 읽기
  state.charge = read('--charge');
  state.flash = read('--flash');
}
