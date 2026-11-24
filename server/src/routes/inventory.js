// 인벤토리 API: 내 마도서, 장착, 강화, 상점 판매 (모두 로그인 필요)
//   GET  /api/inventory                       가진 마도서 목록, 장착한 마도서, 골드
//   POST /api/inventory/:userWeaponId/equip   장착하기 (강화는 장착한 마도서만 할 수 있다: README, db/schema.sql)
//   POST /api/inventory/unequip               장착 풀기 (장착 중인 마도서는 상점에 팔 수 없어서)
//   POST /api/inventory/enhance               장착한 마도서 강화
//   POST /api/inventory/:userWeaponId/sell    상점에 팔기: 지금 가치만큼 골드를 받고, 행은 SOLD_TO_SHOP으로 남긴다 (도감 기록도 남음)
// 강화 규칙은 db/gameData.json의 enhanceRules (server/src/gameData.js의 nextEnhance):
//   비용 = 기본 가치 × costRatio, 성공 확률 = successPct, 가치 = 기본 가치 × valueMultiplier
//   실패하면 골드만 쓰고 단계는 그대로다 (2026-11-23 사용자 결정, 힐링 게임이라 잃는 것을 작게)
// 판매 중(trades ACTIVE)인 마도서는 장착·강화·상점 판매를 할 수 없다 (db/schema.sql의 규칙, 거래소는 routes/market.js).
// 골드나 장착을 바꾸는 요청은 트랜잭션 안에서 회원 행 → 마도서 행 순서로 잠근다 (동시에 눌러도 꼬이지 않게, 서로 기다리다 멈추지 않게).
import { Router } from 'express';
import { randomInt } from 'node:crypto';
import { pool } from '../db.js';
import { requireLogin, toId, transaction } from '../common.js';
import { itemById, gradeName, valueAt, nextEnhance, MAX_LEVEL } from '../gameData.js';

const router = Router();

router.use(requireLogin('로그인하면 볼 수 있어요')); // 모든 요청이 로그인 필요

const sameId = (a, b) => a != null && b != null && String(a) === String(b);

function toItem(row, equippedId) { // DB 행 → 화면용 마도서 (value = 지금 가치 = 상점 판매 가격)
  const item = itemById.get(row.template_id);
  return {
    userWeaponId: row.user_weapon_id,
    templateId: row.template_id,
    name: item?.name ?? '알 수 없는 마도서',
    grade: item?.grade ?? 1,
    gradeName: gradeName(item?.grade ?? 1),
    level: row.enhance_level,
    value: item ? valueAt(item, row.enhance_level) : 0,
    next: item ? nextEnhance(item, row.enhance_level) : null,
    equipped: sameId(row.user_weapon_id, equippedId),
    listed: Boolean(row.listed), // 거래소에 올려 판매 중인지 (그동안 장착, 강화, 상점 판매 불가)
    obtainedAt: row.obtained_at,
  };
}

const ACTIVE_TRADE = "SELECT 1 FROM trades WHERE user_weapon_id = ? AND trade_status = 'ACTIVE'"; // 판매 중인지
const LOCK_USER = 'SELECT gold_balance, equipped_user_weapon_id FROM users WHERE user_id = ? FOR UPDATE';
const LOCK_WEAPON = `SELECT user_weapon_id, template_id, enhance_level, obtained_at FROM user_weapons
  WHERE user_weapon_id = ? AND owner_user_id = ? AND weapon_status = 'OWNED' FOR UPDATE`;

router.get('/', async (req, res) => { // 내 마도서 목록
  const userId = req.session.userId;
  const [[user]] = await pool.query('SELECT gold_balance, equipped_user_weapon_id FROM users WHERE user_id = ?', [userId]);
  if (!user) return res.status(401).json({ message: '로그인이 풀렸어요. 다시 로그인해 주세요' });
  const [rows] = await pool.query(
    `SELECT w.user_weapon_id, w.template_id, w.enhance_level, w.obtained_at,
            EXISTS (SELECT 1 FROM trades t WHERE t.user_weapon_id = w.user_weapon_id AND t.trade_status = 'ACTIVE') AS listed
     FROM user_weapons w
     WHERE w.owner_user_id = ? AND w.weapon_status = 'OWNED'
     ORDER BY w.obtained_at DESC, w.user_weapon_id DESC`,
    [userId],
  );
  res.json({
    gold: Number(user.gold_balance),
    maxLevel: MAX_LEVEL,
    items: rows.map((row) => toItem(row, user.equipped_user_weapon_id)),
  });
});

router.post('/:userWeaponId/equip', async (req, res) => { // 장착하기
  const userId = req.session.userId;
  const userWeaponId = toId(req.params.userWeaponId);
  if (!userWeaponId) return res.status(404).json({ message: '마도서를 찾을 수 없어요' });
  await transaction(res, async (conn, refuse) => {
    const [[user]] = await conn.query(LOCK_USER, [userId]); // 같은 마도서를 파는 요청과 겹치지 않게 잠근다
    if (!user) return refuse(401, '로그인이 풀렸어요. 다시 로그인해 주세요');
    const [[weapon]] = await conn.query(LOCK_WEAPON, [userWeaponId, userId]);
    if (!weapon) return refuse(404, '내가 가진 마도서만 장착할 수 있어요');
    const [trading] = await conn.query(ACTIVE_TRADE, [userWeaponId]);
    if (trading.length) return refuse(400, '판매 중인 마도서는 장착할 수 없어요');

    await conn.query('UPDATE users SET equipped_user_weapon_id = ? WHERE user_id = ?', [weapon.user_weapon_id, userId]);
    await conn.commit();
    res.json({ equippedId: weapon.user_weapon_id });
  });
});

router.post('/unequip', async (req, res) => { // 장착 풀기
  await pool.query('UPDATE users SET equipped_user_weapon_id = NULL WHERE user_id = ?', [req.session.userId]);
  res.json({ equippedId: null });
});

router.post('/enhance', async (req, res) => { // 장착한 마도서 강화
  const userId = req.session.userId;
  await transaction(res, async (conn, refuse) => {
    const [[user]] = await conn.query(LOCK_USER, [userId]); // 골드가 꼬이지 않게 잠근다
    if (!user) return refuse(401, '로그인이 풀렸어요. 다시 로그인해 주세요');
    if (!user.equipped_user_weapon_id) return refuse(400, '먼저 강화할 마도서를 장착해 주세요');

    const [[weapon]] = await conn.query(LOCK_WEAPON, [user.equipped_user_weapon_id, userId]);
    if (!weapon) return refuse(400, '장착한 마도서를 찾을 수 없어요. 다시 장착해 주세요');
    const [trading] = await conn.query(ACTIVE_TRADE, [weapon.user_weapon_id]);
    if (trading.length) return refuse(400, '판매 중인 마도서는 강화할 수 없어요');

    const item = itemById.get(weapon.template_id);
    const next = item && nextEnhance(item, weapon.enhance_level);
    if (!next) return refuse(400, '이미 가장 높은 단계예요');
    if (Number(user.gold_balance) < next.cost) return refuse(400, `골드가 부족해요 (${next.cost.toLocaleString('ko-KR')}골드 필요)`);

    await conn.query('UPDATE users SET gold_balance = gold_balance - ? WHERE user_id = ?', [next.cost, userId]);
    const success = randomInt(100) < next.successPct;
    if (success) {
      await conn.query('UPDATE user_weapons SET enhance_level = ? WHERE user_weapon_id = ?', [next.level, weapon.user_weapon_id]);
      await conn.query( // 도감의 최고 강화 단계 (더 높을 때만)
        'UPDATE user_collection SET max_enhance_level = GREATEST(max_enhance_level, ?) WHERE user_id = ? AND template_id = ?',
        [next.level, userId, weapon.template_id],
      );
    }
    await conn.commit();

    const level = success ? next.level : weapon.enhance_level;
    res.json({
      success,
      cost: next.cost,
      gold: Number(user.gold_balance) - next.cost,
      item: toItem({ ...weapon, enhance_level: level }, weapon.user_weapon_id),
    });
  });
});

router.post('/:userWeaponId/sell', async (req, res) => { // 상점에 팔기
  const userId = req.session.userId;
  const userWeaponId = toId(req.params.userWeaponId);
  if (!userWeaponId) return res.status(404).json({ message: '마도서를 찾을 수 없어요' });
  await transaction(res, async (conn, refuse) => {
    const [[user]] = await conn.query(LOCK_USER, [userId]); // 두 번 팔리거나 골드가 꼬이지 않게 잠근다
    if (!user) return refuse(401, '로그인이 풀렸어요. 다시 로그인해 주세요');
    const [[weapon]] = await conn.query(LOCK_WEAPON, [userWeaponId, userId]);
    if (!weapon) return refuse(404, '내가 가진 마도서만 팔 수 있어요');
    if (sameId(user.equipped_user_weapon_id, weapon.user_weapon_id)) return refuse(400, '장착 중인 마도서는 팔 수 없어요. 먼저 장착을 풀어 주세요');
    const [trading] = await conn.query(ACTIVE_TRADE, [weapon.user_weapon_id]);
    if (trading.length) return refuse(400, '거래소에 올린 마도서는 상점에 팔 수 없어요');
    const item = itemById.get(weapon.template_id);
    if (!item) return refuse(400, '알 수 없는 마도서라 팔 수 없어요');

    const price = valueAt(item, weapon.enhance_level); // 지금 가치 = 강화할수록 오른다
    await conn.query("UPDATE user_weapons SET weapon_status = 'SOLD_TO_SHOP' WHERE user_weapon_id = ?", [weapon.user_weapon_id]);
    await conn.query('UPDATE users SET gold_balance = gold_balance + ? WHERE user_id = ?', [price, userId]);
    await conn.commit();
    res.json({ soldId: weapon.user_weapon_id, price, gold: Number(user.gold_balance) + price });
  });
});

export default router;
