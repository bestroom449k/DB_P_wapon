// 뭉게구름: 캔버스로 그린 구름 그림을 멀리 세운 판에 붙인다.
// 왼쪽 섬들 뒤, 오른쪽 성 뒤, 위쪽 하늘, 그리고 지평선 아래 구름바다. 아주 천천히 옆으로 흘러간다.
import * as THREE from 'three';
import { cloudTexture } from '../shared/textures.js';

// [가로 위치, 높이, 깊이, 가로 크기, 그림 번호, 불투명도]
const CLOUDS = [
  [-120, 22, -230, 150, 0, 1], // 왼쪽 큰 구름
  [-60, 4, -170, 95, 1, 1], // 왼쪽 섬 뒤
  [-150, 70, -260, 90, 2, 0.85], // 왼쪽 위
  [130, 10, -240, 170, 3, 1], // 오른쪽 성 뒤
  [70, 38, -280, 110, 1, 0.8], // 오른쪽 위
  [-10, 95, -300, 80, 2, 0.6], // 위쪽 작은 구름
  [-90, -16, -150, 140, 3, 0.95], // 구름바다
  [40, -18, -140, 150, 0, 0.95],
  [150, -14, -170, 130, 2, 0.9],
  [-170, -12, -190, 120, 1, 0.9],
];

export function create({ scene }) { // 구름 만들기
  const textures = [3, 8, 21, 34].map((seed) => cloudTexture(seed)); // 구름 그림 네 가지
  const clouds = CLOUDS.map(([x, y, z, width, art, opacity], i) => {
    const material = new THREE.MeshBasicMaterial({ map: textures[art], transparent: true, opacity, depthWrite: false, fog: false });
    const cloud = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 2), material);
    cloud.position.set(x, y, z);
    cloud.renderOrder = -5 - i; // 먼 것부터
    cloud.userData.home = x;
    scene.add(cloud);
    return cloud;
  });

  return (s, t) => { // 매 프레임: 구름이 천천히 흐른다
    clouds.forEach((cloud, i) => {
      cloud.position.x = cloud.userData.home + Math.sin(t * 0.012 + i * 1.7) * 6;
    });
  };
}
