// 게임 화면(뽑기)의 3D 장면을 시작하는 파일
//
// 폴더 안내 (타이틀 화면 js/function, js/design과 같은 나눔)
//   game/main.js                시작, 매 프레임 반복 (이 파일)
//   game/function/              기능: 장면이 돌아가게 하는 코드
//     stage.js                  렌더러, 카메라, 조명, 마우스, 화면 크기
//     timeline.js               CSS 뽑기 연출 타임라인 값 읽기
//     hud.js                    버튼, 골드 표시, 알림 (3D와 상관없는 화면 기능)
//   game/design/                디자인: 화면에 보이는 것을 그리는 코드
//     background/               배경: 낮 하늘, 뭉게구름, 떠 있는 섬, 하늘 성
//     objects/                  물체: 대리석 테라스, 기둥과 아치, 바닥 마법진, 카드, 궤도 고리
//     effects/                  효과: 빛 기둥, 반짝이, 빛 번짐
//     shared/                   공용: 텍스처, 돌 재질, 정해진 무작위 수
//
// 모든 부품 파일은 같은 규칙을 따른다
//   create(무대, 상태)              → 처음에 한 번 만들고, 매 프레임 부를 update 함수를 돌려준다
//   update(상태, 시간, 프레임 간격)  → 뽑기 연출 타임라인(css/game/timeline.css) 값에 맞춰 모습을 고친다

// 기능
import { state, readTimeline } from './function/timeline.js'; // 뽑기 상태
import * as stage from './function/stage.js'; // 무대

// 디자인
import * as sky from './design/background/sky.js'; // 낮 하늘
import * as clouds from './design/background/clouds.js'; // 뭉게구름
import * as islands from './design/background/islands.js'; // 떠 있는 섬
import * as castle from './design/background/castle.js'; // 하늘 성
import * as terrace from './design/objects/terrace.js'; // 대리석 바닥과 난간
import * as arches from './design/objects/arches.js'; // 기둥과 아치
import * as circle from './design/objects/circle.js'; // 바닥 마법진
import * as cards from './design/objects/cards.js'; // 카드 다섯 장
import * as orbits from './design/objects/orbits.js'; // 궤도 고리
import * as pillar from './design/effects/pillar.js'; // 빛 기둥
import * as sparkles from './design/effects/sparkles.js'; // 반짝이
import * as bloom from './design/effects/bloom.js'; // 빛 번짐

const world = stage.create(document.getElementById('stage')); // 무대 만들기

const parts = [sky, clouds, islands, castle, terrace, arches, circle, cards, orbits, pillar, sparkles, bloom]; // 그리는 순서 (빛 번짐이 맨 마지막)
const updates = parts.map((part) => part.create(world, state)); // 부품 만들기

const STILL_TIME = 6; // 움직임 줄이기: 장면을 이 시각의 모습으로 멈춘다
let last = 0; // 지난 프레임 시각
world.renderer.setAnimationLoop((ms) => {
  const now = ms / 1000;
  const dt = Math.min(now - last, 0.05); // 프레임 간격
  last = now;
  const t = state.still ? STILL_TIME : now; // 시작 후 지난 시간(초)
  readTimeline(); // CSS 타임라인 값 읽기
  world.update(state, now); // 카메라 움직이기
  for (const update of updates) update(state, t, state.still ? 0 : dt); // 부품 고치기
});
