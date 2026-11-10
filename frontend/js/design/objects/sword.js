// 검: 코드로 깎은 칼날, 등급 색으로 빛나는 혈조(칼날의 홈)와 보석, 놋쇠 가드와 폼멜.
// 기를 모을 때 떠오르고, 내려치는 순간 가라앉고, 5등급에서는 높이 떠 한 바퀴 돈다.
// 다 만든 검은 빛 기둥을 타고 위로 올라가 보관되고(--reforge), 새 무쇠 검이 위에서 내려온다.
import * as THREE from 'three';
import { glowTexture } from '../shared/textures.js';
import { GLOW } from '../shared/materials.js';

export const SWORD_Y = 0.25; // 검 가운데 높이

function bladeShape() { // 칼날 모양 (옆에서 본 윤곽)
  const s = new THREE.Shape();
  s.moveTo(-0.16, 0);
  s.lineTo(-0.16, -0.32);
  s.bezierCurveTo(-0.16, -1.55, -0.147, -2.25, 0, -2.75); // 칼끝까지 부드럽게 좁아진다
  s.bezierCurveTo(0.147, -2.25, 0.16, -1.55, 0.16, -0.32);
  s.lineTo(0.16, 0);
  return s;
}

function guardShape() { // 가드 모양 (양 끝이 말려 올라간 초승달)
  const s = new THREE.Shape();
  s.moveTo(-0.16, -0.09);
  s.quadraticCurveTo(-0.5, -0.1, -0.78, 0.06);
  s.quadraticCurveTo(-0.92, 0.13, -0.86, 0.23); // 양 끝이 손잡이 쪽으로 말려 올라간다
  s.quadraticCurveTo(-0.8, 0.14, -0.7, 0.12);
  s.quadraticCurveTo(-0.45, 0.04, -0.16, 0.08);
  s.lineTo(0.16, 0.08);
  s.quadraticCurveTo(0.45, 0.04, 0.7, 0.12);
  s.quadraticCurveTo(0.8, 0.14, 0.86, 0.23);
  s.quadraticCurveTo(0.92, 0.13, 0.78, 0.06);
  s.quadraticCurveTo(0.5, -0.1, 0.16, -0.09);
  return s;
}

const FULLER = [[-0.03, -0.2], [-0.03, -1.7], [0, -2.12], [0.03, -1.7], [0.03, -0.2]]; // 혈조 모양 (가늘고 끝이 뾰족)

export function create({ scene }) { // 검 만들기
  const steel = new THREE.MeshPhysicalMaterial({ color: 0xdfe4f0, metalness: 1, roughness: 0.14, clearcoat: 0.7, clearcoatRoughness: 0.18, envMapIntensity: 1.35 }); // 강철 재질
  const brass = new THREE.MeshPhysicalMaterial({ color: 0xc79c5c, metalness: 1, roughness: 0.3 }); // 놋쇠 재질
  const leather = new THREE.MeshStandardMaterial({ color: 0x2a1f35, roughness: 0.78 }); // 가죽 재질
  const inlay = new THREE.MeshBasicMaterial({ toneMapped: false }); // 혈조 빛 재질 (등급 색)
  const gem = new THREE.MeshStandardMaterial({ color: 0x0c0c12, emissive: 0xffffff, roughness: 0.12 }); // 보석 재질 (등급 색)

  const body = new THREE.Group(); // 검 부품 묶음
  const part = (geometry, material, x = 0, y = 0, z = 0) => { // 부품 하나 붙이기
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    body.add(mesh);
    return mesh;
  };

  // 칼날과 앞뒤 혈조
  part(new THREE.ExtrudeGeometry(bladeShape(), { depth: 0.024, bevelThickness: 0.04, bevelSize: 0.055, bevelSegments: 1, curveSegments: 32 }), steel, 0, 0, -0.012); // 칼날
  const fuller = new THREE.ShapeGeometry(new THREE.Shape(FULLER.map(([x, y]) => new THREE.Vector2(x, y)))); // 혈조 판
  part(fuller, inlay, 0, 0, 0.0535); // 혈조 (앞면)
  part(fuller, inlay, 0, 0, -0.0535).rotation.y = Math.PI; // 혈조 (뒷면)

  // 가드, 가운데 장식, 앞뒤 보석
  part(new THREE.ExtrudeGeometry(guardShape(), { depth: 0.1, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 3 }), brass, 0, 0, -0.05); // 가드
  part(new THREE.SphereGeometry(0.17, 32, 20), brass).scale.set(1, 0.78, 0.62); // 가드 가운데 장식
  const gemShape = new THREE.OctahedronGeometry(0.075); // 보석 모양 (앞뒤가 같이 씀)
  for (const z of [0.1, -0.1]) part(gemShape, gem, 0, 0, z).scale.set(1, 1.35, 0.55); // 보석 (앞뒤)

  // 손잡이와 가죽 감개, 폼멜
  part(new THREE.CylinderGeometry(0.058, 0.066, 0.7, 24), leather, 0, 0.43); // 손잡이
  const wrapShape = new THREE.TorusGeometry(0.064, 0.011, 8, 32); // 감개 모양 (7줄이 같이 씀)
  for (let i = 0; i < 7; i++) {
    part(wrapShape, leather, 0, 0.14 + i * 0.096).rotation.set(Math.PI / 2, i % 2 ? 0.22 : -0.22, 0);
  } // 손잡이 가죽 감개 7줄
  part(new THREE.SphereGeometry(0.105, 32, 20), brass, 0, 0.9).scale.set(1, 0.9, 0.75); // 폼멜 (손잡이 끝 둥근 장식)
  part(new THREE.ConeGeometry(0.034, 0.1, 16), brass, 0, 1.03); // 폼멜 꼭지
  body.position.y = 0.85; // 검 전체의 가운데가 원점에 오도록

  const sword = new THREE.Group(); // 검 (움직이는 단위)
  sword.add(body);
  sword.scale.setScalar(1.1); // 크기
  scene.add(sword);

  const aura = new THREE.Sprite(new THREE.SpriteMaterial({ ...GLOW, map: glowTexture() })); // 검 뒤의 후광
  aura.scale.setScalar(6.5);
  scene.add(aura);

  return (s, t) => { // 매 프레임: 검
    const away = THREE.MathUtils.smoothstep(s.reforge, 0, 1) * 7; // 화면 위로 올라간 거리 (완성된 검 보관 → 새 검 등장)
    sword.position.y = SWORD_Y + Math.sin(t * 0.9) * 0.07 + s.charge * 0.22 - s.pulse * 0.1 + s.finale * 0.3 + away; // 높이 (둥실 + 기 모으기 + 내려치기 + 5등급 + 보관)
    sword.rotation.y = t * 0.32 + s.spin * Math.PI * 2; // 회전 (천천히 + 5등급 한 바퀴)
    sword.rotation.z = Math.sin(t * 0.5) * 0.035; // 살짝 기우뚱
    inlay.color.copy(s.light).multiplyScalar(2.2 - s.charge * 0.9 + s.pulse * 0.8); // 혈조 빛
    gem.emissive.copy(s.light); // 보석 빛
    gem.emissiveIntensity = 2.4 + s.pulse * 2;
    aura.position.set(0, sword.position.y, -0.8); // 후광이 검을 따라감
    aura.material.color.copy(s.light); // 후광 색
    aura.material.opacity = 0.4 + s.level * 0.03 + s.pulse * 0.3; // 후광 밝기
  };
}
