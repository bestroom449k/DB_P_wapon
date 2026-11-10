// 씨앗(seed)이 같으면 늘 같은 순서로 나오는 무작위 수 (새로고침해도 섬, 성, 구름, 룬 모양이 그대로다)
export function random(seed) { // 0 이상 1 미만의 수를 하나씩 돌려주는 함수를 만든다
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
