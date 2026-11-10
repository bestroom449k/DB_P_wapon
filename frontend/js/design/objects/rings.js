// 등급 고리 5개: 평소에는 혼천의처럼 제각각 돌다가, 제 등급이 되면 수평으로 정렬된다.
// 타임라인이 1등급으로 돌아가면(85%) 다시 풀려난다. 방금 오른 등급의 고리는 번쩍인다.
import * as THREE from 'three';
import { SWORD_Y } from './sword.js';
import { GLOW } from '../shared/materials.js';

export const FLAT_TILT = Math.PI / 2 + 0.38; // 정렬됐을 때의 기울기 (살짝 위에서 내려다보는 각, 충격파도 이 면에서 퍼짐)

export function create({ scene }, { colors }) { // 등급 고리 만들기
  const rings = colors.map((color, i) => { // 등급마다 고리 하나
    const radius = 1.3 + i * 0.3; // 등급이 높을수록 큰 고리
    const material = new THREE.MeshBasicMaterial({ ...GLOW, toneMapped: false }); // 빛나는 재질
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.009 + i * 0.0015, 6, 240), material); // 고리
    const beadShape = new THREE.SphereGeometry(0.032 + i * 0.005, 12, 8); // 구슬 모양 (한 고리의 구슬끼리 같이 씀)
    for (let b = 0; b < 1 + (i % 3); b++) {
      const bead = new THREE.Mesh(beadShape, material); // 고리를 따라 도는 구슬
      bead.position.set(Math.cos(b * 2.1 + i) * radius, Math.sin(b * 2.1 + i) * radius, 0);
      ring.add(bead);
    } // 구슬 1~3개
    ring.position.y = SWORD_Y; // 검 가운데 높이
    scene.add(ring);
    return { ring, color, align: i === 0 ? 1 : 0, phase: i * 1.7, speed: 0.12 + i * 0.04 }; // 고리 상태 (정렬 정도, 도는 속도)
  });

  const free = new THREE.Quaternion(); // 제각각 도는 방향
  const flat = new THREE.Quaternion(); // 정렬된 방향
  const euler = new THREE.Euler(); // 각도 계산 도구

  return (s, t, dt) => { // 매 프레임: 등급 고리
    rings.forEach((r, i) => {
      // 정렬 정도(0~1)가 목표값으로 부드럽게 다가간다
      r.align = THREE.MathUtils.damp(r.align, s.level > i ? 1 : 0, 3, dt); // 정렬 정도
      const dir = i % 2 ? 1 : -1; // 고리마다 도는 방향을 번갈아
      free.setFromEuler(euler.set(r.phase + t * r.speed * dir, r.phase * 2 + t * r.speed * 0.7, r.phase * 3 - t * r.speed * 0.5 * dir)); // 혼천의처럼 돌기
      flat.setFromEuler(euler.set(FLAT_TILT, 0, t * 0.14 * dir + i)); // 수평으로 누워 돌기
      r.ring.quaternion.slerpQuaternions(free, flat, THREE.MathUtils.smoothstep(r.align, 0, 1)); // 두 방향 사이를 정렬 정도만큼 (시작과 끝을 부드럽게)
      const flashing = s.level === i + 1 ? s.pulse * 1.5 : 0; // 방금 오른 등급이면 번쩍
      r.ring.material.color.copy(r.color).multiplyScalar(0.32 + r.align * 0.83 + flashing + s.finale * 0.25); // 고리 밝기
    });
  };
}
