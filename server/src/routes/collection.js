// 도감 API
//   GET /api/collection   게임에 나오는 마도서 전부와, 내가 얻었는지·처음 얻은 날·최고 강화 단계
// 아직 못 얻은 마도서는 이름과 설명을 보내지 않는다 (화면에서 "???" 잠긴 칸, 등급만 보인다).
// 로그인 전이면 전부 잠긴 칸으로 보낸다. 도감 기록은 user_collection (뽑기에서 처음 얻을 때 생기고, 강화하면 최고 단계가 오른다).
import { Router } from 'express';
import { pool } from '../db.js';
import { gameItems, gradeName } from '../gameData.js';

const router = Router();

router.get('/', async (req, res) => {
  const userId = req.session.userId;
  const records = new Map();
  if (userId) {
    const [rows] = await pool.query(
      'SELECT template_id, first_obtained_at, max_enhance_level FROM user_collection WHERE user_id = ?',
      [userId],
    );
    for (const row of rows) records.set(row.template_id, row);
  }

  const entries = gameItems.map((item) => {
    const record = records.get(item.id);
    return {
      id: item.id,
      grade: item.grade,
      gradeName: gradeName(item.grade),
      owned: Boolean(record),
      name: record ? item.name : null,
      description: record ? item.description : null,
      firstObtainedAt: record?.first_obtained_at ?? null,
      maxLevel: record?.max_enhance_level ?? 0,
    };
  });
  res.json({ loggedIn: Boolean(userId), entries });
});

export default router;
