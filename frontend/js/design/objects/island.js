// 떠 있는 섬: 십각형 돌 제단과 아래로 뾰족한 바위,
// 그 위에서 서로 반대로 도는 마법진 두 겹과 바닥에 번지는 빛.
import * as THREE from 'three';
import { circleTexture, glowTexture } from '../shared/textures.js';

export const ISLAND_TOP = -2.15; // 제단 윗면 높이

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

export function create({ scene }) { // 섬 만들기
  const stone = new THREE.MeshStandardMaterial({ color: 0x2b2a48, roughness: 0.92, flatShading: true }); // 돌 재질
  const brass = new THREE.MeshStandardMaterial({ color: 0xc79c5c, metalness: 1, roughness: 0.35 }); // 놋쇠 재질

  const altar = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.38, 0.34, 10), stone); // 제단 (십각형 돌판)
  altar.position.y = ISLAND_TOP - 0.17;
  const trim = new THREE.Mesh(new THREE.CylinderGeometry(2.53, 2.53, 0.05, 10, 1, true), brass); // 제단 테두리 띠
  trim.position.y = ISLAND_TOP - 0.03;
  const rock = new THREE.Mesh(roughen(new THREE.ConeGeometry(2.38, 3.4, 10, 5), 0.35, 1.69), stone); // 섬 아래 바위
  rock.rotation.x = Math.PI; // 뾰족한 쪽이 아래로
  rock.position.y = ISLAND_TOP - 2.04;
  scene.add(altar, trim, rock);

  // 마법진 한 겹: 빛을 더하듯 그려지는(Additive) 원판
  const texture = circleTexture(); // 마법진 그림
  const magicCircle = (radius, lift) => { // 마법진
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 96), material);
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = ISLAND_TOP + lift;
    scene.add(disc);
    return disc;
  };
  const outer = magicCircle(2.25, 0.006); // 마법진 (바깥, 큰 원)
  const inner = magicCircle(1.05, 0.012); // 마법진 (안쪽, 작은 원)

  const ground = new THREE.Mesh( // 바닥에 번지는 빛
    new THREE.PlaneGeometry(6, 6),
    new THREE.MeshBasicMaterial({ map: glowTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = ISLAND_TOP + 0.02;
  scene.add(ground);

  return (s, t) => { // 매 프레임: 섬
    // 기를 모을 때 어두워지고, 등급이 오를수록, 내려치는 순간 더 밝게
    const glow = 0.45 - s.charge * 0.25 + s.level * 0.12 + s.pulse * 0.5; // 마법진 밝기
    outer.rotation.z = t * 0.05; // 바깥 마법진 돌리기
    inner.rotation.z = -t * 0.09; // 안쪽 마법진 반대로 돌리기
    outer.material.color.copy(s.light).multiplyScalar(glow); // 마법진 색
    inner.material.color.copy(s.light).multiplyScalar(glow * 1.25);
    ground.material.color.copy(s.light); // 바닥 빛 색
    ground.material.opacity = 0.25 + glow * 0.3;
  };
}
