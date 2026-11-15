// 룬 각인: 등급이 오르기 직전 룬 조각들이 책 둘레를 돌며 모여들고(--charge), 새겨지는 순간(--pulse) 빛나는 룬이 사방으로 퍼져 떠오른다.
// 대장간의 불꽃과 달리 중력으로 떨어지지 않고, 마법처럼 천천히 위로 흩어지며 사라진다.
import * as THREE from 'three';
import { BOOK_Y } from '../objects/grimoire.js';
import { glyphTextures } from '../objects/grimoire-textures.js';
import { GLOW } from '../shared/materials.js';

const GATHER = 12; // 모여드는 룬 조각 수
const BURST = 90; // 한꺼번에 퍼질 수 있는 룬 수
const CENTER = new THREE.Vector3(0, BOOK_Y + 0.2, 0); // 룬이 모여드는 곳 (책 표지 가운데)
const smooth = THREE.MathUtils.smoothstep;

export function create({ scene }) { // 룬 조각 만들기
  const glyphs = glyphTextures(); // 룬 글자 그림 6종
  const sprite = (i) => { // 룬 조각 하나 (처음에는 숨김)
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ ...GLOW, map: glyphs[i % glyphs.length], toneMapped: false }));
    s.visible = false;
    scene.add(s);
    return s;
  };

  // 모여드는 룬: 저마다 다른 높이와 거리에서 출발해 나선을 그리며 표지로 빨려 든다
  const gathers = Array.from({ length: GATHER }, (_, i) => ({
    sprite: sprite(i),
    angle: (i / GATHER) * Math.PI * 2,
    radius: 2.3 + (i % 3) * 0.3,
    height: ((i * 7) % 5) / 4 - 0.4, // -0.4 ~ 0.6
  }));

  // 퍼지는 룬: 새겨지는 순간 표지에서 나와 바깥으로 퍼지며 떠오른다
  const bursts = Array.from({ length: BURST }, (_, i) => ({ sprite: sprite(i + 3), velocity: new THREE.Vector3(), life: 0, lifespan: 1, size: 0.2, spin: 0 }));
  let next = 0; // 다음에 쓸 룬 번호 (다 쓰면 처음부터 다시)
  let armed = true; // 한 번 퍼진 뒤 --pulse가 잦아들어야 다시 퍼질 수 있다

  function burst(light, amount, power) { // 룬 퍼뜨리기
    for (let k = 0; k < amount; k++, next = (next + 1) % BURST) {
      const b = bursts[next];
      const a = Math.random() * Math.PI * 2;
      const speed = (1.2 + Math.random() * 1.8) * power;
      b.sprite.position.copy(CENTER);
      b.velocity.set(Math.cos(a) * speed, (Math.random() - 0.3) * speed * 0.6, Math.sin(a) * speed); // 거의 수평으로, 살짝 위로
      b.life = b.lifespan = 0.9 + Math.random() * 0.9; // 0.9~1.8초
      b.size = 0.16 + Math.random() * 0.14;
      b.spin = (Math.random() - 0.5) * 3;
      b.sprite.material.color.copy(light).multiplyScalar(1.4 + Math.random() * 0.8);
      b.sprite.visible = true;
    }
  }

  return (s, t, dt) => { // 매 프레임: 룬 조각
    // 모여드는 룬 (--charge가 0이면 모두 숨김)
    const pull = smooth(s.charge, 0, 1) ** 1.4; // 끝으로 갈수록 빨리 빨려 든다
    for (const g of gathers) {
      g.sprite.visible = s.charge > 0.01;
      if (!g.sprite.visible) continue;
      const a = g.angle + t * 0.6 + pull * 2.4; // 책 둘레를 돌다가 점점 빨리
      const r = g.radius * (1 - pull);
      g.sprite.position.set(CENTER.x + Math.cos(a) * r, CENTER.y + g.height * (1 - pull), CENTER.z + Math.sin(a) * r);
      g.sprite.material.color.copy(s.light).multiplyScalar(1.2 + pull * 1.2);
      g.sprite.material.opacity = smooth(s.charge, 0, 0.25) * (1 - smooth(s.charge, 0.94, 1)); // 나타났다가 표지에 닿으면 사라짐
      g.sprite.material.rotation = a;
      g.sprite.scale.setScalar(0.3 * (1 - pull * 0.5));
    }

    // 새겨지는 순간 감지 → 퍼뜨리기
    if (s.pulse > 0.6 && armed) {
      const finale = s.pulse > 1.17; // 빛 기둥이 솟는 순간에는 더 크게
      burst(s.light, finale ? 36 : 14 + s.level * 5, finale ? 1.4 : 1); // 빛 기둥이 솟을 때는 조금 더 많이 (5등급이 짧아서 붐비지 않을 만큼만)
    }
    armed = s.pulse < 0.3;

    // 퍼지는 룬 움직이기
    const drag = Math.max(0, 1 - 1.6 * dt); // 공기 저항처럼 점점 느려짐
    for (const b of bursts) {
      if (!b.sprite.visible) continue;
      b.life -= dt;
      if (b.life <= 0) { b.sprite.visible = false; continue; }
      b.velocity.multiplyScalar(drag);
      b.velocity.y += 0.5 * dt; // 중력 대신 천천히 떠오름
      b.sprite.position.addScaledVector(b.velocity, dt);
      const k = b.life / b.lifespan; // 남은 수명 (1 → 0)
      b.sprite.material.opacity = Math.min(1, k * 1.6);
      b.sprite.material.rotation += b.spin * dt;
      b.sprite.scale.setScalar(b.size * (0.6 + (1 - k) * 0.6));
    }
  };
}
