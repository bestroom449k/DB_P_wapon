import * as THREE from 'three';

// 코드로 직접 깎은 검. 칼끝이 아래를 향하고, 가드 높이가 y = 0이다.
// inlay(혈조의 빛)와 gem(보석)의 색이 강화 등급에 따라 바뀐다.
export function buildSword() {
  const sword = new THREE.Group();
  const body = new THREE.Group();
  sword.add(body);

  const steel = new THREE.MeshPhysicalMaterial({
    color: 0xdfe4f0,
    metalness: 1,
    roughness: 0.14,
    clearcoat: 0.7,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.35,
  });
  const brass = new THREE.MeshPhysicalMaterial({
    color: 0xc79c5c,
    metalness: 1,
    roughness: 0.3,
    envMapIntensity: 1.15,
  });
  const leather = new THREE.MeshStandardMaterial({ color: 0x2a1f35, roughness: 0.78, metalness: 0.05 });
  const inlay = new THREE.MeshBasicMaterial({ color: 0x8d93a6, toneMapped: false });
  const gem = new THREE.MeshStandardMaterial({
    color: 0x0c0c12,
    emissive: 0x8d93a6,
    emissiveIntensity: 2.4,
    roughness: 0.12,
    metalness: 0.2,
  });

  // 칼날
  const L = 2.75;
  const w = 0.16;
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-w, 0);
  bladeShape.lineTo(-w, -0.32);
  bladeShape.bezierCurveTo(-w, -1.55, -w * 0.92, -2.25, 0, -L);
  bladeShape.bezierCurveTo(w * 0.92, -2.25, w, -1.55, w, -0.32);
  bladeShape.lineTo(w, 0);
  bladeShape.closePath();
  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.024,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.055,
    bevelSegments: 1,
    curveSegments: 32,
  });
  bladeGeo.translate(0, 0, -0.012);
  body.add(new THREE.Mesh(bladeGeo, steel));

  // 혈조: 등급 색으로 빛나는 홈 (앞뒤 양면)
  const fw = 0.03;
  const fuller = new THREE.Shape();
  fuller.moveTo(-fw, -0.2);
  fuller.lineTo(-fw, -1.7);
  fuller.quadraticCurveTo(-fw, -1.95, 0, -2.12);
  fuller.quadraticCurveTo(fw, -1.95, fw, -1.7);
  fuller.lineTo(fw, -0.2);
  fuller.quadraticCurveTo(0, -0.12, -fw, -0.2);
  const fullerGeo = new THREE.ShapeGeometry(fuller, 16);
  const fullerFront = new THREE.Mesh(fullerGeo, inlay);
  fullerFront.position.z = 0.0535;
  const fullerBack = fullerFront.clone();
  fullerBack.rotation.y = Math.PI;
  fullerBack.position.z = -0.0535;
  body.add(fullerFront, fullerBack);

  // 가드: 양 끝이 손잡이 쪽으로 말려 올라간다
  const gs = new THREE.Shape();
  gs.moveTo(-0.16, -0.09);
  gs.quadraticCurveTo(-0.5, -0.1, -0.78, 0.06);
  gs.quadraticCurveTo(-0.92, 0.13, -0.86, 0.23);
  gs.quadraticCurveTo(-0.8, 0.14, -0.7, 0.12);
  gs.quadraticCurveTo(-0.45, 0.04, -0.16, 0.08);
  gs.lineTo(0.16, 0.08);
  gs.quadraticCurveTo(0.45, 0.04, 0.7, 0.12);
  gs.quadraticCurveTo(0.8, 0.14, 0.86, 0.23);
  gs.quadraticCurveTo(0.92, 0.13, 0.78, 0.06);
  gs.quadraticCurveTo(0.5, -0.1, 0.16, -0.09);
  gs.closePath();
  const guardGeo = new THREE.ExtrudeGeometry(gs, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.02,
    bevelSegments: 3,
    curveSegments: 24,
  });
  guardGeo.translate(0, 0, -0.05);
  body.add(new THREE.Mesh(guardGeo, brass));

  const boss = new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 20), brass);
  boss.scale.set(1, 0.78, 0.62);
  body.add(boss);

  const gemGeo = new THREE.OctahedronGeometry(0.075, 0);
  const gemFront = new THREE.Mesh(gemGeo, gem);
  gemFront.scale.set(1, 1.35, 0.55);
  gemFront.position.z = 0.1;
  const gemBack = gemFront.clone();
  gemBack.position.z = -0.1;
  body.add(gemFront, gemBack);

  // 손잡이와 감개
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.066, 0.7, 24), leather);
  grip.position.y = 0.43;
  body.add(grip);
  const wrapGeo = new THREE.TorusGeometry(0.064, 0.011, 8, 32);
  for (let i = 0; i < 7; i++) {
    const wrap = new THREE.Mesh(wrapGeo, leather);
    wrap.position.y = 0.14 + i * 0.096;
    wrap.rotation.x = Math.PI / 2;
    wrap.rotation.y = i % 2 ? 0.22 : -0.22;
    body.add(wrap);
  }
  const collarGeo = new THREE.TorusGeometry(0.07, 0.019, 10, 32);
  for (const y of [0.1, 0.78]) {
    const collar = new THREE.Mesh(collarGeo, brass);
    collar.position.y = y;
    collar.rotation.x = Math.PI / 2;
    body.add(collar);
  }

  // 폼멜
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.105, 32, 20), brass);
  pommel.position.y = 0.9;
  pommel.scale.set(1, 0.9, 0.75);
  body.add(pommel);
  const pommelGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.04, 0), gem);
  pommelGem.position.set(0, 0.9, 0.078);
  pommelGem.scale.set(1, 1.3, 0.5);
  const pommelGemBack = pommelGem.clone();
  pommelGemBack.position.z = -0.078;
  body.add(pommelGem, pommelGemBack);
  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.1, 16), brass);
  finial.position.y = 1.03;
  body.add(finial);

  // 검 전체의 중심이 원점에 오도록
  body.position.y = 0.85;

  return { sword, inlay, gem };
}
