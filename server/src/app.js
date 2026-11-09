// 다섯 빛 공방 서버
//   - frontend 폴더(타이틀 화면)를 그대로 보여 준다 → http://localhost:3000
//   - /api/auth/... 로 회원가입, 로그인을 처리한다
//   - 로그인 상태는 세션으로 기억한다 (브라우저에는 세션 번호가 담긴 쿠키만 저장)
import express from 'express';
import session from 'express-session';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';
import authRouter from './routes/auth.js';

if (!process.env.SESSION_SECRET || !process.env.DB_USER) {
  console.error('server/.env 파일이 없거나 비어 있어요. .env.example을 복사해 .env를 만들고 값을 채워 주세요.');
  process.exit(1);
}

const app = express();
const frontendDir = fileURLToPath(new URL('../../frontend', import.meta.url)); // 화면 파일 위치

app.use(express.json({ limit: '10kb' })); // 요청 본문(JSON) 읽기
app.use(session({ // 로그인 유지
  name: 'wg.sid', // 쿠키 이름
  secret: process.env.SESSION_SECRET, // 쿠키 위조 방지용 비밀 값
  resave: false, // 바뀐 것이 없으면 다시 저장하지 않음
  saveUninitialized: false, // 로그인 전에는 세션을 만들지 않음
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 24 * 7 }, // JS에서 못 읽는 쿠키, 7일 유지
}));

app.use('/api/auth', authRouter); // 회원 API
app.use(express.static(frontendDir)); // 화면

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
