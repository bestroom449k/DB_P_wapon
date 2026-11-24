// 게임 규칙과 아이템 목록: db/gameData.json을 서버가 켜질 때 한 번 읽어 둔다
// (DB에는 유저 데이터만 저장하고, 아이템 이름·등급·확률·가격 같은 규칙은 이 JSON에 둔다)
import { readFileSync } from 'node:fs';

export const gameData = JSON.parse(readFileSync(new URL('../../db/gameData.json', import.meta.url), 'utf8'));

const { grades, weapons, enhanceRules } = gameData;

export const itemById = new Map(weapons.map((item) => [item.id, item])); // 아이템 번호(template_id) → 아이템
export const gradeName = (grade) => grades.find((g) => g.grade === grade)?.name ?? '';
export const gameItems = [...weapons].sort((a, b) => a.grade - b.grade || a.id - b.id); // 모든 마도서 (등급 → 번호 순): 뽑기 후보이고, 도감에 이 순서로 놓인다
export const MAX_LEVEL = Math.max(...enhanceRules.map((rule) => rule.targetLevel)); // 가장 높은 강화 단계

export function valueAt(item, level) { // 강화 단계에 따른 가치 (기본 가치 × 그 단계의 valueMultiplier)
  const rule = enhanceRules.find((r) => r.targetLevel === level);
  return Math.round(item.baseSellPrice * (rule?.valueMultiplier ?? 1));
}

export function nextEnhance(item, level) { // 다음 강화 단계의 비용·확률·가치 (이미 가장 높으면 null)
  const rule = enhanceRules.find((r) => r.targetLevel === level + 1);
  if (!rule) return null;
  return {
    level: rule.targetLevel,
    cost: Math.round(item.baseSellPrice * rule.costRatio), // 비용 = 기본 가치 × costRatio
    successPct: rule.successPct,
    value: valueAt(item, rule.targetLevel),
  };
}
