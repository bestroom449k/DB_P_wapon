// 회원 API
//   POST /api/auth/signup  회원가입 (가입하면 바로 로그인 상태)
//   POST /api/auth/login   로그인
//   POST /api/auth/logout  로그아웃
//   GET  /api/auth/me      지금 로그인한 회원 정보 (로그인 전이면 user: null)
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';

const router = Router();

const RULES = { // 입력 규칙 (화면에서도 같은 규칙으로 먼저 검사함)
  loginId: { pattern: /^[a-z0-9_]{4,20}$/, message: '아이디는 영문 소문자, 숫자, 밑줄(_)로 4~20자예요' },
  nickname: { pattern: /^[가-힣a-zA-Z0-9]{2,12}$/, message: '닉네임은 한글, 영문, 숫자로 2~12자예요' },
  password: { pattern: /^.{8,64}$/, message: '비밀번호는 8~64자예요' },
};
const check = (field, value) => (RULES[field].pattern.test(value) ? null : RULES[field].message); // 규칙에 맞으면 null

const HASH_ROUNDS = 10; // bcrypt 암호화 강도 (높을수록 안전하지만 느림)
const DUMMY_HASH = bcrypt.hashSync('no-such-user', HASH_ROUNDS); // 없는 아이디도 같은 시간이 걸리게 할 가짜 해시
const USER_COLUMNS = 'user_id, login_id, nickname, gold_balance'; // 화면에 보내도 되는 칸만

export const SESSION_COOKIE = 'wg.sid'; // 로그인 쿠키 이름 (app.js의 세션 설정도 이 값을 씀)

const toPublic = (row) => ({ userId: row.user_id, loginId: row.login_id, nickname: row.nickname, gold: row.gold_balance }); // DB 행 → 화면용

async function findUser(userId) { // 회원 번호로 화면용 회원 정보 찾기 (없으면 null)
  const [[row]] = await pool.query(`SELECT ${USER_COLUMNS} FROM users WHERE user_id = ?`, [userId]);
  return row ? toPublic(row) : null;
}

// 로그인 상태로 만들기: 세션 번호를 새로 발급하고(세션 고정 공격 방지) 회원 번호를 기억한다
function startSession(req, userId) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = userId;
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

router.post('/signup', async (req, res) => { // 회원가입
  const loginId = String(req.body?.loginId ?? '').trim().toLowerCase();
  const nickname = String(req.body?.nickname ?? '').trim();
  const password = String(req.body?.password ?? '');
  const error = check('loginId', loginId) ?? check('nickname', nickname) ?? check('password', password);
  if (error) return res.status(400).json({ message: error });

  const [taken] = await pool.query('SELECT login_id FROM users WHERE login_id = ? OR nickname = ?', [loginId, nickname]); // 중복 확인
  if (taken.some((row) => row.login_id === loginId)) return res.status(409).json({ message: '이미 쓰고 있는 아이디예요' });
  if (taken.length) return res.status(409).json({ message: '이미 쓰고 있는 닉네임이에요' });

  const passwordHash = await bcrypt.hash(password, HASH_ROUNDS); // 비밀번호 암호화 (원문은 저장하지 않음)
  let result;
  try {
    [result] = await pool.query('INSERT INTO users (login_id, password_hash, nickname) VALUES (?, ?, ?)', [loginId, passwordHash, nickname]); // 회원 저장 (골드 10000은 DB 기본값)
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: '방금 다른 사람이 같은 아이디나 닉네임으로 가입했어요. 다른 값으로 해 주세요' });
    throw err;
  }

  await startSession(req, result.insertId); // 가입하면 바로 로그인
  res.status(201).json({ user: await findUser(result.insertId) });
});

router.post('/login', async (req, res) => { // 로그인
  const loginId = String(req.body?.loginId ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  if (!loginId || !password) return res.status(400).json({ message: '아이디와 비밀번호를 입력해 주세요' });

  const [[user]] = await pool.query(`SELECT ${USER_COLUMNS}, password_hash FROM users WHERE login_id = ?`, [loginId]);
  const matches = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH); // 암호화된 값끼리 비교
  if (!user || !matches) return res.status(401).json({ message: '아이디 또는 비밀번호가 맞지 않아요' }); // 어느 쪽이 틀렸는지는 알려 주지 않음

  await startSession(req, user.user_id);
  res.json({ user: toPublic(user) });
});

router.post('/logout', (req, res, next) => { // 로그아웃
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie(SESSION_COOKIE);
    res.json({ ok: true });
  });
});

router.get('/me', async (req, res) => { // 내 정보 (새로고침해도 로그인 상태를 이어 가기 위해)
  if (!req.session.userId) return res.json({ user: null }); // 로그인 전 (오류가 아니라 정상 상태)
  res.json({ user: await findUser(req.session.userId) });
});

export default router;
