// 커뮤니티 게시판 화면: 주소 뒤 # 부분으로 세 화면을 바꾼다
//   #/            글 목록
//   #/post/번호   글 읽기 + 댓글
//   #/write       글쓰기 (로그인 필요)
//   #/edit/번호   내 글 고치기
// 서버 API는 server/src/routes/posts.js, 로그인 정보는 /api/auth/me.
// 사람이 쓴 글은 언제나 textContent로 넣는다 (HTML로 해석되지 않게).
import { api } from '../shared/api.js';
import { el, count, isToday, timeTag, showToast, askConfirm } from '../shared/page.js';
import { prepareImage } from './image.js';

const $ = (id) => document.getElementById(id);
const views = { list: $('viewList'), post: $('viewPost'), write: $('viewWrite') };
const LIMITS = { title: 100, content: 5000, comment: 500 }; // 서버와 같은 글자 수 상한
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

let me = null; // 로그인한 회원 (로그인 전이면 null)
let current = null; // 지금 읽고 있는 글
let editingId = null; // 고치고 있는 글 번호 (새 글이면 null)
let renderToken = 0; // 늦게 도착한 응답이 다른 화면을 덮어쓰지 않게 매번 올린다
let pickedImage = null; // 새로 고른 이미지 (올리기 전)
let imageRemoved = false; // 고치는 글의 이미지를 "빼기"로 뺐는지
let previewUrl = null; // 미리 보기용 임시 주소
let imageToken = 0; // 이미지를 다듬는 사이에 다시 고르거나 화면을 옮기면 앞의 결과를 버린다

// ---------- 작은 도구 (요소 만들기, 시각, 알림, 확인 창은 js/shared/page.js) ----------

function show(name, title) { // 세 화면 중 하나만 보이게
  for (const [key, view] of Object.entries(views)) view.hidden = key !== name;
  document.title = `${title} · 다섯 빛 공방`;
  scrollTo({ top: 0 });
}

function updateCounter(input, counter, max) { // 글자 수 (상한의 90%를 넘으면 금색)
  const length = [...input.value].length;
  counter.textContent = `${count(length)} / ${count(max)}`;
  counter.classList.toggle('is-near', length > max * 0.9);
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
  row.href = `#/post/${post.postId}`;
  const title = el('span', 'post-row__title', post.title);
  if (isToday(post.writtenAt)) { // 오늘 올라온 글: 앞에 금별이 켜진다 (board.css)
    row.classList.add('is-new');
    title.append(el('span', 'sr-only', ' (오늘 올라온 글)'));
  }
  const meta = el('span', 'post-row__meta meta');
  meta.append(el('span', '', post.nickname), timeTag(post.writtenAt), el('span', '', `조회 ${count(post.views)}`));
  if (post.hasImage) meta.append(el('span', '', '이미지'));
  if (post.edited) meta.append(el('span', '', '고친 글'));
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

async function renderList() {
  show('list', '커뮤니티');
  const token = ++renderToken;
  const list = $('postList');
  list.replaceChildren();
  $('listNote').hidden = true;
  $('listCount').textContent = '글을 불러오는 중이에요';
  try {
    const { posts } = await api('/posts');
    if (token !== renderToken) return;
    $('listCount').replaceChildren('글 ', el('b', '', count(posts.length)), '개');
    list.replaceChildren(...posts.map(postRow));
    if (!posts.length) listNote('아직 글이 없어요. 첫 글을 남겨 보세요.');
  } catch (err) {
    if (token !== renderToken) return;
    $('listCount').textContent = '';
    listNote(err.message, true);
  }
}

$('listRetry').addEventListener('click', renderList);

// ---------- 글 읽기와 댓글 ----------

function syncCommentCount() { // 댓글 수와 "아직 댓글이 없어요"
  const n = $('commentList').children.length;
  $('commentCount').textContent = n ? count(n) : '';
  $('commentEmpty').hidden = n > 0;
}

function commentItem(comment) { // 댓글 한 개
  const item = el('li', 'comment');
  const head = el('div', 'comment__head');
  head.append(el('span', 'comment__name', comment.nickname));
  const time = timeTag(comment.writtenAt, true);
  time.className = 'comment__time';
  head.append(time);
  if (comment.mine) {
    const remove = el('button', 'comment__delete', '지우기');
    remove.type = 'button';
    remove.addEventListener('click', () => deleteComment(comment, item));
    head.append(remove);
  }
  item.append(head, el('p', 'comment__text', comment.content));
  return item;
}

function syncCommentForm() { // 로그인했으면 댓글 쓰는 칸, 아니면 로그인 안내
  $('commentForm').hidden = !me;
  $('commentLogin').hidden = Boolean(me);
}

async function renderPost(postId) {
  show('post', '글 읽기');
  const token = ++renderToken;
  current = null;
  $('postNote').hidden = false;
  $('postNoteText').textContent = '글을 불러오는 중이에요';
  $('postBodyWrap').hidden = true;
  $('commentSheet').hidden = true;
  try {
    const { post, comments } = await api(`/posts/${postId}`);
    if (token !== renderToken) return;
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
    $('postFigure').hidden = !post.imageUrl;
    if (post.imageUrl) {
      $('postImage').alt = `${post.title}에 붙인 이미지`;
      $('postImage').src = post.imageUrl;
      $('postImageLink').href = post.imageUrl;
    }
    $('postContent').textContent = post.content;
    $('postTools').hidden = !post.mine;
    $('editLink').href = `#/edit/${post.postId}`;

    $('commentList').replaceChildren(...comments.map(commentItem));
    syncCommentCount();
    syncCommentForm();
    $('commentInput').value = '';
    $('commentError').textContent = '';
    updateCounter($('commentInput'), $('commentCounter'), LIMITS.comment);

    $('postNote').hidden = true;
    $('postBodyWrap').hidden = false;
    $('commentSheet').hidden = false;
  } catch (err) {
    if (token !== renderToken) return;
    $('postNoteText').textContent = err.message;
  }
}

$('postImage').addEventListener('error', () => { $('postFigure').hidden = true; }); // 파일이 없어졌으면 깨진 그림 대신 글만 보여 준다

$('deletePost').addEventListener('click', async () => { // 내 글 지우기
  if (!current) return;
  const ok = await confirmDelete('글을 지울까요?', '지운 글은 목록에서 사라지고 다시 볼 수 없어요.');
  if (!ok) return;
  try {
    await api(`/posts/${current.postId}`, { method: 'DELETE' });
    showToast('글을 지웠어요');
    location.hash = '#/';
  } catch (err) {
    if (err.status === 401) loggedOut();
    showToast(err.message);
  }
});

async function deleteComment(comment, item) { // 내 댓글 지우기
  const ok = await confirmDelete('댓글을 지울까요?', '지운 댓글은 다시 볼 수 없어요.');
  if (!ok || !current) return;
  try {
    await api(`/posts/${current.postId}/comments/${comment.commentId}`, { method: 'DELETE' });
    item.remove();
    syncCommentCount();
    showToast('댓글을 지웠어요');
  } catch (err) {
    if (err.status === 401) loggedOut();
    showToast(err.message);
  }
}

$('commentInput').addEventListener('input', () => updateCounter($('commentInput'), $('commentCounter'), LIMITS.comment));

$('commentForm').addEventListener('submit', async (event) => { // 댓글 남기기
  event.preventDefault();
  const input = $('commentInput');
  const error = $('commentError');
  const content = input.value.trim();
  if (!content) {
    error.textContent = '댓글을 입력해 주세요';
    input.focus();
    return;
  }
  const button = $('commentSubmit');
  button.disabled = true;
  error.textContent = '';
  try {
    const { comment } = await api(`/posts/${current.postId}/comments`, { method: 'POST', body: { content } });
    $('commentList').append(commentItem(comment));
    syncCommentCount();
    input.value = '';
    updateCounter(input, $('commentCounter'), LIMITS.comment);
  } catch (err) {
    if (err.status === 401) {
      loggedOut();
      syncCommentForm();
    }
    error.textContent = err.message;
  } finally {
    button.disabled = false;
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

const submitText = () => (editingId ? '고친 글 올리기' : '올리기');

function setSubmitBusy(text) { // 올리기 버튼: text가 있으면 그 글자로 잠그고, 없으면 원래대로
  $('writeSubmit').disabled = Boolean(text);
  $('writeSubmit').textContent = text ?? submitText();
}

function setPreview(src) { // 이미지가 있으면 미리 보기, 없으면 고르는 칸
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = src?.startsWith('blob:') ? src : null;
  if (src) $('imagePreview').src = src;
  else $('imagePreview').removeAttribute('src');
  $('imagePicked').hidden = !src;
  $('imagePicker').hidden = Boolean(src);
}

function resetImage(saved = null) { // 첨부 칸 처음 상태로 (saved: 고치는 글에 이미 있는 이미지)
  imageToken++;
  pickedImage = null;
  imageRemoved = false;
  $('imageInput').value = '';
  setPreview(saved);
  setSubmitBusy(null);
}

async function pickImage(file) { // 고른 이미지를 다듬어 미리 보기에 올린다 (실패하면 이전 이미지는 그대로)
  const token = ++imageToken;
  $('writeError').textContent = '';
  setSubmitBusy('이미지 준비 중');
  try {
    const blob = await prepareImage(file);
    if (token !== imageToken) return;
    pickedImage = blob;
    setPreview(URL.createObjectURL(blob));
  } catch (err) {
    if (token === imageToken) $('writeError').textContent = err.message;
  } finally {
    if (token === imageToken) setSubmitBusy(null);
    $('imageInput').value = ''; // 같은 파일을 다시 골라도 동작하게
  }
}

$('imageInput').addEventListener('change', () => {
  const file = $('imageInput').files[0];
  if (file) pickImage(file);
});

$('imageRemove').addEventListener('click', () => {
  resetImage();
  imageRemoved = true;
  $('imageInput').focus();
});

// 글쓰기 판 어디에든 파일을 끌어다 놓으면 첨부한다 (글자를 끌어 옮기는 것은 그대로)
const dragsFile = (event) => event.dataTransfer?.types.includes('Files');

$('writeForm').addEventListener('dragover', (event) => {
  if (!dragsFile(event)) return;
  event.preventDefault();
  $('imagePicker').classList.add('is-over');
});

$('writeForm').addEventListener('dragleave', (event) => {
  if (!event.currentTarget.contains(event.relatedTarget)) $('imagePicker').classList.remove('is-over');
});

$('writeForm').addEventListener('drop', (event) => {
  if (!dragsFile(event)) return;
  event.preventDefault();
  $('imagePicker').classList.remove('is-over');
  if ($('imageField').inert) return; // 글을 올리는 중
  const { files } = event.dataTransfer;
  if (files.length > 1) $('writeError').textContent = '이미지는 한 장만 올릴 수 있어요';
  else if (files[0]) pickImage(files[0]);
});

async function renderWrite(postId = null) {
  editingId = postId;
  show('write', postId ? '글 고치기' : '글쓰기');
  const token = ++renderToken;
  const form = $('writeForm');
  form.hidden = !me;
  $('writeLogin').hidden = Boolean(me);
  if (!me) return;

  $('writeTitle').textContent = postId ? '글 고치기' : '글쓰기';
  $('writeCancel').href = postId ? `#/post/${postId}` : '#/';
  $('writeError').textContent = '';
  titleInput.value = '';
  contentInput.value = '';
  syncWriteCounters();
  resetImage();

  if (postId) { // 고칠 글을 불러와 채운다 (조회수는 올리지 않음)
    form.inert = true;
    try {
      const { post } = await api(`/posts/${postId}?noview=1`);
      if (token !== renderToken) return;
      if (!post.mine) {
        showToast('내가 쓴 글만 고칠 수 있어요');
        location.replace(`#/post/${postId}`);
        return;
      }
      titleInput.value = post.title;
      contentInput.value = post.content;
      syncWriteCounters();
      resetImage(post.imageUrl);
    } catch (err) {
      if (token !== renderToken) return;
      $('writeError').textContent = err.message;
    } finally {
      form.inert = false;
    }
  }
  titleInput.focus();
}

$('writeForm').addEventListener('submit', async (event) => { // 올리기
  event.preventDefault();
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
  $('imageField').inert = true; // 올리는 동안 이미지를 바꾸지 못하게
  error.textContent = '';
  try {
    const body = new FormData(); // 글과 이미지를 한 번에 보낸다
    body.append('title', title);
    body.append('content', content);
    if (pickedImage) body.append('image', pickedImage, 'image');
    else if (imageRemoved) body.append('removeImage', '1');
    const { postId } = editingId
      ? await api(`/posts/${editingId}`, { method: 'PATCH', body })
      : await api('/posts', { method: 'POST', body });
    showToast(editingId ? '글을 고쳤어요' : '글을 올렸어요');
    location.hash = `#/post/${postId}`;
  } catch (err) {
    if (err.status === 401) loggedOut();
    error.textContent = err.message;
  } finally {
    $('imageField').inert = false;
    setSubmitBusy(null);
  }
});

// ---------- 화면 바꾸기 ----------

function route() { // 주소 뒤 # 부분을 읽어 화면을 고른다 (모르는 주소는 목록으로)
  const [page, id] = location.hash.replace(/^#\/?/, '').split('/');
  const postId = /^[1-9]\d{0,17}$/.test(id ?? '') ? id : null;
  if (page === 'post' && postId) return renderPost(postId);
  if (page === 'write') return renderWrite();
  if (page === 'edit' && postId) return renderWrite(postId);
  if (page) history.replaceState(null, '', '#/');
  return renderList();
}

function navigate() { // 뷰 전환이 되는 브라우저에서는 판이 부드럽게 바뀐다 (board.css)
  if (!document.startViewTransition || reduceMotion.matches) return route();
  const transition = document.startViewTransition(() => {
    route(); // 불러오는 중 화면까지만 바꾸고 바로 넘긴다 (서버 응답을 기다리지 않음)
  });
  transition.ready.catch(() => {}); // 전환 중에 또 이동하면 앞 전환은 건너뛴다 (오류가 아님)
}

addEventListener('hashchange', navigate);

async function start() {
  try {
    ({ user: me } = await api('/auth/me'));
  } catch {
    me = null; // 서버가 꺼져 있으면 로그인 전으로 보고, 목록에서 연결 안내를 띄운다
  }
  renderWho();
  route();
}

start();
