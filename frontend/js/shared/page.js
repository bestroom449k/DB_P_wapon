// 별도 페이지(게시판 board.html, 공방 atelier.html)가 같이 쓰는 작은 도구: 요소 만들기, 숫자, 시각, 알림, 확인 창
// 사람이 쓴 글과 서버가 보낸 이름은 언제나 textContent로 넣는다 (HTML로 해석되지 않게).

export function el(tag, className, text) { // 요소 만들기 (글은 textContent로)
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export const count = (n) => Number(n).toLocaleString('ko-KR');

const pad = (n) => String(n).padStart(2, '0');
export const isToday = (value) => new Date(value).toDateString() === new Date().toDateString();

export function timeTag(value, full = false) { // '오늘 14:03', '11월 20일', 작년 이전은 '2025년 11월 20일' (full이면 날짜 뒤에 시각까지)
  const date = new Date(value);
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  let text = `오늘 ${time}`;
  if (!isToday(value)) {
    const day = `${date.getMonth() + 1}월 ${date.getDate()}일`;
    text = date.getFullYear() === new Date().getFullYear() ? day : `${date.getFullYear()}년 ${day}`;
    if (full) text += ` ${time}`;
  }
  const node = el('time', '', text);
  node.dateTime = date.toISOString();
  return node;
}

export function showToast(message) { // 알림 띄우기 (연달아 띄워도 처음부터 다시)
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('is-shown');
  void toast.offsetWidth;
  toast.classList.add('is-shown');
}

// 확인 창 (페이지의 <dialog id="confirm">, 디자인은 css/page.css) → ok 버튼을 누르면 true, 취소·Esc면 false
export function askConfirm({ title, text, ok }) {
  const dialog = document.getElementById('confirm');
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmText').textContent = text;
  document.getElementById('confirmOk').textContent = ok;
  dialog.returnValue = '';
  dialog.showModal();
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
  });
}
