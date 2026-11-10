// 메뉴와 로그인·회원가입 창의 키보드 동작
//   창을 열고 닫는 것은 CSS(:target)가 맡고, 이 파일은 키보드로 쓸 때 필요한 것만 더한다.
//   - 공방 문을 열면 "게임 시작"에 포커스 → Enter로 바로 고를 수 있다
//   - 창이 열리면 첫 입력칸에 포커스, 창 뒤 화면은 inert (Tab과 클릭이 닿지 않음)
//   - Esc로 창 닫기, 닫히면 창을 열었던 메뉴로 포커스가 돌아온다

const gate = document.getElementById('gate'); // 공방 문 (숨은 라디오 버튼)
const hud = document.querySelector('.hud'); // 제목과 메뉴
const menuStart = document.getElementById('menuStart'); // "게임 시작"
let opener = null; // 창을 열었던 메뉴

gate.addEventListener('change', () => menuStart.focus({ preventScroll: true })); // 문이 열리면 첫 메뉴로
hud.addEventListener('click', (event) => { // 메뉴를 누르면 (마우스든 Enter든 click이 생긴다) 그 메뉴를 기억
  opener = event.target.closest('a') ?? opener;
});

function syncPanel() { // 주소(#해시)가 바뀔 때마다 창 상태 맞추기
  const panel = document.querySelector('.panel:target'); // 열린 창 (없으면 null)
  hud.inert = gate.inert = Boolean(panel); // 창이 열려 있는 동안 뒤 화면은 Tab, 클릭이 닿지 않게
  for (const message of document.querySelectorAll('.form__error')) message.textContent = ''; // 지난 오류 지우기

  if (panel) {
    panel.querySelector('input')?.focus({ preventScroll: true }); // 첫 입력칸에 바로 쓸 수 있게
  } else if (opener) {
    opener.focus({ preventScroll: true }); // 창이 닫히면 원래 메뉴로
    opener = null;
  }
}
addEventListener('hashchange', syncPanel);
syncPanel();

addEventListener('keydown', (event) => { // Esc로 창 닫기
  if (event.key === 'Escape' && document.querySelector('.panel:target')) location.hash = '';
});
