// 카드 다섯 장: 위로 볼록한 호를 그리며 떠 있다. 가운데 카드가 가장 크고 앞에 있으며 빛난다.
// 마우스를 올린 카드는 살짝 떠오르고, 뽑기 연출 중에는 옆 카드가 모이고 가운데 카드가 떠올라 돈다.
import * as THREE from 'three';
import { GLOW } from '../../../design/shared/materials.js';
import { glowTexture } from '../../../design/shared/textures.js';
import { cardTexture, cardGlowTexture, CARD_ASPECT, GLOW_SCALE } from '../shared/textures.js';

export const CARD_CENTER = new THREE.Vector3(0, 3.1, 0.8); // 가운데 카드 자리 (궤도 고리, 빛 기둥도 여기를 기준으로 선다)
const HEIGHT = 2.2; // 카드 세로 길이
const GLOW_COLOR = new THREE.Color(0xd2c8ff); // 카드 테두리 빛 (라벤더)

// 카드 자리: 가운데에서 몇 번째인지(-2~2)로 정한다. 바깥으로 갈수록 낮아지고, 부채꼴로 기울고, 뒤로 물러난다
function slot(i, spread) {
  const a = Math.abs(i);
  return {
    x: Math.sign(i) * [0, 2.06, 3.85][a] * spread,
    y: CARD_CENTER.y - [0, 0.22, 0.82][a],
    z: CARD_CENTER.z - [0, 0.7, 1.2][a],
    tilt: -i * 0.13, // 부채꼴 기울기
    turn: -i * 0.16, // 가운데를 바라보게
    scale: [1.14, 1, 0.97][a],
  };
}

export function create(world) { // 카드 만들기 (world.spread, world.pointerOver는 화면 크기와 마우스에 따라 바뀌어서 매번 읽는다)
  const { scene, camera, pointer } = world;
  const texture = cardTexture();
  const cardGeometry = new THREE.PlaneGeometry(HEIGHT * CARD_ASPECT, HEIGHT);
  const glowGeometry = new THREE.PlaneGeometry(HEIGHT * CARD_ASPECT * GLOW_SCALE[0], HEIGHT * GLOW_SCALE[1]);

  const cards = [-2, -1, 0, 1, 2].map((i) => {
    const holder = new THREE.Group(); // 카드와 빛 테두리를 함께 움직이는 손잡이
    const face = new THREE.Mesh(cardGeometry, new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.02, side: THREE.DoubleSide }));
    face.renderOrder = 1; // 빛 기둥과 고리보다 먼저 그려 그 뒤를 가린다
    const glow = new THREE.Mesh(glowGeometry, new THREE.MeshBasicMaterial({ ...GLOW, map: cardGlowTexture(), color: GLOW_COLOR.clone() }));
    glow.position.z = -0.03;
    holder.add(glow, face);
    scene.add(holder);
    return { i, holder, face, glow, hover: 0 };
  });

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ ...GLOW, map: glowTexture(), color: new THREE.Color(0xb9afff) })); // 가운데 카드 뒤 후광
  halo.scale.setScalar(7.5);
  scene.add(halo);

  const raycaster = new THREE.Raycaster();
  const faces = cards.map((card) => card.face);
  let spin = 0; // 가운데 카드가 돈 각도
  const brightness = new THREE.Color();

  return (s, t, dt) => { // 매 프레임: 카드
    let hovered = null; // 마우스가 올라간 카드
    if (world.pointerOver) {
      raycaster.setFromCamera(pointer, camera);
      hovered = raycaster.intersectObjects(faces)[0]?.object ?? null;
    }

    const c = s.charge;
    spin += dt * c * c * 11; // 기를 모을수록 빨리 돈다
    if (c < 0.02) spin += (Math.round(spin / Math.PI) * Math.PI - spin) * Math.min(dt * 6, 1); // 다 돌면 앞면으로 멈춘다

    for (const card of cards) {
      const { i, holder, face, glow } = card;
      const p = slot(i, world.spread);
      const center = i === 0;
      card.hover += ((face === hovered ? 1 : 0) - card.hover) * Math.min(dt * 8, 1);
      const bob = Math.sin(t * 0.9 + i * 1.4) * 0.07; // 둥실둥실

      holder.position.set(
        p.x * (1 - c * 0.3), // 기를 모으면 가운데로 모인다
        p.y + bob + card.hover * 0.2 + (center ? c * 0.55 : c * 0.12),
        p.z + (center ? c * 0.4 : 0),
      );
      holder.rotation.set(0, p.turn + (center ? spin : 0), p.tilt * (1 - c * 0.5) + Math.sin(t * 0.6 + i) * 0.015);
      holder.scale.setScalar(p.scale * (1 + card.hover * 0.05 + (center ? c * 0.08 : 0)));

      const light = center ? 1.05 + c * 0.4 + s.flash * 1.2 : 0.9 + card.hover * 0.12 + c * 0.12; // 가운데 카드는 1보다 조금 밝아 흰 별이 번진다
      face.material.color.copy(brightness.setRGB(light, light, light * 1.03));
      const shine = center ? 1 + c * 1 + s.flash * 1.6 : 0.26 + card.hover * 0.45 + c * 0.3;
      glow.material.color.copy(GLOW_COLOR).multiplyScalar(shine);
    }

    halo.position.copy(cards[2].holder.position);
    halo.position.z -= 0.4;
    halo.material.opacity = 0.28 + c * 0.35 + s.flash * 0.5 + Math.sin(t * 1.3) * 0.04;
  };
}
