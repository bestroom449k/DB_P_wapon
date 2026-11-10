// 바닥 마법진: 큰 룬 고리(바깥)와 오각별 마법진(안쪽)이 서로 반대로 돈다. 그 아래로 라벤더빛이 번진다.
// 뽑기 연출 중에는 기를 모을수록 빨리 돌고 밝아진다.
import * as THREE from 'three';
import { GLOW } from '../../../design/shared/materials.js';
import { circleTexture, glowTexture } from '../../../design/shared/textures.js';
import { runeRingTexture } from '../shared/textures.js';

const CENTER = new THREE.Vector3(0, 0, 0.6); // 마법진 중심 (가운데 카드 바로 아래)
const LIGHT = new THREE.Color(0xd9d2ff); // 마법진 빛 색 (흰 라벤더)

function disc(texture, radius, lift) { // 바닥에 눕힌 빛 원판
  const material = new THREE.MeshBasicMaterial({ ...GLOW, map: texture, color: LIGHT.clone() });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 128), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.copy(CENTER).setY(lift);
  return mesh;
}

export function create({ scene }) { // 마법진 만들기
  const pool = disc(glowTexture(), 9, 0.012); // 바닥에 번지는 빛
  const outer = disc(runeRingTexture(), 6.2, 0.016); // 바깥 룬 고리
  const inner = disc(circleTexture(), 2.7, 0.02); // 안쪽 오각별 마법진
  scene.add(pool, outer, inner);

  let spin = 0; // 돈 정도
  return (s, t, dt) => { // 매 프레임: 마법진
    spin += dt * (1 + s.charge * 7); // 기를 모을수록 빨리
    outer.rotation.z = spin * 0.03;
    inner.rotation.z = -spin * 0.07;
    const glow = 1 + s.charge * 0.6 + s.flash * 1.2 + Math.sin(t * 1.4) * 0.06; // 숨 쉬듯 밝기
    outer.material.color.copy(LIGHT).multiplyScalar(0.75 * glow);
    inner.material.color.copy(LIGHT).multiplyScalar(0.92 * glow);
    pool.material.color.copy(LIGHT).multiplyScalar(0.14 * glow);
  };
}
