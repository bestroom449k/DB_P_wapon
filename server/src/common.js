// 여러 API가 같이 쓰는 작은 도구
import { pool } from './db.js';

export const toId = (value) => (/^[1-9]\d{0,17}$/.test(value) ? value : null); // 주소의 번호 (숫자가 아니면 null)

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
