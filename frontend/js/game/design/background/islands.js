// 떠 있는 섬: 풀 덮인 윗면, 아래로 뾰족한 바위, 둥근 나무 몇 그루. 왼쪽 하늘에 크기가 다른 섬 다섯 개가 천천히 오르내린다.
import * as THREE from 'three';
import { random } from '../shared/random.js';
import { rock, grass, leaves, bark, roughen } from '../shared/stone.js';

// [가로 위치, 높이, 깊이, 크기, 씨앗]
const ISLANDS = [
  [-30, 12, -52, 4.2, 1], // 왼쪽 위 큰 섬
  [-19, 5.5, -40, 2.4, 2], // 왼쪽 가운데
  [-42, 4, -78, 3.6, 3], // 왼쪽 멀리
  [-26, 19, -92, 1.8, 4], // 위쪽 작은 섬
  [52, 16, -120, 3, 5], // 오른쪽 성 너머
];

export function island(size, seed) { // 섬 하나 만들기 (성도 이 섬 위에 선다)
  const rand = random(seed);
  const group = new THREE.Group();

  const top = new THREE.Mesh(new THREE.CylinderGeometry(size, size * 0.94, size * 0.22, 11), grass); // 풀 덮인 윗면
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.95, size * 0.8, size * 0.35, 11), rock); // 흙 띠
  soil.position.y = -size * 0.28;
  const under = new THREE.Mesh(roughen(new THREE.ConeGeometry(size * 0.82, size * 2.3, 11, 5), size * 0.13, size * 1.1), rock); // 아래 바위
  under.rotation.x = Math.PI; // 뾰족한 쪽이 아래로
  under.position.y = -size * 1.6;
  group.add(top, soil, under);

  const trees = 2 + Math.floor(rand() * 3); // 나무 2~4그루
  for (let i = 0; i < trees; i++) {
    const a = rand() * Math.PI * 2;
    const d = rand() * size * 0.62;
    const h = size * (0.35 + rand() * 0.3);
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(size * 0.03, size * 0.05, h, 5), bark);
    trunk.position.y = h / 2;
    tree.add(trunk);
    for (let k = 0; k < 3; k++) { // 둥근 잎 덩어리 세 개
      const r = size * (0.16 + rand() * 0.12);
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leaves[Math.floor(rand() * leaves.length)]);
      crown.position.set((rand() - 0.5) * r, h + (k - 0.6) * r * 0.7, (rand() - 0.5) * r);
      tree.add(crown);
    }
    tree.position.set(Math.cos(a) * d, size * 0.1, Math.sin(a) * d);
    group.add(tree);
  }
  return group;
}

export function create({ scene }) { // 섬들 만들기
  const groups = ISLANDS.map(([x, y, z, size, seed]) => {
    const group = island(size, seed);
    group.position.set(x, y, z);
    group.rotation.y = seed * 1.3;
    group.userData.home = y;
    scene.add(group);
    return group;
  });

  return (s, t) => { // 매 프레임: 천천히 오르내리기
    groups.forEach((group, i) => {
      group.position.y = group.userData.home + Math.sin(t * 0.32 + i * 1.9) * 0.35;
    });
  };
}
