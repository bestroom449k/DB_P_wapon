// 여러 API가 같이 쓰는 작은 도구
import { pool } from './db.js';

export const toId = (value) => (/^[1-9]\d{0,17}$/.test(value) ? value : null); // 주소의 번호 (숫자가 아니면 null)

export const LIMITS = { title: 100, content: 5000, comment: 500 }; // 글자 수 상한 (제목·댓글은 DB 칸 크기, 본문은 TEXT 안에서 넉넉하게). 게시판과 거래소가 같이 쓴다

export function readText(value, max, label, { optional = false } = {}) { // 앞뒤 빈칸을 지운 글. 비었거나(optional이면 빈 글 허용) 너무 길면 오류 문구
  const text = String(value ?? '').replace(/\r\n/g, '\n').trim(); // 파일과 함께 보낸 글은 브라우저가 줄바꿈을 \r\n으로 바꾸므로 되돌린다
  if (!text && !optional) return { error: `${label}을 입력해 주세요` };
  if ([...text].length > max) return { error: `${label}은 ${max}자까지 쓸 수 있어요` };
  return { text };
}

export const requireLogin = (message = '로그인이 필요해요') => (req, res, next) => { // 로그인해야 하는 요청 (로그인 전이면 message로 401)
  if (!req.session.userId) return res.status(401).json({ message });
  next();
};

// 트랜잭션 하나로 work(conn, refuse)를 실행한다 (인벤토리, 거래소가 같이 쓴다).
// work는 끝에 직접 commit하고, 거절할 때는 return refuse(상태, 메시지) → 되돌리고 그 메시지로 응답한다.
export async function transaction(res, work) {
  const conn = await pool.getConnection(); // 트랜잭션은 연결 하나로 묶어야 한다
  const refuse = async (status, message) => {
    await conn.rollback(); // 지금까지 한 일을 취소
    res.status(status).json({ message });
  };
  try {
    await conn.beginTransaction(); // 여기부터 전부 성공하거나 전부 취소
    await work(conn, refuse);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release(); // 연결을 풀에 돌려준다
  }
}
