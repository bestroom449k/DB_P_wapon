// 공방 입장: 로그인한 뒤 "게임 시작"을 누르면 주소가 #enter가 되고,
// CSS(:target)가 책이 펼쳐지고 책장이 넘어가며 책 속으로 들어가는 연출(css/timeline.css의 enter-book)과
// 그 끝에 화면을 채우는 책장 빛(css/title.css의 .portal)을 같은 길이로 돌린다.
// 이 파일은 책장 빛이 다 차오르는 순간 게임 화면(game.html)으로 넘기는 일만 한다.
//
// 책 넘김 작동 원리 (3.6초)
//   1. "게임 시작" 링크가 주소를 #enter로 바꾼다 (로그인했을 때만 auth.js가 링크를 #enter로 둔다)
//   2. CSS가 :target으로 알아채고 enter-book 타임라인을 돌린다: --open(사슬, 표지), --flip(책장), --dive(카메라)
//   3. js/function/timeline.js가 매 프레임 이 값을 읽고, grimoire.js는 책을, stage.js는 카메라를 움직인다
//   4. 마지막 0.6초 동안 .portal 책장 빛이 화면을 채운다
//   5. .portal의 animationend → game.html로 이동. @view-transition(tokens.css)이 두 페이지를 잇고, 게임의 .veil(같은 빛)이 걷힌다

document.getElementById('enter').addEventListener('animationend', () => location.assign('game.html')); // 책장 빛이 다 차면 (움직임 줄이기면 짧은 portal-still)

addEventListener('pageshow', () => { // 게임 화면에서 브라우저 뒤로가기로 돌아왔을 때, 책장 빛에 덮인 채 멈춰 있지 않게
  if (location.hash === '#enter') location.replace('#'); // 주소의 #enter를 지워 연출 전 타이틀로 되돌린다
});
