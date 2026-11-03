import * as THREE from 'three';
import { MAX_GRADE, readGradeColors } from './grades.js';

// 타이틀 화면의 반복 애니메이션: 강화 의식.
// 검이 숨을 들이쉬듯 떠올랐다가 내려앉을 때마다 한 등급씩 오르고,
// 그 등급의 고리가 제자리를 찾아 정렬된다. 5등급에 닿으면 빛 기둥이 솟고
// 모든 고리가 풀려나며 1등급부터 다시 시작한다.
export function createRitual(rig, { onGrade, onStrike, onFinale, reduced = false } = {}) {
  const { state, rings } = rig;
  const colors = readGradeColors().map((hex) => new THREE.Color(hex));
  const colorOf = (n) => colors[n - 1];

  function setBase() {
    rings.forEach((r, i) => {
      r.align = i === 0 ? 1 : 0;
      r.glow = i === 0 ? 1.15 : 0.32;
    });
    state.gradeColor.copy(colorOf(1));
    onGrade?.(1);
  }

  function strike(n) {
    const ring = rings[n - 1];
    const c = colorOf(n);
    const tl = gsap.timeline();

    // 예비 동작: 검이 떠오르고 빛이 잦아든다
    tl.to(state, { lift: 1, inlayGlow: 1.3, circleGlow: 0.35, duration: 0.6, ease: 'sine.inOut' }, 0);
    tl.to(ring, { glow: 0.95, duration: 0.6, ease: 'sine.in' }, 0);

    // 내려앉는 순간
    tl.to(state, { lift: -0.45, duration: 0.12, ease: 'power3.in' }, 0.6);
    tl.addLabel('hit', 0.72);
    tl.call(
      () => {
        rig.emitSparks(c, 50 + n * 10);
        rig.emitShock(c, { scale: 5.6 + n * 0.5, width: 0.03 });
        rig.emitShock(c, { ground: true, scale: 5.6, duration: 1.5, width: 0.035 });
        onStrike?.(n);
        onGrade?.(n);
      },
      null,
      'hit',
    );
    tl.to(state, { lift: 0, duration: 1.0, ease: 'elastic.out(1, 0.45)' }, 'hit');
    tl.fromTo(state, { flash: 0.8 }, { flash: 0, duration: 0.7, ease: 'expo.out', immediateRender: false }, 'hit');
    tl.fromTo(state, { strike: 1 }, { strike: 0, duration: 0.9, ease: 'expo.out', immediateRender: false }, 'hit');
    tl.fromTo(state, { shake: 1 }, { shake: 0, duration: 0.45, ease: 'power2.out', immediateRender: false }, 'hit');
    tl.to(state.gradeColor, { r: c.r, g: c.g, b: c.b, duration: 0.35, ease: 'power2.out' }, 'hit');
    tl.to(state, { inlayGlow: 2.6, circleGlow: 0.6 + n * 0.12, aura: 0.4 + n * 0.05, duration: 0.6, ease: 'expo.out' }, 'hit');
    tl.to(ring, { align: 1, duration: 1.1, ease: 'expo.out' }, 'hit');
    tl.fromTo(ring, { glow: 2.6 }, { glow: 1.15, duration: 1.2, ease: 'expo.out', immediateRender: false }, 'hit');
    return tl;
  }

  function finale() {
    const star = colorOf(MAX_GRADE);
    const base = colorOf(1);
    const tl = gsap.timeline();
    tl.call(
      () => {
        rig.emitSparks(star, 200, { speed: [3, 8.5], up: 2.2, height: [-1.8, 1.4] });
        rig.emitShock(star, { scale: 9, duration: 1.9, width: 0.04 });
        rig.emitShock(star, { ground: true, scale: 9, duration: 2.2, width: 0.05 });
        onFinale?.();
      },
      null,
      0,
    );
    tl.to(state, { prism: 1, duration: 0.8, ease: 'power2.out' }, 0);
    tl.fromTo(state, { flash: 0.7 }, { flash: 0, duration: 1.5, ease: 'expo.out', immediateRender: false }, 0);
    tl.to(state, { pillar: 1, bloomBoost: 0.1, duration: 0.5, ease: 'expo.out' }, 0);
    tl.to(state, { spin: `+=${Math.PI * 2}`, duration: 2.2, ease: 'power3.inOut' }, 0);
    tl.to(state, { lift: 1.3, duration: 2.0, ease: 'sine.inOut' }, 0);
    tl.to(rings, { glow: 1.4, duration: 0.6, ease: 'expo.out', stagger: 0.05 }, 0);

    // 잠시 머문 뒤 모든 것이 풀려난다
    tl.addLabel('release', 3.4);
    tl.to(state, { pillar: 0, bloomBoost: 0, duration: 1.4, ease: 'sine.inOut' }, 'release');
    tl.to(state, { prism: 0, inlayGlow: 2.2, circleGlow: 0.6, aura: 0.45, lift: 0, duration: 1.9, ease: 'sine.inOut' }, 'release');
    tl.to(state.gradeColor, { r: base.r, g: base.g, b: base.b, duration: 1.9, ease: 'sine.inOut' }, 'release');
    tl.to(rings.slice(1).reverse(), { align: 0, glow: 0.32, duration: 1.9, ease: 'sine.inOut', stagger: 0.12 }, 'release');
    tl.to(rings[0], { glow: 1.15, duration: 1.2, ease: 'sine.inOut' }, 'release');
    tl.call(() => onGrade?.(1), null, 'release+=1');
    return tl;
  }

  function cycle() {
    const tl = gsap.timeline({ onComplete: cycle });
    let at = 0.8;
    for (let n = 2; n <= MAX_GRADE; n++) {
      tl.add(strike(n), at);
      at += 2.2;
    }
    tl.add(finale(), at - 0.6);
    tl.to({}, { duration: 1.2 });
    tl.timeScale(reduced ? 0.65 : 1);
  }

  return {
    start() {
      setBase();
      cycle();
    },
  };
}
