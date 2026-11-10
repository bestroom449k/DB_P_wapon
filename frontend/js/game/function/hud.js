// 게임 화면의 버튼과 골드 표시
//   - 위 오른쪽 골드: 서버(server/src/routes/auth.js의 /api/auth/me)에서 내 골드를 받아 보여 준다
//   - 1회 뽑기: 뽑기 연출(css/game/timeline.css)을 한 번 돌린다. 뽑기 기능 자체는 아직 없어서 끝나면 준비 중 알림을 띄운다
//   - 기능 메뉴(강화, 도감, 상점, 거래소): 아직 없는 화면이라 준비 중 알림만 띄운다
//   확률 창은 HTML popover라서 JS 없이 열리고 닫힌다.

const root = document.documentElement;
const goldValue = document.getElementById('goldValue'); // 골드 숫자
const drawButton = document.getElementById('drawButton'); // 1회 뽑기
const drawText = document.getElementById('drawText'); // 버튼 글자
const toast = document.getElementById('toast'); // 알림

function showToast(message) { // 알림 띄우기 (연달아 눌러도 처음부터 다시)
  toast.textContent = message;
  toast.classList.remove('is-shown');
  void toast.offsetWidth; // 애니메이션을 처음부터 다시 시작하게
  toast.classList.add('is-shown');
}

fetch('/api/auth/me') // 내 골드 (로그인 전이거나 서버가 꺼져 있으면 "-" 그대로)
  .then((res) => (res.ok ? res.json() : null))
  .then((data) => {
    if (data?.user) goldValue.textContent = Number(data.user.gold).toLocaleString('ko-KR');
  })
  .catch(() => {});

drawButton.addEventListener('click', () => { // 1회 뽑기
  if (root.classList.contains('is-drawing')) return;
  root.classList.add('is-drawing'); // 연출 시작 (css/game/timeline.css의 draw-cycle)
  drawButton.disabled = true; // 연출 중에는 다시 못 누르게
  drawText.textContent = '뽑는 중';
});

root.addEventListener('animationend', (event) => { // 연출이 끝나면
  if (event.target !== root || !event.animationName.startsWith('draw-')) return;
  root.classList.remove('is-drawing');
  drawButton.disabled = false;
  drawText.textContent = '1회 뽑기';
  drawButton.focus({ preventScroll: true });
  showToast('뽑기 기능은 아직 준비 중이에요');
});

for (const item of document.querySelectorAll('[data-soon]')) { // 기능 메뉴
  item.addEventListener('click', (event) => {
    event.preventDefault();
    showToast(item.dataset.soon);
  });
}
