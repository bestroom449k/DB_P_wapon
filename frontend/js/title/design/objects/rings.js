// 등급 룬 띠 5개: 룬 글자가 흐르는 빛의 띠. 평소에는 혼천의처럼 제각각 돌다가, 제 등급의 룬이 새겨지면 수평으로 눕는다.
// 타임라인이 1등급으로 돌아가면(95.9%) 다시 풀려난다. 방금 새겨진 등급의 띠는 번쩍이고, 글자는 늘 띠를 따라 흐른다.
import * as THREE from 'three';
import { BOOK_Y } from './grimoire.js';
import { runeBandTexture } from '../../shared/grimoire-textures.js';
import { GLOW } from '../../shared/materials.js';

export const FLAT_TILT = Math.PI / 2 + 0.38; // 수평으로 누웠을 때의 기울기 (살짝 위에서 내려다보는 각, 룬 마법진도 이 면에서 퍼짐)
const GLYPH_LENGTH = 3; // 룬 띠 그림 한 장이 덮는 길이 (글자가 늘어나 보이지 않게 둘레에 맞춰 반복)

export function create({ scene }, { colors }) { // 룬 띠 만들기
  const band = runeBandTexture(); // 룬 띠 그림 (다섯 띠가 그림은 같이 쓰고, 흐르는 위치는 따로)
  const rings = colors.map((color, i) => { // 등급마다 띠 하나
    const radius = 1.3 + i * 0.3; // 등급이 높을수록 큰 띠
    const height = 0.12 + i * 0.012; // 띠 폭
    const map = band.clone(); // 흐르는 위치(offset)만 따로 쓰려고 복사 (그림은 같이 씀)
    map.repeat.x = Math.round((Math.PI * 2 * radius) / GLYPH_LENGTH);
    map.needsUpdate = true;
    const geometry = new THREE.CylinderGeometry(radius, radius, height, 256, 1, true).rotateX(Math.PI / 2); // 띠 (축을 앞뒤로 눕혀 고리처럼)
    const ring = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ ...GLOW, map, side: THREE.DoubleSide, toneMapped: false }));
    ring.position.y = BOOK_Y; // 책 가운데 높이
    scene.add(ring);
    return { ring, map, color, align: i === 0 ? 1 : 0, phase: i * 1.7, speed: 0.16 + i * 0.05 }; // 띠 상태 (누운 정도, 도는 속도)
  });
  const gold = colors[colors.length - 1]; // 5등급 황금빛
  const tint = new THREE.Color(); // 띠 하나의 지금 색
  let golden = 0; // 다섯 띠가 모두 황금빛으로 물든 정도 (5등급이 되면 1)

  const free = new THREE.Quaternion(); // 제각각 도는 방향
  const flat = new THREE.Quaternion(); // 수평으로 누운 방향
  const euler = new THREE.Euler(); // 각도 계산 도구

  return (s, t, dt) => { // 매 프레임: 룬 띠
    golden = THREE.MathUtils.damp(golden, s.level === 5 ? 1 : 0, 2.5, dt); // 5등급이 되면 모든 띠가 황금빛
    rings.forEach((r, i) => {
      r.align = THREE.MathUtils.damp(r.align, s.level > i ? 1 : 0, 3, dt); // 누운 정도가 목표값으로 부드럽게 다가간다
      const dir = i % 2 ? 1 : -1; // 띠마다 도는 방향을 번갈아
      free.setFromEuler(euler.set(r.phase + t * r.speed * dir, r.phase * 2 + t * r.speed * 0.7, r.phase * 3 - t * r.speed * 0.5 * dir)); // 혼천의처럼 돌기
      flat.setFromEuler(euler.set(FLAT_TILT, 0, t * 0.14 * dir + i)); // 수평으로 누워 돌기
      r.ring.quaternion.slerpQuaternions(free, flat, THREE.MathUtils.smoothstep(r.align, 0, 1)); // 두 방향 사이를 누운 정도만큼
      r.map.offset.x += dt * (0.05 + r.align * 0.06) * dir; // 룬 글자가 띠를 따라 흐른다 (누우면 조금 빨리)
      const flashing = s.level === i + 1 ? s.pulse * 1.5 : 0; // 방금 새겨진 등급이면 번쩍
      tint.copy(r.color).lerp(gold, golden); // 띠 색 (5등급이면 황금빛)
      r.ring.material.color.copy(tint).multiplyScalar(0.3 + r.align * 0.9 + flashing + s.finale * 0.25); // 띠 밝기
    });
  };
}
