// 뽑기 API
//   POST /api/gacha/draw   1회 뽑기 (로그인 필요): 골드를 내고 아이템 하나를 받는다
// 결과는 서버가 정한다. 화면(frontend/js/game/function/hud.js)은 받은 등급에 맞는 영상을 틀고 결과를 보여 줄 뿐이다.
// 규칙은 db/gameData.json의 draw:
//   cost          1회 가격 (골드)
//   legendaryPct  5등급(황금, 황금판 영상)이 나올 확률(%). 지금은 시연용 50 (확률 창에 적힌 1%와 다르다)
//   itemType      뽑기에 나오는 아이템 종류 (지금은 마도서만, 검은 나중에)
// 5등급이 아니면 아이템이 있는 1~4등급 중에서 grades의 drawRatePct 비율로 고른다.
// 골드 차감, 인벤토리 추가, 도감 기록은 트랜잭션 하나로 묶는다 (중간에 실패하면 전부 취소).
import { Router } from 'express';
import { randomInt } from 'node:crypto';
import { pool } from '../db.js';
import { gameData, gameItems as items, gradeName } from '../gameData.js';

const router = Router();
const { draw, grades } = gameData;
const TOP_GRADE = 5; // 황금

function rollGrade() { // 등급 뽑기
  if (randomInt(10000) < draw.legendaryPct * 100) return TOP_GRADE;
  const normal = grades.filter((g) => g.grade < TOP_GRADE && items.some((item) => item.grade === g.grade)); // 아이템이 있는 1~4등급만
  let roll = randomInt(normal.reduce((sum, g) => sum + g.drawRatePct * 100, 0));
  for (const g of normal) {
    roll -= g.drawRatePct * 100;
    if (roll < 0) return g.grade;
  }
  return normal[0].grade;
}

function pickItem(grade) { // 그 등급의 아이템 하나 (없으면 뽑기 아이템 전체에서)
  const sameGrade = items.filter((item) => item.grade === grade);
  const choices = sameGrade.length ? sameGrade : items;
  return choices[randomInt(choices.length)];
}

router.post('/draw', async (req, res) => { // 1회 뽑기
  const userId = req.session.userId;
  if (!userId) return res.status(401).json({ message: '로그인하면 뽑을 수 있어요' });

  const item = pickItem(rollGrade());
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[user]] = await conn.query('SELECT gold_balance FROM users WHERE user_id = ? FOR UPDATE', [userId]); // 동시에 두 번 눌러도 골드가 꼬이지 않게 잠근다
    if (!user) {
      await conn.rollback();
      return res.status(401).json({ message: '로그인이 풀렸어요. 다시 로그인해 주세요' });
    }
    if (Number(user.gold_balance) < draw.cost) {
      await conn.rollback();
      return res.status(400).json({ message: `골드가 부족해요 (1회 ${draw.cost.toLocaleString('ko-KR')}골드)` });
    }
    await conn.query('UPDATE users SET gold_balance = gold_balance - ? WHERE user_id = ?', [draw.cost, userId]);
    await conn.query('INSERT INTO user_weapons (owner_user_id, template_id) VALUES (?, ?)', [userId, item.id]); // 인벤토리에 추가
    const [collected] = await conn.query('INSERT IGNORE INTO user_collection (user_id, template_id) VALUES (?, ?)', [userId, item.id]); // 처음 얻었으면 도감에 기록
    await conn.commit();

    res.json({
      grade: item.grade,
      gradeName: gradeName(item.grade),
      item: { id: item.id, name: item.name, type: item.type, description: item.description },
      gold: Number(user.gold_balance) - draw.cost,
      isNew: collected.affectedRows === 1,
    });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

export default router;
