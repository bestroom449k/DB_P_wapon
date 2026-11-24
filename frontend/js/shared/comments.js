// 댓글 목록과 쓰기: 게시판 글(js/board/main.js)과 거래소 거래글(js/atelier/main.js)이 같이 쓴다. 디자인은 css/post.css.
// 서버는 server/src/routes/posts.js의 /api/posts/:postId/comments (게시판 글과 거래글이 같은 comments 테이블을 쓴다).
// 페이지에 이 id의 칸이 있어야 한다: commentList, commentCount, commentEmpty, commentForm, commentInput, commentError, commentCounter, commentSubmit, commentLogin
// 댓글 내용은 textContent로 넣어 HTML로 해석되지 않는다.
import { api } from './api.js';
import { $, el, count, timeTag, showToast, askConfirm, updateCounter } from './page.js';

const MAX = 500; // 댓글 글자 수 상한 (서버, DB 칸 크기와 같음)

// getPostId(): 지금 보고 있는 글 번호, isLoggedIn(): 로그인했는지, onLoggedOut(): 서버가 로그인이 풀렸다고 할 때
export function createComments({ getPostId, isLoggedIn, onLoggedOut }) {
  const input = $('commentInput');
  const syncCounter = () => updateCounter(input, $('commentCounter'), MAX);

  function syncCount() { // 댓글 수와 "아직 댓글이 없어요"
    const n = $('commentList').children.length;
    $('commentCount').textContent = n ? count(n) : '';
    $('commentEmpty').hidden = n > 0;
  }

  function syncForm() { // 로그인했으면 댓글 쓰는 칸, 아니면 로그인 안내
    $('commentForm').hidden = !isLoggedIn();
    $('commentLogin').hidden = isLoggedIn();
  }

  function item(comment) { // 댓글 한 개
    const node = el('li', 'comment');
    const head = el('div', 'comment__head');
    head.append(el('span', 'comment__name', comment.nickname));
    const time = timeTag(comment.writtenAt, true);
    time.className = 'comment__time';
    head.append(time);
    if (comment.mine) { // 내가 쓴 댓글에만 지우기 버튼 (실제 권한은 서버가 다시 검사)
      const button = el('button', 'comment__delete', '지우기');
      button.type = 'button';
      button.addEventListener('click', () => remove(comment, node));
      head.append(button);
    }
    node.append(head, el('p', 'comment__text', comment.content)); // 댓글 내용은 textContent로 들어가 HTML로 해석되지 않는다
    return node;
  }

  async function remove(comment, node) { // 내 댓글 지우기
    const ok = await askConfirm({ title: '댓글을 지울까요?', text: '지운 댓글은 다시 볼 수 없어요.', ok: '지우기' });
    const postId = getPostId();
    if (!ok || !postId) return;
    try {
      await api(`/posts/${postId}/comments/${comment.commentId}`, { method: 'DELETE' }); // 서버에서 댓글 지우기 (소프트 삭제)
      node.remove(); // 화면에서 그 댓글 줄 빼기
      syncCount();
      showToast('댓글을 지웠어요');
    } catch (err) {
      if (err.status === 401) onLoggedOut(); // 로그인이 풀렸으면 화면도 로그인 전으로
      showToast(err.message);
    }
  }

  input.addEventListener('input', syncCounter);

  $('commentForm').addEventListener('submit', async (event) => { // 댓글 남기기
    event.preventDefault(); // 브라우저가 페이지를 새로 고치지 않게
    const error = $('commentError');
    const content = input.value.trim();
    if (!content) {
      error.textContent = '댓글을 입력해 주세요';
      input.focus();
      return;
    }
    const button = $('commentSubmit');
    button.disabled = true; // 두 번 누르기 방지
    error.textContent = '';
    try {
      const { comment } = await api(`/posts/${getPostId()}/comments`, { method: 'POST', body: { content } }); // 저장하고, 저장된 댓글을 돌려받는다
      $('commentList').append(item(comment)); // 새로고침 없이 맨 아래에 추가
      syncCount();
      input.value = '';
      syncCounter();
    } catch (err) {
      if (err.status === 401) { // 로그인이 풀렸으면 쓰는 칸 대신 로그인 안내
        onLoggedOut();
        syncForm();
      }
      error.textContent = err.message;
    } finally {
      button.disabled = false;
    }
  });

  return {
    render(comments) { // 글을 열 때: 댓글을 채우고 쓰는 칸을 비운다
      $('commentList').replaceChildren(...comments.map(item));
      syncCount();
      syncForm();
      input.value = '';
      $('commentError').textContent = '';
      syncCounter();
    },
  };
}
