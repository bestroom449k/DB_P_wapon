// 여러 부품이 같이 쓰는 재질: 흰 대리석(테라스, 기둥, 아치), 섬 바위, 풀, 나뭇잎, 성벽과 지붕
import * as THREE from 'three';

export const marble = new THREE.MeshStandardMaterial({ color: 0xf3f0f9, roughness: 0.55 }); // 흰 대리석
export const marbleTrim = new THREE.MeshStandardMaterial({ color: 0xe4e0f0, roughness: 0.6 }); // 대리석 받침과 띠 (조금 어둡게 해서 모양이 읽히게)
export const rock = new THREE.MeshLambertMaterial({ color: 0xe0d2d8, flatShading: true }); // 섬 바위 (연한 베이지 라벤더)
export const grass = new THREE.MeshLambertMaterial({ color: 0x8cc673, flatShading: true }); // 섬 윗면 풀
export const leaves = [0x5f9f58, 0x76b866, 0x92cb76].map((color) => new THREE.MeshLambertMaterial({ color, flatShading: true })); // 나뭇잎 세 가지 초록
export const bark = new THREE.MeshLambertMaterial({ color: 0x8d7a72 }); // 나무 줄기
export const wall = new THREE.MeshLambertMaterial({ color: 0xf6f1fa }); // 성벽
export const roof = new THREE.MeshLambertMaterial({ color: 0xb4b9ee }); // 성 지붕 (옅은 라벤더 파랑)

// 꼭짓점을 위치에 따라 정해진 만큼 흔들어 울퉁불퉁한 바위처럼 만든다 (같은 위치는 같은 만큼 → 면이 안 갈라짐)
export function roughen(geometry, amount, keepAbove = Infinity) { // 바위 표면 울퉁불퉁하게
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
