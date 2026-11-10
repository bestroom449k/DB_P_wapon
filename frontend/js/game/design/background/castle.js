// 하늘 성: 오른쪽 위 큰 떠 있는 섬 위에 선 흰 성. 가운데 높은 탑과 뾰족한 첨탑, 둘레의 낮은 탑과 성벽.
// 멀리 있어서 안개에 묻혀 아련하게 보인다.
import * as THREE from 'three';
import { island } from './islands.js';
import { wall, roof, rock, roughen } from '../shared/stone.js';

// 탑: [가로, 깊이, 굵기, 높이, 지붕 높이]
const TOWERS = [
  [0, 0, 1.5, 9, 5.5], // 가운데 큰 탑
  [1, -1.6, 0.45, 13, 3.6], // 첨탑
  [-1.2, -1.3, 0.4, 11.5, 3.2],
  [2.7, 0.9, 0.9, 6.5, 3.2], // 안쪽 탑
  [-2.7, 0.7, 0.95, 6, 3.2],
  [1.3, 2.6, 0.8, 5, 2.7],
  [-1.5, 2.7, 0.8, 5.6, 2.7],
  [0.2, -3.2, 1, 7.2, 3.6],
  [3.4, -2.2, 0.6, 8.5, 3],
  [-3.6, -2, 0.6, 8, 3],
];
const RING = 6; // 성벽 반지름
const RING_TOWERS = 9; // 성벽 둘레 탑 수

function tower(radius, height, roofHeight) { // 탑 하나: 원통 몸통, 처마 띠, 원뿔 지붕
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.04, height, 14), wall);
  body.position.y = height / 2;
  const eave = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.16, radius * 1.16, radius * 0.32, 14), wall);
  eave.position.y = height;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(radius * 1.24, roofHeight, 14), roof);
  cone.position.y = height + roofHeight / 2 + radius * 0.16;
  group.add(body, eave, cone);
  return group;
}

export function create({ scene }) { // 성 만들기
  const castle = new THREE.Group();

  const base = island(8, 9); // 성이 서 있는 큰 섬
  castle.add(base);
  for (let i = 0; i < 3; i++) { // 섬 아래 떨어져 떠 있는 바위 조각
    const chunk = new THREE.Mesh(roughen(new THREE.ConeGeometry(1.4 - i * 0.3, 3 - i * 0.5, 7, 2), 0.25), rock);
    chunk.rotation.x = Math.PI;
    chunk.position.set(-5 + i * 4.5, -17 - i * 2, 2 - i);
    castle.add(chunk);
  }

  for (const [x, z, r, h, roofH] of TOWERS) { // 안쪽 탑들
    const t = tower(r, h, roofH);
    t.position.set(x, 0.8, z);
    castle.add(t);
  }

  for (let i = 0; i < RING_TOWERS; i++) { // 성벽과 둘레 탑
    const a = (i / RING_TOWERS) * Math.PI * 2;
    const next = ((i + 1) / RING_TOWERS) * Math.PI * 2;
    const t = tower(0.62, 3.6 + (i % 3) * 0.6, 2);
    t.position.set(Math.cos(a) * RING, 0.8, Math.sin(a) * RING);
    castle.add(t);
    const length = 2 * RING * Math.sin(Math.PI / RING_TOWERS);
    const segment = new THREE.Mesh(new THREE.BoxGeometry(length, 2.4, 0.5), wall);
    const mid = (a + next) / 2;
    segment.position.set(Math.cos(mid) * RING * Math.cos(Math.PI / RING_TOWERS), 2, Math.sin(mid) * RING * Math.cos(Math.PI / RING_TOWERS));
    segment.rotation.y = -mid + Math.PI / 2;
    castle.add(segment);
  }

  const hall = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.6, 2.4), wall); // 큰 전각과 세모 지붕
  hall.position.set(-0.5, 2.6, 2.8);
  const gable = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 4.4, 3), roof);
  gable.rotation.set(0, 0, Math.PI / 2);
  gable.position.set(-0.5, 5.1, 2.8);
  castle.add(hall, gable);

  const HOME_Y = 6; // 성의 높이
  castle.position.set(36, HOME_Y, -75);
  castle.rotation.y = -0.5;
  castle.scale.setScalar(1.5);
  scene.add(castle);

  return (s, t) => { // 매 프레임: 아주 천천히 오르내리기
    castle.position.y = HOME_Y + Math.sin(t * 0.18) * 0.4;
  };
}
