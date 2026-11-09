// 회원가입, 로그인 기능
//   폼에 적은 값을 서버(server/src/routes/auth.js)로 보내고 결과에 따라 화면을 바꾼다.
//   로그인하면 메뉴가 "게임 시작 → 공방 입장", "회원가입 → 로그아웃"으로 바뀌고, 왼쪽 위에 닉네임과 골드가 보인다.
//   창을 열고 닫는 것은 CSS(:target)가 맡고, 이 파일은 서버와 주고받는 일만 한다.

const root = document.documentElement;
const player = document.getElementById('player'); // 왼쪽 위 회원 표시
const menuStart = document.getElementById('menuStart'); // "게임 시작"
const menuAccount = document.getElementById('menuAccount'); // "회원가입" 또는 "로그아웃"
const welcome = document.getElementById('welcome'); // 환영 알림

const RULES = { // 입력 규칙 (서버와 같은 규칙)
  loginId: [/^[a-z0-9_]{4,20}$/, '아이디는 영문 소문자, 숫자, 밑줄(_)로 4~20자예요'],
  nickname: [/^[가-힣a-zA-Z0-9]{2,12}$/, '닉네임은 한글, 영문, 숫자로 2~12자예요'],
  password: [/^.{8,64}$/, '비밀번호는 8~64자예요'],
};

async function request(path, body) { // 서버에 요청 보내기 (body가 있으면 POST, 없으면 GET)
  let res;
  try {
    res = await fetch(`/api/auth/${path}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
  } catch {
    throw new Error('서버에 연결하지 못했어요. server 폴더에서 npm start로 서버를 켰는지 확인해 주세요');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message ?? '요청을 처리하지 못했어요. 서버 주소(http://localhost:3000)로 열었는지 확인해 주세요');
  return data;
}

function showUser(user) { // 로그인 상태를 화면에 반영 (user가 null이면 로그아웃 상태)
  root.dataset.auth = user ? 'in' : 'out';
  player.textContent = user ? `${user.nickname}님, ${Number(user.gold).toLocaleString('ko-KR')} 골드` : '';
  menuStart.href = user ? '#play' : '#login';
  menuAccount.href = user ? '#logout' : '#signup';
  menuAccount.textContent = user ? '로그아웃' : '회원가입';
}

function checkLogin(values) { // 로그인 입력 검사
  values.loginId = values.loginId.trim().toLowerCase();
  if (!values.loginId) return { field: 'loginId', message: '아이디를 입력해 주세요' };
  if (!values.password) return { field: 'password', message: '비밀번호를 입력해 주세요' };
  return null;
}

function checkSignup(values) { // 회원가입 입력 검사
  values.loginId = values.loginId.trim().toLowerCase();
  values.nickname = values.nickname.trim();
  for (const [field, [pattern, message]] of Object.entries(RULES)) {
    if (!pattern.test(values[field])) return { field, message };
  }
  if (values.password !== values.passwordConfirm) return { field: 'passwordConfirm', message: '비밀번호 확인이 비밀번호와 달라요' };
  return null;
}

for (const form of document.querySelectorAll('form[data-auth]')) { // 로그인 폼, 회원가입 폼
  form.addEventListener('submit', async (event) => { // "로그인" 또는 "가입하기"를 눌렀을 때
    event.preventDefault(); // 페이지가 새로고침되지 않게
    const kind = form.dataset.auth; // 'login' 또는 'signup'
    const error = form.querySelector('.form__error');
    const button = form.querySelector('button[type="submit"]');
    const values = Object.fromEntries(new FormData(form)); // 입력값 모으기

    const problem = kind === 'signup' ? checkSignup(values) : checkLogin(values);
    if (problem) {
      error.textContent = problem.message;
      form.elements[problem.field].focus();
      return;
    }

    error.textContent = '';
    button.disabled = true; // 두 번 누르기 방지
    try {
      const body = kind === 'signup'
        ? { loginId: values.loginId, nickname: values.nickname, password: values.password }
        : { loginId: values.loginId, password: values.password };
      const { user } = await request(kind, body); // 서버로 보내기
      form.reset();
      showUser(user);
      welcome.textContent = kind === 'signup' ? `${user.nickname}님, 공방에 오신 걸 환영해요` : `${user.nickname}님, 다시 오셨네요`;
      location.hash = 'welcome'; // 창을 닫고 환영 알림 띄우기
    } catch (err) {
      error.textContent = err.message; // 서버가 알려 준 이유 (예: 이미 쓰고 있는 아이디예요)
    } finally {
      button.disabled = false;
    }
  });
}

menuAccount.addEventListener('click', async (event) => { // "로그아웃"
  if (root.dataset.auth !== 'in') return; // 로그인 전에는 그냥 회원가입 창이 열린다
  event.preventDefault();
  await request('logout', {}).catch(() => {});
  showUser(null);
  location.hash = 'logged-out';
});

function focusOpenPanel() { // 창이 열리면 첫 입력칸에 바로 쓸 수 있게
  const panel = document.querySelector('.panel:target');
  for (const message of document.querySelectorAll('.form__error')) message.textContent = '';
  panel?.querySelector('input')?.focus({ preventScroll: true });
}
addEventListener('hashchange', focusOpenPanel);
focusOpenPanel();

request('me') // 새로고침해도 로그인 상태 이어 가기
  .then(({ user }) => showUser(user))
  .catch(() => showUser(null));
