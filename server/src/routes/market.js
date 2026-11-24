// 거래소 API: 플레이어끼리 마도서를 골드로 사고판다
//   GET  /api/market                  판매 중인 마도서 목록 (누구나)
//   POST /api/market                  내 마도서 올리기 { userWeaponId, price } (로그인)
//   POST /api/market/:postId/buy      사기 (로그인)
//   POST /api/market/:postId/cancel   내가 올린 마도서 내리기 (로그인)
// 거래글 하나 = posts 한 줄(판매자, 제목) + trades 한 줄(무기, 가격, 상태). db/schema.sql의 규칙을 따른다:
//   올릴 때: 내가 가진 마도서, 장착 중이 아님, 이미 판매 중이 아님
//   살 때:   판매 중, 판매자가 아닌 사람, 골드가 충분함
// 골드와 주인이 바뀌는 요청은 트랜잭션 하나로 묶고, 회원 행(번호 순서) → 거래 행 → 마도서 행 순서로 잠근다
// (동시에 눌러도 두 번 팔리거나 골드가 꼬이지 않게, 서로 기다리다 멈추지 않게).
import { Router } from 'express';
import { pool } from '../db.js';
import { requireLogin, toId, transaction } from '../common.js';
import { itemById, gradeName, MAX_LEVEL } from '../gameData.js';

const router = Router();
const needLogin = requireLogin('로그인하면 거래소를 이용할 수 있어요');
const MAX_PRICE = 100_000_000; // 가격 상한 (1억 골드)
const won = (n) => Number(n).toLocaleString('ko-KR');

function itemInfo(templateId, level) { // 화면용 마도서 정보 (이름, 등급, 강화 단계)
  const item = itemById.get(templateId);
  return {
    templateId,
    name: item?.name ?? '알 수 없는 마도서',
    grade: item?.grade ?? 1,
    gradeName: gradeName(item?.grade ?? 1),
    level,
  };
}

const LOCK_TRADE = `SELECT t.user_weapon_id, t.sale_price, t.trade_status, p.writer_user_id, p.deleted_at
  FROM trades t JOIN posts p ON p.post_id = t.post_id
  WHERE t.post_id = ? FOR UPDATE`; // 거래 행 잠그기 (판매자는 거래글의 글쓴이)

router.get('/', async (req, res) => { // 판매 중인 마도서 목록 (최신 순)
  const [rows] = await pool.query(
    `SELECT t.post_id, t.sale_price, t.listed_enhance_level, w.template_id, p.writer_user_id, p.written_at, u.nickname
     FROM trades t
     JOIN posts p ON p.post_id = t.post_id
     JOIN users u ON u.user_id = p.writer_user_id
     JOIN user_weapons w ON w.user_weapon_id = t.user_weapon_id
     WHERE t.trade_status = 'ACTIVE' AND p.deleted_at IS NULL
     ORDER BY p.written_at DESC, t.post_id DESC`,
  );
  const userId = req.session.userId;
  res.json({
    maxLevel: MAX_LEVEL,
    listings: rows.map((row) => ({
      postId: row.post_id,
      item: itemInfo(row.template_id, row.listed_enhance_level),
      price: Number(row.sale_price),
      seller: row.nickname,
      listedAt: row.written_at,
      mine: row.writer_user_id === userId, // 내가 올린 것이면 화면에 "내리기"
    })),
  });
});

router.post('/', needLogin, async (req, res) => { // 내 마도서 올리기
  const userId = req.session.userId;
  const userWeaponId = toId(req.body?.userWeaponId);
  const price = Number(req.body?.price);
  if (!userWeaponId) return res.status(404).json({ message: '마도서를 찾을 수 없어요' });
  if (!Number.isSafeInteger(price) || price < 1 || price > MAX_PRICE) {
    return res.status(400).json({ message: `가격은 1부터 ${won(MAX_PRICE)}골드까지 정할 수 있어요` });
  }

  await transaction(res, async (conn, refuse) => {
    const [[user]] = await conn.query('SELECT equipped_user_weapon_id FROM users WHERE user_id = ? FOR UPDATE', [userId]); // 장착과 겹치지 않게 잠근다
    if (!user) return refuse(401, '로그인이 풀렸어요. 다시 로그인해 주세요');
    const [[weapon]] = await conn.query(
      "SELECT user_weapon_id, template_id, enhance_level FROM user_weapons WHERE user_weapon_id = ? AND owner_user_id = ? AND weapon_status = 'OWNED' FOR UPDATE",
      [userWeaponId, userId],
    );
    if (!weapon) return refuse(404, '내가 가진 마도서만 올릴 수 있어요');
    if (String(user.equipped_user_weapon_id) === String(weapon.user_weapon_id)) return refuse(400, '장착 중인 마도서는 올릴 수 없어요. 먼저 장착을 풀어 주세요');
    const [listed] = await conn.query("SELECT 1 FROM trades WHERE user_weapon_id = ? AND trade_status = 'ACTIVE'", [weapon.user_weapon_id]);
    if (listed.length) return refuse(400, '이미 거래소에 올린 마도서예요');
    const item = itemById.get(weapon.template_id);
    if (!item) return refuse(400, '알 수 없는 마도서라 올릴 수 없어요');

    const title = `${item.name} +${weapon.enhance_level}`; // 거래글 제목은 마도서 이름과 강화 단계
    const [post] = await conn.query('INSERT INTO posts (writer_user_id, post_title, post_content) VALUES (?, ?, ?)', [userId, title, '']);
    await conn.query(
      'INSERT INTO trades (post_id, user_weapon_id, listed_enhance_level, sale_price) VALUES (?, ?, ?, ?)', // 상태는 기본값 ACTIVE
      [post.insertId, weapon.user_weapon_id, weapon.enhance_level, price],
    );
    await conn.commit();
    res.status(201).json({ postId: post.insertId });
  });
});

router.post('/:postId/buy', needLogin, async (req, res) => { // 사기
  const buyerId = req.session.userId;
  const postId = toId(req.params.postId);
  if (!postId) return res.status(404).json({ message: '거래를 찾을 수 없어요' });
  const [[found]] = await pool.query('SELECT p.writer_user_id FROM trades t JOIN posts p ON p.post_id = t.post_id WHERE t.post_id = ?', [postId]); // 판매자를 먼저 알아야 회원 행을 번호 순서대로 잠글 수 있다
  if (!found) return res.status(404).json({ message: '거래를 찾을 수 없어요' });
  const sellerId = found.writer_user_id;
  if (sellerId === buyerId) return res.status(400).json({ message: '내가 올린 마도서는 살 수 없어요' });

  await transaction(res, async (conn, refuse) => {
    const gold = {}; // 회원 번호 → 잠근 뒤의 골드
    for (const id of [buyerId, sellerId].sort((a, b) => a - b)) { // 번호가 작은 회원부터 잠근다 (두 사람이 서로의 것을 동시에 사도 멈추지 않게)
      const [[row]] = await conn.query('SELECT gold_balance FROM users WHERE user_id = ? FOR UPDATE', [id]);
      gold[id] = row ? Number(row.gold_balance) : null;
    }
    if (gold[buyerId] === null) return refuse(401, '로그인이 풀렸어요. 다시 로그인해 주세요');

    const [[trade]] = await conn.query(LOCK_TRADE, [postId]);
    if (!trade || trade.trade_status !== 'ACTIVE' || trade.deleted_at) return refuse(409, '이미 팔렸거나 내려간 마도서예요');
    const price = Number(trade.sale_price);
    if (gold[buyerId] < price) return refuse(400, `골드가 부족해요 (${won(price)}골드 필요)`);
    const [[weapon]] = await conn.query(
      "SELECT template_id, enhance_level FROM user_weapons WHERE user_weapon_id = ? AND owner_user_id = ? AND weapon_status = 'OWNED' FOR UPDATE",
      [trade.user_weapon_id, sellerId],
    );
    if (!weapon) return refuse(409, '판매자가 더 이상 가진 마도서가 아니에요');

    await conn.query('UPDATE users SET gold_balance = gold_balance - ? WHERE user_id = ?', [price, buyerId]); // 구매자 골드 빼기
    await conn.query('UPDATE users SET gold_balance = gold_balance + ? WHERE user_id = ?', [price, sellerId]); // 판매자 골드 더하기
    await conn.query('UPDATE user_weapons SET owner_user_id = ? WHERE user_weapon_id = ?', [buyerId, trade.user_weapon_id]); // 주인 바꾸기 (강화 단계는 그대로)
    await conn.query("UPDATE trades SET trade_status = 'SOLD', buyer_user_id = ?, sold_at = NOW() WHERE post_id = ?", [buyerId, postId]); // 거래 완료 기록
    const [collected] = await conn.query('INSERT IGNORE INTO user_collection (user_id, template_id) VALUES (?, ?)', [buyerId, weapon.template_id]); // 처음 얻었으면 도감에 기록
    await conn.query( // 도감의 최고 강화 단계 (더 높을 때만)
      'UPDATE user_collection SET max_enhance_level = GREATEST(max_enhance_level, ?) WHERE user_id = ? AND template_id = ?',
      [weapon.enhance_level, buyerId, weapon.template_id],
    );
    await conn.commit();
    res.json({ gold: gold[buyerId] - price, item: itemInfo(weapon.template_id, weapon.enhance_level), isNew: collected.affectedRows === 1 });
  });
});

router.post('/:postId/cancel', needLogin, async (req, res) => { // 내가 올린 마도서 내리기
  const userId = req.session.userId;
  const postId = toId(req.params.postId);
  if (!postId) return res.status(404).json({ message: '거래를 찾을 수 없어요' });
  await transaction(res, async (conn, refuse) => {
    const [[trade]] = await conn.query(LOCK_TRADE, [postId]);
    if (!trade) return refuse(404, '거래를 찾을 수 없어요');
    if (trade.writer_user_id !== userId) return refuse(403, '내가 올린 마도서만 내릴 수 있어요');
    if (trade.trade_status !== 'ACTIVE') return refuse(409, '이미 팔렸거나 내려간 마도서예요');
    await conn.query("UPDATE trades SET trade_status = 'CANCELLED' WHERE post_id = ?", [postId]); // 거래 기록은 남기고 상태만 바꾼다
    await conn.commit();
    res.json({ ok: true });
  });
});

export default router;
