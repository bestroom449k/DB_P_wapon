// 게임 화면의 버튼과 골드 표시
//   - 위 오른쪽 골드: 서버(server/src/routes/auth.js의 /api/auth/me)에서 내 골드를 받아 보여 준다 (로그인 전이면 "로그인 전" 그대로)
//   - 1회 뽑기: 서버(server/src/routes/gacha.js)가 등급과 아이템을 정하고 골드, 인벤토리, 도감까지 저장한다.
//     화면은 받은 등급에 맞는 영상(css/game/summon.css)을 틀고(1~4등급 일반판 15초, 5등급 황금판 20초),
//     카드가 멈추면 결과 명판을 띄운다. 움직임 줄이기를 켰으면 영상 없이 명판만 띄운다
//   - 기능 메뉴(game.html의 링크): 강화·도감·상점·거래소는 atelier.html의 각 탭, 커뮤니티는 board.html로 간다
//   확률 창은 HTML popover라서 JS 없이 열리고 닫힌다.
//
// 뽑기 영상 작동 원리
//   1. 버튼 → POST /api/gacha/draw: 서버가 등급을 정하고 골드, 인벤토리, 도감을 저장한다 (영상을 틀기 전에 결과가 확정된다)
//   2. 받은 등급으로 영상을 고른다: 5등급 = gacha-legendary.mp4, 나머지 = gacha-normal.mp4 (game.html이 미리 불러 둔다)
//   3. html에 is-summoning을 붙여 3D 그리기를 멈춘다 (그래픽카드를 영상에 양보해서 끊기지 않게)
//   4. timeupdate로 재생 시간을 보다가 SETTLE 시각이 되면 결과 명판을 띄운다 (건너뛰기는 그 시각으로 바로 이동)
//   5. 확인이나 Esc → 0.3초 동안 걷히고 3D 화면으로 돌아온다
// 관련 파일: game.html, css/game/summon.css, js/game/main.js, server/src/routes/gacha.js, frontend/video/
import { api } from '../../shared/api.js';
import { showToast } from '../../shared/page.js';

const root = document.documentElement;
const goldValue = document.getElementById('goldValue'); // 골드 숫자
const goldUnit = document.getElementById('goldUnit'); // "골드" 글자 (숫자가 있을 때만 보임)
const drawButton = document.getElementById('drawButton'); // 1회 뽑기
const drawText = document.getElementById('drawText'); // 버튼 글자

function showGold(gold) { // 위 오른쪽 골드 숫자
  goldValue.textContent = Number(gold).toLocaleString('ko-KR');
  goldUnit.hidden = false;
}

api('/auth/me') // 내 골드 (로그인 전이거나 서버가 꺼져 있으면 "로그인 전" 그대로)
  .then(({ user }) => {
    if (user) showGold(user.gold);
  })
  .catch(() => {});

// 뽑기 영상 (Kling으로 만든 두 영상: 1~4등급 일반판 15초, 5등급 황금판 20초)
const summon = document.getElementById('summon'); // 영상 층
const summonSkip = document.getElementById('summonSkip'); // 건너뛰기
const videos = { normal: document.getElementById('summonNormal'), legendary: document.getElementById('summonLegendary') }; // 등급에 따라 고를 영상 두 개
// 카드가 정면으로 멈추는 시각(초): 여기서 결과를 알리고, 건너뛰면 여기로 간다.
// 영상의 키프레임 자리(ffprobe로 확인)라서 건너뛰면 그 장면이 바로 뜬다. 영상을 바꾸면 다시 확인할 것
const SETTLE = { normal: 13.1, legendary: 18.1 }; // 일반판 13.1초, 황금판 18.1초
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)'); // 움직임 줄이기 설정

// 결과 명판
const result = document.getElementById('result'); // 결과 명판 전체
const resultOk = document.getElementById('resultOk'); // 확인
let closeSummon = null; // 지금 열린 뽑기를 닫는 함수 (확인, Esc)

function finishDraw() { // 뽑기가 끝나면 버튼을 다시 켠다
  drawButton.disabled = false;
  drawText.textContent = '1회 뽑기';
  drawButton.focus({ preventScroll: true });
}

function fillResult(data) { // 명판 채우기: 등급 색, "N등급 이름", 아이템 이름과 설명, 처음 얻었는지
  result.style.setProperty('--c', `var(--g${data.grade})`); // 명판 색을 그 등급 색으로
  const name = document.createElement('b');
  name.textContent = data.gradeName;
  document.getElementById('resultGrade').replaceChildren(`${data.grade}등급 `, name);
  document.getElementById('resultName').textContent = data.item.name;
  document.getElementById('resultDesc').textContent = data.item.description;
  document.getElementById('resultNew').hidden = !data.isNew; // 처음 얻었을 때만 도감 안내
}

function openSummon(data) { // 등급에 맞는 영상을 틀고, 카드가 멈추면 결과 명판을 띄운다
  const kind = data.grade === 5 ? 'legendary' : 'normal'; // 5등급만 황금판
  const video = reduceMotion.matches ? null : videos[kind]; // 움직임 줄이기면 영상 없이
  let shown = false; // 명판을 이미 띄웠는지 (시간 도달과 건너뛰기가 겹쳐도 한 번만)
  let skipTimer = 0; // 건너뛰기 버튼을 띄우는 타이머
  fillResult(data);

  const showResult = () => { // 결과 명판 띄우기
    if (shown) return;
    shown = true;
    clearTimeout(skipTimer);
    summon.classList.remove('can-skip');
    result.hidden = false;
    void result.offsetWidth; // 숨김을 푼 모습을 먼저 계산시켜 나타나는 전환이 보이게
    result.classList.add('is-shown'); // CSS가 명판을 떠오르게 한다
    resultOk.focus({ preventScroll: true }); // Enter로 바로 확인할 수 있게
  };
  const onTime = () => { // 영상이 재생되는 동안 시간 확인
    if (video.currentTime >= SETTLE[kind]) showResult(); // 카드가 멈추는 시각이 되면 결과
  };
  closeSummon = () => { // 확인: 영상과 명판이 0.3초 동안 함께 걷히며 3D 화면으로
    closeSummon = null;
    clearTimeout(skipTimer);
    root.classList.remove('is-summoning'); // 3D 장면을 다시 그린다 (걷히는 동안 뒤에서 움직이게 먼저 뗀다)
    video?.removeEventListener('timeupdate', onTime);
    summon.classList.remove('is-playing', 'can-skip');
    result.classList.remove('is-shown');
    setTimeout(() => { // 0.3초 걷히는 전환이 끝난 뒤 정리
      if (video) {
        video.pause(); // 영상 멈추기
        video.hidden = true;
      }
      summon.hidden = true;
      summon.classList.remove('is-dim');
      result.hidden = true;
      finishDraw();
    }, 300);
  };

  summon.hidden = false; // 영상 층 보이기
  if (video) { // 영상이 끝나도 닫지 않고 마지막 장면에 멈춰 둔다 (확인을 누르면 닫힘)
    video.hidden = false; // 고른 영상만 보이기
    video.currentTime = 0; // 처음부터
    video.addEventListener('timeupdate', onTime); // 재생 시간이 바뀔 때마다 확인
    summonSkip.onclick = () => { // 건너뛰면 카드가 멈추는 장면으로 가고 결과를 바로 띄운다
      video.currentTime = Math.max(video.currentTime, SETTLE[kind]); // 이미 지났으면 되감지 않는다
      showResult();
    };
    skipTimer = setTimeout(() => summon.classList.add('can-skip'), 2000); // 2초 뒤 건너뛰기 버튼
    video.play().catch(showResult); // 영상을 못 틀면 바로 결과로
  } else {
    summon.classList.add('is-dim'); // 영상 대신 화면만 어둡게
  }
  void summon.offsetWidth; // 숨김을 푼 모습을 먼저 그려서 0.3초 섞어 넘기기가 보이게
  summon.classList.add('is-playing'); // CSS가 0.3초 동안 영상으로 넘긴다
  root.classList.add('is-summoning'); // 영상이 덮는 동안 3D 장면은 그리지 않는다 (game/main.js가 읽음, 영상이 끊기지 않게)
  if (!video) showResult(); // 영상이 없으면 바로 결과
}

resultOk.addEventListener('click', () => closeSummon?.()); // 확인 버튼
addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && closeSummon && !result.hidden) closeSummon(); // 결과가 뜬 뒤에만 Esc로 닫기
});

drawButton.addEventListener('click', async () => { // 1회 뽑기: 서버가 결과를 정하고 저장한 뒤 영상을 튼다
  if (drawButton.disabled) return;
  drawButton.disabled = true; // 끝날 때까지 다시 못 누르게
  drawText.textContent = '뽑는 중';
  let data = null;
  try {
    data = await api('/gacha/draw', { method: 'POST' }); // 서버가 결과를 정하고 저장한다
  } catch (err) {
    showToast(err.message); // 골드 부족, 로그인 필요 같은 서버 문구
    finishDraw();
    return;
  }
  showGold(data.gold); // 줄어든 골드 표시
  openSummon(data); // 영상 시작
});
