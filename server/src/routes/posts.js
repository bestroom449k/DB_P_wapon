// 커뮤니티 게시판 API (글과 댓글)
//   GET    /api/posts                               글 목록 (최신 글부터, 지운 글과 거래글은 빼고)
//   GET    /api/posts/:postId                       글 하나 + 댓글 (볼 때마다 조회수 +1, ?noview=1이면 그대로)
//   POST   /api/posts                               글쓰기
//   PATCH  /api/posts/:postId                       내 글 고치기
//   DELETE /api/posts/:postId                       내 글 지우기
//   POST   /api/posts/:postId/comments              댓글 쓰기
//   DELETE /api/posts/:postId/comments/:commentId   내 댓글 지우기
// 읽기는 누구나, 쓰기·고치기·지우기는 로그인해야 한다.
// 지울 때는 행을 없애지 않고 deleted_at에 시각만 적는다 (db/schema.sql의 소프트 삭제).
import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

const LIMITS = { title: 100, content: 5000, comment: 500 }; // 글자 수 상한 (제목·댓글은 DB 칸 크기, 본문은 TEXT 안에서 넉넉하게)

const toId = (value) => (/^[1-9]\d{0,17}$/.test(value) ? value : null); // 주소의 번호 (숫자가 아니면 null)

function readText(value, max, label) { // 앞뒤 빈칸을 지운 글. 비었거나 너무 길면 오류 문구
  const text = String(value ?? '').trim();
  if (!text) return { error: `${label}을 입력해 주세요` };
  if ([...text].length > max) return { error: `${label}은 ${max}자까지 쓸 수 있어요` };
  return { text };
}

function requireLogin(req, res, next) { // 로그인해야 하는 요청
  if (!req.session.userId) return res.status(401).json({ message: '로그인이 필요해요' });
  next();
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
  mine: row.writer_user_id === userId,
});

const COMMENT_COLUMNS = 'c.comment_id, c.writer_user_id, c.comment_content, c.written_at, u.nickname'; // 댓글 + 작성자 닉네임

router.get('/', async (req, res) => { // 글 목록
  const [rows] = await pool.query(
    `SELECT p.post_id, p.post_title, p.view_count, p.written_at, p.edited_at, u.nickname
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
    })),
  });
});

router.get('/:postId', async (req, res) => { // 글 하나 + 댓글
  const postId = toId(req.params.postId);
  if (!postId) return res.status(404).json({ message: '글을 찾을 수 없어요' });
  if (req.query.noview !== '1') { // 글을 고치려고 불러올 때는 조회수를 올리지 않는다
    await pool.query('UPDATE posts SET view_count = view_count + 1 WHERE post_id = ? AND deleted_at IS NULL', [postId]);
  }

  const [[post]] = await pool.query(
    `SELECT p.post_id, p.writer_user_id, p.post_title, p.post_content, p.view_count, p.written_at, p.edited_at, u.nickname
     FROM posts p
     JOIN users u ON u.user_id = p.writer_user_id
     WHERE p.post_id = ? AND p.deleted_at IS NULL`,
    [postId],
  );
  if (!post) return res.status(404).json({ message: '글을 찾을 수 없어요' });

  const [comments] = await pool.query(
    `SELECT ${COMMENT_COLUMNS}
     FROM comments c
     JOIN users u ON u.user_id = c.writer_user_id
     WHERE c.post_id = ? AND c.deleted_at IS NULL
     ORDER BY c.written_at, c.comment_id`,
    [postId],
  );

  const userId = req.session.userId;
  res.json({
    post: {
      postId: post.post_id,
      title: post.post_title,
      content: post.post_content,
      nickname: post.nickname,
      views: post.view_count,
      writtenAt: post.written_at,
      editedAt: post.edited_at,
      mine: post.writer_user_id === userId,
    },
    comments: comments.map((row) => toComment(row, userId)),
  });
});

router.post('/', requireLogin, async (req, res) => { // 글쓰기
  const title = readText(req.body?.title, LIMITS.title, '제목');
  const content = readText(req.body?.content, LIMITS.content, '내용');
  const error = title.error ?? content.error;
  if (error) return res.status(400).json({ message: error });

  const [result] = await pool.query(
    'INSERT INTO posts (writer_user_id, post_title, post_content) VALUES (?, ?, ?)',
    [req.session.userId, title.text, content.text],
  );
  res.status(201).json({ postId: result.insertId });
});

router.patch('/:postId', requireLogin, async (req, res) => { // 내 글 고치기
  const postId = toId(req.params.postId);
  if (!postId) return res.status(404).json({ message: '글을 찾을 수 없어요' });
  const title = readText(req.body?.title, LIMITS.title, '제목');
  const content = readText(req.body?.content, LIMITS.content, '내용');
  const error = title.error ?? content.error;
  if (error) return res.status(400).json({ message: error });

  const denied = await checkWriter('글', POST_WRITER, [postId], req.session.userId);
  if (denied) return res.status(denied[0]).json({ message: denied[1] });

  await pool.query(
    'UPDATE posts SET post_title = ?, post_content = ?, edited_at = NOW() WHERE post_id = ?',
    [title.text, content.text, postId],
  );
  res.json({ postId: Number(postId) });
});

router.delete('/:postId', requireLogin, async (req, res) => { // 내 글 지우기
  const postId = toId(req.params.postId);
  if (!postId) return res.status(404).json({ message: '글을 찾을 수 없어요' });
  const denied = await checkWriter('글', POST_WRITER, [postId], req.session.userId);
  if (denied) return res.status(denied[0]).json({ message: denied[1] });

  await pool.query('UPDATE posts SET deleted_at = NOW() WHERE post_id = ?', [postId]);
  res.json({ ok: true });
});

router.post('/:postId/comments', requireLogin, async (req, res) => { // 댓글 쓰기
  const postId = toId(req.params.postId);
  if (!postId) return res.status(404).json({ message: '글을 찾을 수 없어요' });
  const content = readText(req.body?.content, LIMITS.comment, '댓글');
  if (content.error) return res.status(400).json({ message: content.error });

  const [[post]] = await pool.query('SELECT post_id FROM posts WHERE post_id = ? AND deleted_at IS NULL', [postId]);
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

router.delete('/:postId/comments/:commentId', requireLogin, async (req, res) => { // 내 댓글 지우기
  const postId = toId(req.params.postId);
  const commentId = toId(req.params.commentId);
  if (!postId || !commentId) return res.status(404).json({ message: '댓글을 찾을 수 없어요' });
  const denied = await checkWriter('댓글', COMMENT_WRITER, [commentId, postId], req.session.userId);
  if (denied) return res.status(denied[0]).json({ message: denied[1] });

  await pool.query('UPDATE comments SET deleted_at = NOW() WHERE comment_id = ?', [commentId]);
  res.json({ ok: true });
});

export default router;
