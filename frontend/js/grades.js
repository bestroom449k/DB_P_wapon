// 무기 등급 5단계. 색은 css/title.css의 --g1 ~ --g5에서 읽어 와
// 3D 장면과 화면 글자가 같은 색을 쓴다.
const FALLBACK = ['#8d93a6', '#d08c4a', '#46d9a0', '#a477ff', '#fff1cf'];

export const MAX_GRADE = FALLBACK.length;

export function readGradeColors() {
  const css = getComputedStyle(document.documentElement);
  return FALLBACK.map((fallback, i) => css.getPropertyValue(`--g${i + 1}`).trim() || fallback);
}
