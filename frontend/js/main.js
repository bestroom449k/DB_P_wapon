// JS가 맡는 일은 3D 장면 하나뿐이다.
// 로딩, 제목 등장, 메뉴, 창 열고 닫기, 등급 표시는 모두 css/title.css가 맡는다.
import { createScene } from './scene.js';
import { createRitual } from './ritual.js';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// CSS의 --intro(로딩 화면이 걷히는 시점)에 맞춰 3D 도입부를 시작한다
const INTRO_MS = 2400;

async function boot() {
  if (!window.gsap) {
    root.dataset.webgl = 'off';
    return;
  }

  let scene;
  try {
    scene = createScene(document.getElementById('scene'), { reducedMotion: reduced });
    scene.warmup();
  } catch (err) {
    console.error(err);
    root.dataset.webgl = 'off';
    return;
  }

  const ritual = createRitual(scene.rig, {
    reduced,
    onGrade: (n) => (root.dataset.grade = n), // 등급 이름, 색, 표시는 CSS가 바꾼다
  });

  // "게임 시작"을 누르면 카메라가 검 쪽으로 다가갔다 돌아온다
  addEventListener('hashchange', () => {
    if (location.hash === '#start') scene.pushIn();
  });

  await wait(Math.max(0, INTRO_MS - performance.now()));
  scene.start();
  scene.playIntro();
  gsap.delayedCall(2.4, () => ritual.start());
}

boot();
