// 게임 화면의 버튼과 골드 표시
//   - 위 오른쪽 골드: 서버(server/src/routes/auth.js의 /api/auth/me)에서 내 골드를 받아 보여 준다 (로그인 전이면 "로그인 전" 그대로)
//   - 1회 뽑기: 서버(server/src/routes/gacha.js)가 등급과 아이템을 정하고 골드, 인벤토리, 도감까지 저장한다.
//     화면은 받은 등급에 맞는 영상(css/game/summon.css)을 틀고(1~4등급 일반판 15초, 5등급 황금판 20초),
//     카드가 멈추면 결과 명판을 띄운다. 움직임 줄이기를 켰으면 영상 없이 명판만 띄운다
//   - 기능 메뉴(game.html의 링크): 강화·도감·상점은 atelier.html의 각 탭, 커뮤니티는 board.html로 간다 (거래소는 만들 때 다시 넣는다)
//   확률 창은 HTML popover라서 JS 없이 열리고 닫힌다.
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
const videos = { normal: document.getElementById('summonNormal'), legendary: document.getElementById('summonLegendary') };
// 카드가 정면으로 멈추는 시각(초): 여기서 결과를 알리고, 건너뛰면 여기로 간다.
// 영상의 키프레임 자리(ffprobe로 확인)라서 건너뛰면 그 장면이 바로 뜬다. 영상을 바꾸면 다시 확인할 것
const SETTLE = { normal: 13.1, legendary: 18.1 };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)'); // 움직임 줄이기 설정

// 결과 명판
const result = document.getElementById('result');
const resultOk = document.getElementById('resultOk'); // 확인
let closeSummon = null; // 지금 열린 뽑기를 닫는 함수 (확인, Esc)

function finishDraw() { // 뽑기가 끝나면 버튼을 다시 켠다
  drawButton.disabled = false;
  drawText.textContent = '1회 뽑기';
  drawButton.focus({ preventScroll: true });
}

function fillResult(data) { // 명판 채우기: 등급 색, "N등급 이름", 아이템 이름과 설명, 처음 얻었는지
  result.style.setProperty('--c', `var(--g${data.grade})`);
  const name = document.createElement('b');
  name.textContent = data.gradeName;
  document.getElementById('resultGrade').replaceChildren(`${data.grade}등급 `, name);
  document.getElementById('resultName').textContent = data.item.name;
  document.getElementById('resultDesc').textContent = data.item.description;
  document.getElementById('resultNew').hidden = !data.isNew;
}

function openSummon(data) { // 등급에 맞는 영상을 틀고, 카드가 멈추면 결과 명판을 띄운다
  const kind = data.grade === 5 ? 'legendary' : 'normal';
  const video = reduceMotion.matches ? null : videos[kind]; // 움직임 줄이기면 영상 없이
  let shown = false;
  let skipTimer = 0; // 건너뛰기 버튼을 띄우는 타이머
  fillResult(data);

  const showResult = () => {
    if (shown) return;
    shown = true;
    clearTimeout(skipTimer);
    summon.classList.remove('can-skip');
    result.hidden = false;
    void result.offsetWidth;
    result.classList.add('is-shown');
    resultOk.focus({ preventScroll: true });
  };
  const onTime = () => {
    if (video.currentTime >= SETTLE[kind]) showResult();
  };
  closeSummon = () => { // 확인: 영상과 명판이 0.3초 동안 함께 걷히며 3D 화면으로
    closeSummon = null;
    clearTimeout(skipTimer);
    root.classList.remove('is-summoning'); // 3D 장면을 다시 그린다 (걷히는 동안 뒤에서 움직이게 먼저 뗀다)
    video?.removeEventListener('timeupdate', onTime);
    summon.classList.remove('is-playing', 'can-skip');
    result.classList.remove('is-shown');
    setTimeout(() => {
      if (video) {
        video.pause();
        video.hidden = true;
      }
      summon.hidden = true;
      summon.classList.remove('is-dim');
      result.hidden = true;
      finishDraw();
    }, 300);
  };

  summon.hidden = false;
  if (video) { // 영상이 끝나도 닫지 않고 마지막 장면에 멈춰 둔다 (확인을 누르면 닫힘)
    video.hidden = false;
    video.currentTime = 0;
    video.addEventListener('timeupdate', onTime);
    summonSkip.onclick = () => { // 건너뛰면 카드가 멈추는 장면으로 가고 결과를 바로 띄운다
      video.currentTime = Math.max(video.currentTime, SETTLE[kind]);
      showResult();
    };
    skipTimer = setTimeout(() => summon.classList.add('can-skip'), 2000); // 2초 뒤 건너뛰기 버튼
    video.play().catch(showResult); // 영상을 못 틀면 바로 결과로
  } else {
    summon.classList.add('is-dim');
  }
  void summon.offsetWidth; // 숨김을 푼 모습을 먼저 그려서 0.3초 섞어 넘기기가 보이게
  summon.classList.add('is-playing');
  root.classList.add('is-summoning'); // 영상이 덮는 동안 3D 장면은 그리지 않는다 (game/main.js가 읽음, 영상이 끊기지 않게)
  if (!video) showResult();
}

resultOk.addEventListener('click', () => closeSummon?.());
addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && closeSummon && !result.hidden) closeSummon();
});

drawButton.addEventListener('click', async () => { // 1회 뽑기: 서버가 결과를 정하고 저장한 뒤 영상을 튼다
  if (drawButton.disabled) return;
  drawButton.disabled = true; // 끝날 때까지 다시 못 누르게
  drawText.textContent = '뽑는 중';
  let data = null;
  try {
    data = await api('/gacha/draw', { method: 'POST' });
  } catch (err) {
    showToast(err.message);
    finishDraw();
    return;
  }
  showGold(data.gold);
  openSummon(data);
});
