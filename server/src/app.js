// 다섯 빛 공방 서버
//   - frontend 폴더(타이틀 화면 index.html, 게임 화면 game.html)를 그대로 보여 준다 → http://localhost:3000
//   - /api/auth/... 로 회원가입, 로그인을 처리한다
//   - /api/posts/... 로 커뮤니티 게시판의 글과 댓글을 처리한다
//   - /api/gacha/... 로 뽑기를 처리한다 (결과를 정하고 골드, 인벤토리, 도감에 저장)
//   - /api/collection 으로 도감, /api/inventory/... 로 내 마도서·장착·강화·상점 판매를 처리한다
//   - 로그인 상태는 세션으로 기억한다 (브라우저에는 세션 번호가 담긴 쿠키만 저장)
import express from 'express';
import session from 'express-session';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';
import authRouter, { SESSION_COOKIE } from './routes/auth.js';
import postsRouter from './routes/posts.js';
import gachaRouter from './routes/gacha.js';
import collectionRouter from './routes/collection.js';
import inventoryRouter from './routes/inventory.js';

if (!process.env.SESSION_SECRET || !process.env.DB_USER) {
  console.error('server/.env 파일이 없거나 비어 있어요. .env.example을 복사해 .env를 만들고 값을 채워 주세요.');
  process.exit(1);
}

const app = express();
const frontendDir = fileURLToPath(new URL('../../frontend', import.meta.url)); // 화면 파일 위치

app.use(express.static(frontendDir)); // 화면 (먼저 처리해서 화면 파일 요청은 아래 세션 처리를 거치지 않음)
app.use(express.json({ limit: '64kb' })); // 요청 본문(JSON) 읽기 (게시글 본문 5000자까지 받을 수 있게)
app.use(session({ // 로그인 유지
  name: SESSION_COOKIE, // 쿠키 이름
  secret: process.env.SESSION_SECRET, // 쿠키 위조 방지용 비밀 값
  resave: false, // 바뀐 것이 없으면 다시 저장하지 않음
  saveUninitialized: false, // 로그인 전에는 세션을 만들지 않음
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 7 }, // JS에서 못 읽는 쿠키, 7일 유지
}));

app.use('/api/auth', authRouter); // 회원 API
app.use('/api/posts', postsRouter); // 커뮤니티 게시판 API
app.use('/api/gacha', gachaRouter); // 뽑기 API
app.use('/api/collection', collectionRouter); // 도감 API
app.use('/api/inventory', inventoryRouter); // 내 마도서, 장착, 강화, 상점 판매 API

app.use((err, req, res, next) => { // 처리 중 오류
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: '요청 형식이 올바르지 않아요' });
  console.error(err);
  res.status(500).json({ message: '서버에 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요' });
});

try { // 시작할 때 DB 연결을 한 번 확인해 문제를 바로 알려 준다
  await pool.query('SELECT 1 FROM users LIMIT 1');
  console.log('MySQL 연결 성공 (weapon_game.users)');
} catch (err) {
  console.error('MySQL 연결 실패:', err.message);
  console.error('→ server/.env의 DB_USER, DB_PASSWORD를 확인하고, db/schema.sql을 실행했는지 확인하세요.');
}

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`다섯 빛 공방: http://localhost:${port}`));
