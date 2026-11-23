// 게임 화면(뽑기)의 3D 장면을 시작하는 파일
//
// 폴더 안내 (타이틀 화면 js/function, js/design과 같은 나눔. 두 화면이 같이 쓰는 디자인 코드는 js/shared)
//   game/main.js                시작, 매 프레임 반복 (이 파일)
//   game/function/              기능: 장면이 돌아가게 하는 코드
//     stage.js                  렌더러, 카메라, 달빛 조명, 마우스, 화면 크기
//     state.js                  3D 부품이 같이 읽는 상태 (등급 색, 움직임 줄이기)
//     hud.js                    버튼, 골드 표시, 뽑기 영상과 결과 명판 (3D와 상관없는 화면 기능)
//   game/design/                디자인: 화면에 보이는 것을 그리는 코드
//     background/               배경: 밤 구름, 떠 있는 섬, 불 켜진 성 (밤하늘은 타이틀과 같이 쓰는 js/shared/sky.js)
//     objects/                  물체: 검은 대리석 테라스와 등불, 기둥과 아치, 바닥 마법진, 마도서 카드, 궤도 고리
//     effects/                  효과: 빛 기둥, 반짝이, 빛 번짐 (마력 가루는 타이틀과 같이 쓰는 js/shared/dust.js)
//     shared/                   게임 화면 공용: 카드·구름·룬 고리 그림, 돌 재질
//
// 모든 부품 파일은 같은 규칙을 따른다
//   create(무대, 상태)              → 처음에 한 번 만들고, 매 프레임 부를 update 함수를 돌려준다
//   update(상태, 시간, 프레임 간격)  → 시간에 맞춰 모습을 고친다

// 기능
import { state } from './function/state.js'; // 등급 색, 움직임 줄이기
import * as stage from './function/stage.js'; // 무대

// 디자인
import * as sky from '../shared/sky.js'; // 밤하늘 (타이틀 화면과 같은 하늘: 오로라, 별, 달)
import * as clouds from './design/background/clouds.js'; // 밤 구름
import * as islands from './design/background/islands.js'; // 떠 있는 섬
import * as castle from './design/background/castle.js'; // 불 켜진 하늘 성
import * as terrace from './design/objects/terrace.js'; // 검은 대리석 바닥, 난간, 등불
import * as arches from './design/objects/arches.js'; // 기둥과 아치
import * as circle from './design/objects/circle.js'; // 바닥 마법진
import * as cards from './design/objects/cards.js'; // 마도서 카드 다섯 장
import * as orbits from './design/objects/orbits.js'; // 궤도 고리
import * as pillar from './design/effects/pillar.js'; // 빛 기둥
import * as dust from '../shared/dust.js'; // 마력 가루 (타이틀 화면과 같은 가루)
import * as sparkles from './design/effects/sparkles.js'; // 반짝이
import * as bloom from './design/effects/bloom.js'; // 빛 번짐

const world = stage.create(document.getElementById('stage')); // 무대 만들기

const parts = [sky, clouds, islands, castle, terrace, arches, circle, cards, orbits, pillar, dust, sparkles, bloom]; // 그리는 순서 (빛 번짐이 맨 마지막)
const updates = parts.map((part) => part.create(world, state)); // 부품 만들기

const STILL_TIME = 6; // 움직임 줄이기: 장면을 이 시각의 모습으로 멈춘다
const root = document.documentElement;
let last = 0; // 지난 프레임 시각
world.renderer.setAnimationLoop((ms) => {
  if (root.classList.contains('is-summoning')) return; // 뽑기 영상이 화면을 덮는 동안은 그리지 않는다 (영상이 끊기지 않게, hud.js가 붙이고 뗀다)
  const now = ms / 1000;
  const dt = Math.min(now - last, 0.05); // 프레임 간격
  last = now;
  const t = state.still ? STILL_TIME : now; // 시작 후 지난 시간(초)
  world.update(state, now); // 카메라 움직이기
  for (const update of updates) update(state, t, state.still ? 0 : dt); // 부품 고치기
});
