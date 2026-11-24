// 커뮤니티 게시판 화면: 주소 뒤 # 부분으로 세 화면을 바꾼다
//   #/            글 목록
//   #/post/번호   글 읽기 + 댓글
//   #/write       글쓰기 (로그인 필요)
//   #/edit/번호   내 글 고치기
// 서버 API는 server/src/routes/posts.js, 로그인 정보는 /api/auth/me.
// 사람이 쓴 글은 언제나 textContent로 넣는다 (HTML로 해석되지 않게).
// 이 게시판은 자유글만 보여 준다. 거래글 주소(#/post/번호, #/edit/번호)로 들어오면 거래소 화면(atelier.html#/market/item/번호)으로 보낸다.
//
// 작동 원리
//   1. 페이지가 열리면 start()가 로그인 정보를 받고, route()가 주소를 읽어 화면을 고른다
//   2. 링크를 누르면 주소의 # 뒤만 바뀌고(새로고침 없음) hashchange → navigate() → route()가 화면을 다시 그린다
//   3. 각 화면은 api()로 서버에서 JSON을 받아 빈 틀(board.html)을 채운다
//   4. 응답이 늦게 오면 renderToken으로 버린다 (다른 글을 빠르게 눌러도 내용이 섞이지 않게)
//   5. 글을 올릴 때는 제목, 내용, 이미지를 FormData 한 덩어리로 보낸다
// 이미지 첨부는 js/board/image-picker.js, 댓글은 js/shared/comments.js (거래소 거래글과 같이 씀)
// 관련 파일: board.html(화면 틀), css/board.css·post.css·page.css(디자인), js/shared/api.js·page.js(도구), server/src/routes/posts.js(서버)
import { api } from '../shared/api.js';
import { $, el, count, isToday, timeTag, showToast, askConfirm, updateCounter } from '../shared/page.js';
import { createImagePicker } from './image-picker.js';
import { createComments } from '../shared/comments.js';

const views = { list: $('viewList'), post: $('viewPost'), write: $('viewWrite') }; // 세 화면 (board.html의 section)
const LIMITS = { title: 100, content: 5000 }; // 서버와 같은 글자 수 상한 (댓글 500자는 comments.js)
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)'); // 움직임 줄이기 설정

let me = null; // 로그인한 회원 (로그인 전이면 null)
let current = null; // 지금 읽고 있는 글
let editingId = null; // 고치고 있는 글 번호 (새 글이면 null)
let renderToken = 0; // 늦게 도착한 응답이 다른 화면을 덮어쓰지 않게 매번 올린다

// ---------- 작은 도구 (요소 만들기, 시각, 알림, 확인 창은 js/shared/page.js) ----------

function show(name, title) { // 세 화면 중 하나만 보이게
  for (const [key, view] of Object.entries(views)) view.hidden = key !== name; // 고른 화면만 남기고 숨긴다
  document.title = `${title} · 다섯 빛 공방`; // 브라우저 탭 제목
  scrollTo({ top: 0 }); // 화면이 바뀌면 맨 위로
}

const confirmDelete = (title, text) => askConfirm({ title, text, ok: '지우기' }); // 지우기 확인 창 → "지우기"를 누르면 true

function loggedOut() { // 서버가 로그인이 풀렸다고 하면 화면도 로그인 전으로
  me = null;
  renderWho();
}

function renderWho() { // 위 오른쪽: 닉네임, 로그인 전이면 로그인 링크
  const who = $('who');
  if (me) {
    who.replaceChildren(el('span', 'who__name', me.nickname));
    return;
  }
  const link = el('a', '', '로그인');
  link.href = 'index.html#login';
  who.replaceChildren('로그인 전 · ', link);
}

// ---------- 글 목록 ----------

function postRow(post) { // 목록 한 줄
  const row = el('a', 'post-row');
  row.href = `#/post/${post.postId}`; // 누르면 주소만 바뀌어 글 읽기 화면으로
  const title = el('span', 'post-row__title', post.title);
  if (isToday(post.writtenAt)) { // 오늘 올라온 글: 앞에 금별이 켜진다 (board.css)
    row.classList.add('is-new');
    title.append(el('span', 'sr-only', ' (오늘 올라온 글)'));
  }
  const meta = el('span', 'post-row__meta meta');
  meta.append(el('span', '', post.nickname), timeTag(post.writtenAt), el('span', '', `조회 ${count(post.views)}`));
  if (post.hasImage) meta.append(el('span', '', '이미지')); // 이미지가 붙은 글 표시
  if (post.edited) meta.append(el('span', '', '고친 글')); // 고친 적이 있는 글 표시
  row.append(title, meta);
  const item = el('li');
  item.append(row);
  return item;
}

function listNote(message, retry = false) { // 목록 아래 안내 (비었을 때, 오류)
  $('listNote').hidden = false;
  $('listNoteText').textContent = message;
  $('listRetry').hidden = !retry;
}

async function renderList() { // 글 목록 화면 그리기
  show('list', '커뮤니티');
  const token = ++renderToken; // 이번 화면의 번호 (응답이 왔을 때 아직 이 화면인지 확인한다)
  const list = $('postList');
  list.replaceChildren();
  $('listNote').hidden = true;
  $('listCount').textContent = '글을 불러오는 중이에요';
  try {
    const { posts } = await api('/posts'); // 서버에서 글 목록 받기
    if (token !== renderToken) return; // 그사이 다른 화면으로 갔으면 이 응답은 버린다
    $('listCount').replaceChildren('글 ', el('b', '', count(posts.length)), '개');
    list.replaceChildren(...posts.map(postRow)); // 글마다 한 줄씩 만들어 넣기
    if (!posts.length) listNote('아직 글이 없어요. 첫 글을 남겨 보세요.');
  } catch (err) {
    if (token !== renderToken) return; // 그사이 다른 화면으로 갔으면 이 응답은 버린다
    $('listCount').textContent = '';
    listNote(err.message, true);
  }
}

$('listRetry').addEventListener('click', renderList); // 오류가 났을 때 다시 불러오기

// ---------- 글 읽기와 댓글 ----------

const commentBox = createComments({ // 댓글 목록과 쓰기 (js/shared/comments.js)
  getPostId: () => current?.postId,
  isLoggedIn: () => Boolean(me),
  onLoggedOut: loggedOut,
});

const isTrade = (post) => post.type === 'TRADE'; // 거래소 거래글인지 (서버 posts.post_type)
const openInMarket = (post) => location.replace(`atelier.html#/market/item/${post.postId}`); // 거래글은 게시판이 아니라 거래소 화면에서 연다 (주소를 직접 쳐서 들어온 경우)

async function renderPost(postId) { // 글 읽기 화면 그리기
  show('post', '글 읽기');
  const token = ++renderToken; // 이번 화면의 번호 (응답이 왔을 때 아직 이 화면인지 확인한다)
  current = null;
  $('postNote').hidden = false;
  $('postNoteText').textContent = '글을 불러오는 중이에요';
  $('postBodyWrap').hidden = true;
  $('commentSheet').hidden = true;
  try {
    const { post, comments } = await api(`/posts/${postId}`); // 글과 댓글 받기 (이때 서버가 조회수를 1 올린다)
    if (token !== renderToken) return; // 그사이 다른 화면으로 갔으면 이 응답은 버린다
    if (isTrade(post)) return openInMarket(post); // 거래글이면 거래소의 거래 화면으로
    current = post;
    document.title = `${post.title} · 다섯 빛 공방`;
    $('postTitle').textContent = post.title;
    const meta = [el('span', '', post.nickname), timeTag(post.writtenAt, true), el('span', '', `조회 ${count(post.views)}`)];
    if (post.editedAt) {
      const edited = el('span', '', '고침 ');
      edited.append(timeTag(post.editedAt, true));
      meta.push(edited);
    }
    $('postMeta').replaceChildren(...meta);
    $('postImage').removeAttribute('src'); // 앞 글의 이미지가 잠깐 비치지 않게
    $('postFigure').hidden = !post.imageUrl; // 이미지가 없는 글은 이미지 칸을 숨긴다
    if (post.imageUrl) {
      $('postImage').alt = `${post.title}에 붙인 이미지`;
      $('postImage').src = post.imageUrl; // 서버의 /uploads/파일이름
      $('postImageLink').href = post.imageUrl; // 누르면 새 탭에서 크게 보기
    }
    $('postContent').textContent = post.content; // 글자 그대로 넣는다 (사람이 쓴 HTML이 실행되지 않게)
    $('postTools').hidden = !post.mine; // 고치기, 지우기는 내 글에만 (실제 권한은 서버가 다시 검사)
    $('editLink').href = `#/edit/${post.postId}`;

    commentBox.render(comments); // 댓글 채우기, 쓰는 칸 비우기

    $('postNote').hidden = true;
    $('postBodyWrap').hidden = false;
    $('commentSheet').hidden = false;
  } catch (err) {
    if (token !== renderToken) return; // 그사이 다른 화면으로 갔으면 이 응답은 버린다
    $('postNoteText').textContent = err.message;
  }
}

$('postImage').addEventListener('error', () => { $('postFigure').hidden = true; }); // 파일이 없어졌으면 깨진 그림 대신 글만 보여 준다

$('deletePost').addEventListener('click', async () => { // 내 글 지우기
  if (!current) return;
  const ok = await confirmDelete('글을 지울까요?', '지운 글은 목록에서 사라지고 다시 볼 수 없어요.');
  if (!ok) return;
  try {
    await api(`/posts/${current.postId}`, { method: 'DELETE' }); // 서버가 삭제 시각을 적고 이미지 파일을 지운다
    showToast('글을 지웠어요');
    location.hash = '#/'; // 목록으로 돌아가기
  } catch (err) {
    if (err.status === 401) loggedOut(); // 로그인이 풀렸으면 화면도 로그인 전으로
    showToast(err.message);
  }
});

// ---------- 글쓰기, 고치기 ----------

const titleInput = $('titleInput');
const contentInput = $('contentInput');
const syncWriteCounters = () => {
  updateCounter(titleInput, $('titleCounter'), LIMITS.title);
  updateCounter(contentInput, $('contentCounter'), LIMITS.content);
};
titleInput.addEventListener('input', syncWriteCounters);
contentInput.addEventListener('input', syncWriteCounters);

const submitText = () => (editingId ? '고친 글 올리기' : '올리기'); // 올리기 버튼의 원래 글자

function setSubmitBusy(text) { // 올리기 버튼: text가 있으면 그 글자로 잠그고, 없으면 원래대로
  $('writeSubmit').disabled = Boolean(text);
  $('writeSubmit').textContent = text ?? submitText();
}

const picker = createImagePicker({ // 이미지 첨부 칸 (js/board/image-picker.js)
  form: $('writeForm'),
  showError: (message) => { $('writeError').textContent = message; },
  setBusy: (busy) => setSubmitBusy(busy ? '이미지 준비 중' : null), // 다듬는 동안은 올리기 버튼을 잠근다
});

async function renderWrite(postId = null) { // 글쓰기, 고치기 화면 (postId가 있으면 고치기)
  editingId = postId;
  show('write', postId ? '글 고치기' : '글쓰기');
  const token = ++renderToken; // 이번 화면의 번호 (응답이 왔을 때 아직 이 화면인지 확인한다)
  const form = $('writeForm');
  form.hidden = !me; // 로그인 전이면 폼 대신 로그인 안내
  $('writeLogin').hidden = Boolean(me);
  if (!me) return;

  $('writeTitle').textContent = postId ? '글 고치기' : '글쓰기';
  $('writeCancel').href = postId ? `#/post/${postId}` : '#/';
  $('writeError').textContent = '';
  titleInput.value = '';
  contentInput.value = '';
  syncWriteCounters();
  picker.reset();

  if (postId) { // 고칠 글을 불러와 채운다 (조회수는 올리지 않음)
    form.inert = true; // 글을 불러오는 동안 입력을 막는다
    try {
      const { post } = await api(`/posts/${postId}?noview=1`); // 고치려고 불러올 때는 조회수를 올리지 않는다
      if (token !== renderToken) return; // 그사이 다른 화면으로 갔으면 이 응답은 버린다
      if (isTrade(post)) return openInMarket(post); // 거래글은 게시판에서 고칠 수 없다 (서버도 거절)
      if (!post.mine) { // 남의 글 고치기 주소로 들어온 경우
        showToast('내가 쓴 글만 고칠 수 있어요');
        location.replace(`#/post/${postId}`);
        return;
      }
      titleInput.value = post.title;
      contentInput.value = post.content;
      syncWriteCounters();
      picker.reset(post.imageUrl); // 기존 이미지를 미리 보기에 올린다
    } catch (err) {
      if (token !== renderToken) return; // 그사이 다른 화면으로 갔으면 이 응답은 버린다
      $('writeError').textContent = err.message;
    } finally {
      form.inert = false;
    }
  }
  titleInput.focus();
}

$('writeForm').addEventListener('submit', async (event) => { // 올리기
  event.preventDefault(); // 브라우저 기본 동작(새로고침, 파일 열기)을 막는다
  const error = $('writeError');
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  if (!title) {
    error.textContent = '제목을 입력해 주세요';
    titleInput.focus();
    return;
  }
  if (!content) {
    error.textContent = '내용을 입력해 주세요';
    contentInput.focus();
    return;
  }
  setSubmitBusy('올리는 중');
  picker.lock(true); // 올리는 동안 이미지를 바꾸지 못하게
  error.textContent = '';
  try {
    const body = new FormData(); // 글과 이미지를 한 번에 보낸다
    body.append('title', title);
    body.append('content', content);
    picker.appendTo(body); // 새 이미지, 또는 "빼기" 표시
    const { postId } = editingId
      ? await api(`/posts/${editingId}`, { method: 'PATCH', body }) // 고치기
      : await api('/posts', { method: 'POST', body }); // 새 글
    showToast(editingId ? '글을 고쳤어요' : '글을 올렸어요');
    location.hash = `#/post/${postId}`; // 올린 글을 읽는 화면으로
  } catch (err) {
    if (err.status === 401) loggedOut(); // 로그인이 풀렸으면 화면도 로그인 전으로
    error.textContent = err.message;
  } finally {
    picker.lock(false);
    setSubmitBusy(null);
  }
});

// ---------- 화면 바꾸기 ----------

function route() { // 주소 뒤 # 부분을 읽어 화면을 고른다 (모르는 주소는 목록으로)
  const [page, id] = location.hash.replace(/^#\/?/, '').split('/'); // '#/post/3' → ['post', '3']
  const postId = /^[1-9]\d{0,17}$/.test(id ?? '') ? id : null; // 번호가 숫자일 때만 쓴다
  if (page === 'post' && postId) return renderPost(postId);
  if (page === 'write') return renderWrite();
  if (page === 'edit' && postId) return renderWrite(postId);
  if (page) history.replaceState(null, '', '#/'); // 모르는 주소는 목록 주소로 고친다
  return renderList();
}

function navigate() { // 뷰 전환이 되는 브라우저에서는 판이 부드럽게 바뀐다 (board.css)
  if (!document.startViewTransition || reduceMotion.matches) return route();
  const transition = document.startViewTransition(() => {
    route(); // 불러오는 중 화면까지만 바꾸고 바로 넘긴다 (서버 응답을 기다리지 않음)
  });
  transition.ready.catch(() => {}); // 전환 중에 또 이동하면 앞 전환은 건너뛴다 (오류가 아님)
}

addEventListener('hashchange', navigate); // 주소의 # 뒤가 바뀔 때마다 화면을 바꾼다

async function start() { // 페이지가 열릴 때 한 번
  try {
    ({ user: me } = await api('/auth/me')); // 로그인한 회원 받기 (로그인 전이면 null)
  } catch {
    me = null; // 서버가 꺼져 있으면 로그인 전으로 보고, 목록에서 연결 안내를 띄운다
  }
  renderWho();
  route();
}

start(); // 시작
