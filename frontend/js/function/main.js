// 타이틀 화면의 3D 장면을 시작하는 파일
//
// 폴더 안내
//   function/              기능: 장면이 돌아가게 하는 코드
//     main.js              시작, 매 프레임 반복 (이 파일)
//     timeline.js          CSS 강화 타임라인 값 읽기
//     stage.js             렌더러, 카메라, 조명, 화면 크기
//     menu.js              메뉴와 로그인 창의 키보드 동작 (Enter, Esc, 포커스)
//     auth.js              회원가입, 로그인 (서버와 주고받기)
//   design/                디자인: 화면에 보이는 것을 그리는 코드
//     background/          배경: 하늘, 산맥, 구름바다
//     objects/             물체: 섬, 돌 조각, 검, 등급 고리
//     effects/             효과: 불씨, 불꽃, 충격파, 빛 기둥, 빛 번짐
//     shared/              공용 그림 도구: 셰이더 노이즈, 텍스처
//
// 모든 부품 파일은 같은 규칙을 따른다
//   create(무대, 상태)              → 처음에 한 번 만들고, 매 프레임 부를 update 함수를 돌려준다
//   update(상태, 시간, 프레임 간격)  → 강화 타임라인(css/timeline.css) 값에 맞춰 모습을 고친다

// 기능
import { state, readTimeline } from "./timeline.js"; // 강화 상태
import * as stage from "./stage.js"; // 무대

// 디자인
import * as sky from "../design/background/sky.js"; // 하늘
import * as mountains from "../design/background/mountains.js"; // 산맥
import * as clouds from "../design/background/clouds.js"; // 구름바다
import * as island from "../design/objects/island.js"; // 섬과 마법진
import * as rocks from "../design/objects/rocks.js"; // 돌 조각
import * as sword from "../design/objects/sword.js"; // 검
import * as rings from "../design/objects/rings.js"; // 등급 고리
import * as embers from "../design/effects/embers.js"; // 불씨
import * as sparks from "../design/effects/sparks.js"; // 불꽃
import * as shock from "../design/effects/shock.js"; // 충격파
import * as pillar from "../design/effects/pillar.js"; // 빛 기둥
import * as bloom from "../design/effects/bloom.js"; // 빛 번짐

const world = stage.create(document.getElementById("scene")); // 무대 만들기

const parts = [
  sky,
  mountains,
  clouds,
  island,
  rocks,
  sword,
  rings,
  embers,
  sparks,
  shock,
  pillar,
  bloom,
]; // 그리는 순서 (빛 번짐이 맨 마지막)
const updates = parts.map((part) => part.create(world, state)); // 부품 만들기

const still = matchMedia("(prefers-reduced-motion: reduce)").matches; // 움직임 줄이기 설정을 켠 사용자
const STILL_TIME = state.intro + 8; // 그 사용자에게 보여 줄 멈춘 한 순간 (등장 연출이 다 끝난 뒤)

let last = 0; // 지난 프레임 시각
world.renderer.setAnimationLoop((ms) => {
  const now = ms / 1000; // 시작 후 지난 시간(초)
  const dt = Math.min(now - last, 0.05); // 프레임 간격 (멈춘 화면에서도 고리가 제자리를 찾아가도록 실제 시간으로)
  last = now;
  const t = still ? STILL_TIME : now; // 장면 시간 (움직임 줄이기면 멈춘 한 장면)
  readTimeline(t); // CSS 타임라인 값 읽기
  world.update(state, t); // 카메라 움직이기
  for (const update of updates) update(state, t, dt); // 부품 고치기
}); // 매 프레임 반복
