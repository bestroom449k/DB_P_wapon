// 테라스를 둘러싼 흰 대리석 건축: 왼쪽 아치문, 오른쪽 끝 큰 아치 기둥, 오른쪽 뒤 기둥 회랑, 왼쪽 앞 받침돌과 등.
// 장면의 양 끝을 액자처럼 감싸서 가운데 카드로 눈이 가게 한다.
import * as THREE from 'three';
import { marble, marbleTrim, leaves } from '../shared/stone.js';

function column(height, radius = 0.32) { // 기둥: 네모 받침, 둥근 몸통, 머리
  const group = new THREE.Group();
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(radius * 2.7, 0.26, radius * 2.7), marbleTrim);
  plinth.position.y = 0.13;
  const torus = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.18, radius * 1.25, 0.18, 20), marble);
  torus.position.y = 0.35;
  const shaftHeight = height - 0.86;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.9, radius, shaftHeight, 20), marble);
  shaft.position.y = 0.44 + shaftHeight / 2;
  const echinus = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.3, radius * 0.92, 0.22, 20), marble);
  echinus.position.y = height - 0.31;
  const abacus = new THREE.Mesh(new THREE.BoxGeometry(radius * 2.8, 0.2, radius * 2.8), marbleTrim);
  abacus.position.y = height - 0.1;
  group.add(plinth, torus, shaft, echinus, abacus);
  return group;
}

function portal({ width, height, opening, spring, depth }) { // 아치문: 반원 구멍이 뚫린 벽, 위 처마, 앞 기둥 두 개
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(width / 2, height);
  shape.lineTo(-width / 2, height);
  shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-opening / 2, 0);
  hole.lineTo(-opening / 2, spring);
  hole.absarc(0, spring, opening / 2, Math.PI, 0, true);
  hole.lineTo(opening / 2, 0);
  hole.closePath();
  shape.holes.push(hole);
  const wall = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 1, curveSegments: 32 }),
    marble,
  );
  wall.position.z = -depth / 2;
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(width + 0.5, 0.32, depth + 0.4), marbleTrim);
  cornice.position.y = height + 0.16;
  const attic = new THREE.Mesh(new THREE.BoxGeometry(width + 0.1, 0.8, depth + 0.1), marble);
  attic.position.y = height + 0.72;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, 0.2, depth + 0.3), marbleTrim);
  cap.position.y = height + 1.22;
  const key = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.6, depth + 0.12), marbleTrim); // 아치 꼭대기 쐐기돌
  key.position.y = spring + opening / 2 + 0.12;
  group.add(wall, cornice, attic, cap, key);
  for (const side of [-1, 1]) {
    const c = column(height, 0.3);
    c.position.set(side * (width / 2 - 0.5), 0, depth / 2 + 0.4);
    group.add(c);
  }
  return group;
}

function colonnade(count, gap, height) { // 기둥 회랑: 기둥 여러 개 위에 긴 처마
  const group = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const c = column(height, 0.34);
    c.position.x = (i - (count - 1) / 2) * gap;
    group.add(c);
  }
  const length = (count - 1) * gap + 1.4;
  const beam = new THREE.Mesh(new THREE.BoxGeometry(length, 0.55, 1.1), marble);
  beam.position.y = height + 0.27;
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(length + 0.4, 0.22, 1.4), marbleTrim);
  cornice.position.y = height + 0.66;
  group.add(beam, cornice);
  return group;
}

function pedestal() { // 계단 받침 위 짧은 기둥과 둥근 등
  const group = new THREE.Group();
  [[2.6, 0.32], [2.1, 0.3], [1.6, 0.28]].reduce((y, [size, h]) => {
    const step = new THREE.Mesh(new THREE.BoxGeometry(size, h, size), y === 0 ? marbleTrim : marble);
    step.position.y = y + h / 2;
    group.add(step);
    return y + h;
  }, 0);
  const c = column(1.9, 0.36);
  c.position.y = 0.9;
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.5, 1.5, 1.65) })); // 은은히 빛나는 등 (1보다 밝아서 빛이 번진다)
  lamp.position.y = 3.15;
  group.add(c, lamp);
  return group;
}

function planter() { // 오른쪽 앞 화분과 덤불
  const group = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.7, 1.1, 18), marble);
  pot.position.y = 0.55;
  group.add(pot);
  [[0, 1.5, 0, 0.75], [0.5, 1.3, 0.2, 0.55], [-0.5, 1.35, -0.1, 0.6], [0.1, 1.9, -0.2, 0.5]].forEach(([x, y, z, r], i) => {
    const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 3), leaves[i % leaves.length]);
    bush.position.set(x, y, z);
    group.add(bush);
  });
  return group;
}

export function create({ scene }) { // 건축물 배치
  const leftArch = portal({ width: 4.6, height: 6.4, opening: 2.8, spring: 3.4, depth: 0.9 }); // 왼쪽 아치문
  leftArch.position.set(-12.4, 0, -6.5);
  leftArch.rotation.y = 0.62;

  const rightArch = portal({ width: 5.6, height: 11.5, opening: 3.4, spring: 6.5, depth: 1.2 }); // 오른쪽 끝 큰 아치 (왼쪽 기둥만 화면 끝에 걸친다)
  rightArch.position.set(9.6, 0, 0);
  rightArch.rotation.y = -1.1;

  const frame = column(13, 0.6); // 오른쪽 맨 앞 큰 기둥 (화면 오른쪽 끝을 액자처럼)
  frame.position.set(6.5, 0, 3.4);

  const hall = colonnade(3, 2.3, 4.6); // 오른쪽 뒤 기둥 회랑
  hall.position.set(11.5, 0, -14);
  hall.rotation.y = -0.45;

  const lamp = pedestal(); // 왼쪽 앞 받침돌
  lamp.position.set(-6.8, 0, 2.5);
  lamp.rotation.y = 0.3;

  const pot = planter(); // 오른쪽 화분 (회랑 앞)
  pot.position.set(8.4, 0, -6.5);
  pot.scale.setScalar(0.85);

  scene.add(leftArch, rightArch, frame, hall, lamp, pot);
  return () => {}; // 건축물은 움직이지 않는다
}
