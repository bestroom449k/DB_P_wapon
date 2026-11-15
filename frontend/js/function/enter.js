// 공방 입장: 로그인한 뒤 "게임 시작"을 누르면 주소가 #enter가 되고,
// CSS(:target)가 책이 펼쳐지고 책장이 넘어가며 책 속으로 들어가는 연출(css/timeline.css의 enter-book)을 돌린다.
// 이 파일은 그 연출이 끝나는 순간 게임 화면(game.html)으로 넘기는 일만 한다.

const root = document.documentElement;

root.addEventListener('animationend', (event) => { // 연출이 끝나면 (움직임 줄이기면 짧은 enter-still)
  if (event.target === root && event.animationName.startsWith('enter-')) location.assign('game.html');
});

addEventListener('pageshow', () => { // 게임 화면에서 브라우저 뒤로가기로 돌아왔을 때, 책장 빛에 덮인 채 멈춰 있지 않게
  if (location.hash === '#enter') location.replace('#');
});
