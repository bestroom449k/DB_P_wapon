// 커뮤니티 게시판 API (글과 댓글)
//   GET    /api/posts                               글 목록 (최신 글부터, 지운 글과 거래글은 빼고)
//   GET    /api/posts/:postId                       글 하나 + 댓글 (볼 때마다 조회수 +1, ?noview=1이면 그대로)
//   POST   /api/posts                               글쓰기 (title, content, 이미지 한 장 image)
//   PATCH  /api/posts/:postId                       내 글 고치기 (image를 보내면 이미지 교체, removeImage=1이면 이미지 빼기)
//   DELETE /api/posts/:postId                       내 글 지우기
//   POST   /api/posts/:postId/comments              댓글 쓰기
//   DELETE /api/posts/:postId/comments/:commentId   내 댓글 지우기
// 읽기는 누구나, 쓰기·고치기·지우기는 로그인해야 한다.
// 지울 때는 행을 없애지 않고 deleted_at에 시각만 적는다 (db/schema.sql의 소프트 삭제).
// 글에 붙인 이미지 파일은 주소만 알면 열리므로, 글을 지우거나 이미지를 바꾸면 파일은 실제로 지운다.
//
// 작동 원리
//   요청 → needLogin(로그인 확인) → receiveImage(파일 받기, uploads.js) → 입력 검사 → 내 글인지 확인 → DB 저장 → JSON 응답
//   화면에서 버튼을 숨겨도 주소로 직접 요청할 수 있으므로, 권한은 항상 서버에서 다시 검사한다.
//   SQL의 값은 ?로 따로 넘겨 SQL 인젝션(입력값으로 SQL을 조작하는 공격)을 막는다.
import { Router } from 'express';
import { pool } from '../db.js';
import { requireLogin, toId } from '../common.js';
import { isImage, receiveImage, removeImage, saveImage } from '../uploads.js';

const router = Router(); // 이 파일의 주소 묶음 (app.js가 /api/posts에 연결)
const needLogin = requireLogin(); // 로그인 확인 (common.js)

const LIMITS = { title: 100, content: 5000, comment: 500 }; // 글자 수 상한 (제목·댓글은 DB 칸 크기, 본문은 TEXT 안에서 넉넉하게)

function readText(value, max, label) { // 앞뒤 빈칸을 지운 글. 비었거나 너무 길면 오류 문구
  const text = String(value ?? '').replace(/\r\n/g, '\n').trim(); // 파일과 함께 보낸 글은 브라우저가 줄바꿈을 \r\n으로 바꾸므로 되돌린다
  if (!text) return { error: `${label}을 입력해 주세요` };
  if ([...text].length > max) return { error: `${label}은 ${max}자까지 쓸 수 있어요` };
  return { text };
}

function readPostForm(req) { // 글쓰기·고치기 입력 (제목, 내용, 이미지 형식 검사)
  const title = readText(req.body?.title, LIMITS.title, '제목');
  const content = readText(req.body?.content, LIMITS.content, '내용');
  const notImage = req.file && !isImage(req.file.buffer) ? 'JPG, PNG, WebP 이미지만 올릴 수 있어요' : null;
  return { title: title.text, content: content.text, error: title.error ?? content.error ?? notImage };
}

async function currentImage(postId) { // 글에 지금 붙어 있는 이미지 경로 (없으면 null)
  const [[row]] = await pool.query('SELECT post_image_url FROM posts WHERE post_id = ?', [postId]);
  return row?.post_image_url ?? null;
}

const POST_WRITER = 'SELECT writer_user_id FROM posts WHERE post_id = ? AND deleted_at IS NULL'; // 글쓴이 찾기
const COMMENT_WRITER = 'SELECT writer_user_id FROM comments WHERE comment_id = ? AND post_id = ? AND deleted_at IS NULL'; // 댓글 쓴이 찾기

async function checkWriter(what, sql, params, userId) { // 글(댓글)이 있고 내가 썼으면 null, 아니면 [상태 코드, 문구]
  const [[row]] = await pool.query(sql, params);
  if (!row) return [404, `${what}을 찾을 수 없어요`];
  if (row.writer_user_id !== userId) return [403, `내가 쓴 ${what}만 고치거나 지울 수 있어요`];
  return null;
}

const toComment = (row, userId) => ({ // DB 행 → 화면용 댓글
  commentId: row.comment_id,
  nickname: row.nickname,
  content: row.comment_content,
  writtenAt: row.written_at,
  mine: row.writer_user_id === userId, // 화면에서 지우기 버튼을 보일지
});

const COMMENT_COLUMNS = 'c.comment_id, c.writer_user_id, c.comment_content, c.written_at, u.nickname'; // 댓글 + 작성자 닉네임

router.get('/', async (req, res) => { // 글 목록
  const [rows] = await pool.query( // 글 + 작성자 닉네임 (users와 JOIN)
    `SELECT p.post_id, p.post_title, p.post_image_url, p.view_count, p.written_at, p.edited_at, u.nickname
     FROM posts p
     JOIN users u ON u.user_id = p.writer_user_id
     WHERE p.deleted_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM trades t WHERE t.post_id = p.post_id) -- 거래글은 거래소에서 보여 준다
     ORDER BY p.written_at DESC, p.post_id DESC`,
  );
  res.json({
    posts: rows.map((row) => ({
      postId: row.post_id,
      title: row.post_title,
      nickname: row.nickname,
      views: row.view_count,
      writtenAt: row.written_at,
      edited: row.edited_at !== null,
      hasImage: row.post_image_url !== null,
    })),
  });
});

router.get('/:postId', async (req, res) => { // 글 하나 + 댓글
  const postId = toId(req.params.postId);
  if (!postId) return res.status(404).json({ message: '글을 찾을 수 없어요' });
  if (req.query.noview !== '1') { // 글을 고치려고 불러올 때는 조회수를 올리지 않는다
    await pool.query('UPDATE posts SET view_count = view_count + 1 WHERE post_id = ? AND deleted_at IS NULL', [postId]);
  }

  const [[post]] = await pool.query( // 지운 글은 찾지 않는다
    `SELECT p.post_id, p.writer_user_id, p.post_title, p.post_content, p.post_image_url, p.view_count, p.written_at, p.edited_at, u.nickname
     FROM posts p
     JOIN users u ON u.user_id = p.writer_user_id
     WHERE p.post_id = ? AND p.deleted_at IS NULL`,
    [postId],
  );
  if (!post) return res.status(404).json({ message: '글을 찾을 수 없어요' });

  const [comments] = await pool.query( // 이 글의 댓글을 쓴 순서대로
    `SELECT ${COMMENT_COLUMNS}
     FROM comments c
     JOIN users u ON u.user_id = c.writer_user_id
     WHERE c.post_id = ? AND c.deleted_at IS NULL
     ORDER BY c.written_at, c.comment_id`,
    [postId],
  );

  const userId = req.session.userId; // 세션이 기억하는 로그인 회원 번호
  res.json({
    post: {
      postId: post.post_id,
      title: post.post_title,
      content: post.post_content,
      imageUrl: post.post_image_url,
      nickname: post.nickname,
      views: post.view_count,
      writtenAt: post.written_at,
      editedAt: post.edited_at,
      mine: post.writer_user_id === userId, // 화면에서 고치기, 지우기 버튼을 보일지
    },
    comments: comments.map((row) => toComment(row, userId)),
  });
});

router.post('/', needLogin, receiveImage, async (req, res) => { // 글쓰기
  const { title, content, error } = readPostForm(req);
  if (error) return res.status(400).json({ message: error }); // 입력이 잘못되면 파일도 글도 저장하지 않는다

  const image = req.file ? await saveImage(req.file.buffer) : null; // 입력 검사를 통과한 뒤에만 파일을 저장한다
  try {
    const [result] = await pool.query(
      'INSERT INTO posts (writer_user_id, post_title, post_content, post_image_url) VALUES (?, ?, ?, ?)', // 이미지는 파일이 아니라 경로만 DB에 들어간다
      [req.session.userId, title, content, image],
    );
    res.status(201).json({ postId: result.insertId });
  } catch (err) {
    await removeImage(image); // 글이 저장되지 않았으면 이미지도 남기지 않는다
    throw err;
  }
});

router.patch('/:postId', needLogin, receiveImage, async (req, res) => { // 내 글 고치기
  const postId = toId(req.params.postId);
  if (!postId) return res.status(404).json({ message: '글을 찾을 수 없어요' });
  const { title, content, error } = readPostForm(req);
  if (error) return res.status(400).json({ message: error }); // 입력이 잘못되면 파일도 글도 저장하지 않는다

  const denied = await checkWriter('글', POST_WRITER, [postId], req.session.userId); // 내 글인지 서버에서 확인
  if (denied) return res.status(denied[0]).json({ message: denied[1] });

  const oldImage = await currentImage(postId); // 지금 붙어 있는 이미지
  const newImage = req.file ? await saveImage(req.file.buffer) : null; // 내 글이 맞을 때만 새 파일을 저장한다
  const image = req.file ? newImage : String(req.body?.removeImage) === '1' ? null : oldImage; // 새 이미지 > 빼기 > 그대로
  try {
    await pool.query(
      'UPDATE posts SET post_title = ?, post_content = ?, post_image_url = ?, edited_at = NOW() WHERE post_id = ?',
      [title, content, image, postId],
    );
  } catch (err) {
    await removeImage(newImage); // DB 저장이 실패하면 방금 저장한 파일도 지운다
    throw err;
  }
  if (oldImage !== image) await removeImage(oldImage); // 바꾸거나 뺀 이전 이미지 파일 지우기
  res.json({ postId: Number(postId) });
});

router.delete('/:postId', needLogin, async (req, res) => { // 내 글 지우기
  const postId = toId(req.params.postId);
  if (!postId) return res.status(404).json({ message: '글을 찾을 수 없어요' });
  const denied = await checkWriter('글', POST_WRITER, [postId], req.session.userId); // 내 글인지 서버에서 확인
  if (denied) return res.status(denied[0]).json({ message: denied[1] });
  const [trading] = await pool.query("SELECT 1 FROM trades WHERE post_id = ? AND trade_status = 'ACTIVE'", [postId]); // 판매 중인 거래글인지
  if (trading.length) return res.status(400).json({ message: '거래소에 올린 마도서는 거래소에서 내려 주세요' }); // 글만 지우면 마도서가 판매 중으로 묶여 버린다

  const image = await currentImage(postId); // 지울 이미지 파일 경로를 먼저 읽어 둔다
  await pool.query('UPDATE posts SET deleted_at = NOW(), post_image_url = NULL WHERE post_id = ?', [postId]); // 행은 남기고 삭제 시각만 적는다 (소프트 삭제)
  await removeImage(image); // 지운 글의 이미지가 주소로 계속 열리지 않게
  res.json({ ok: true });
});

router.post('/:postId/comments', needLogin, async (req, res) => { // 댓글 쓰기
  const postId = toId(req.params.postId);
  if (!postId) return res.status(404).json({ message: '글을 찾을 수 없어요' });
  const content = readText(req.body?.content, LIMITS.comment, '댓글');
  if (content.error) return res.status(400).json({ message: content.error });

  const [[post]] = await pool.query('SELECT post_id FROM posts WHERE post_id = ? AND deleted_at IS NULL', [postId]); // 있는 글에만 댓글을 달 수 있다
  if (!post) return res.status(404).json({ message: '지워진 글이라 댓글을 남길 수 없어요' });

  const [result] = await pool.query(
    'INSERT INTO comments (post_id, writer_user_id, comment_content) VALUES (?, ?, ?)',
    [postId, req.session.userId, content.text],
  );
  const [[row]] = await pool.query(
    `SELECT ${COMMENT_COLUMNS} FROM comments c JOIN users u ON u.user_id = c.writer_user_id WHERE c.comment_id = ?`,
    [result.insertId],
  );
  res.status(201).json({ comment: toComment(row, req.session.userId) });
});

router.delete('/:postId/comments/:commentId', needLogin, async (req, res) => { // 내 댓글 지우기
  const postId = toId(req.params.postId);
  const commentId = toId(req.params.commentId);
  if (!postId || !commentId) return res.status(404).json({ message: '댓글을 찾을 수 없어요' });
  const denied = await checkWriter('댓글', COMMENT_WRITER, [commentId, postId], req.session.userId); // 내 댓글인지 서버에서 확인
  if (denied) return res.status(denied[0]).json({ message: denied[1] });

  await pool.query('UPDATE comments SET deleted_at = NOW() WHERE comment_id = ?', [commentId]); // 댓글도 소프트 삭제
  res.json({ ok: true });
});

export default router;
