// 바위 표면 다듬기: 타이틀의 섬과 작은 바위(js/design/objects/island.js, rocks.js), 게임 화면의 섬과 성 바위가 같이 쓴다.

// 꼭짓점을 위치에 따라 정해진 만큼 흔들어 울퉁불퉁한 돌처럼 만든다 (같은 위치는 같은 만큼 → 면이 안 갈라짐)
export function roughen(geometry, amount, keepAbove = Infinity) { // 돌 표면 울퉁불퉁하게
  const p = geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)];
    if (y > keepAbove) continue;
    const r = (k) => {
      const v = Math.sin(x * 12.9 + y * 78.2 + z * 37.7 + k) * 43758.5;
      return v - Math.floor(v) - 0.5;
    };
    p.setXYZ(i, x + r(1) * amount, y + r(2) * amount, z + r(3) * amount);
  }
  geometry.computeVertexNormals();
  return geometry;
}
