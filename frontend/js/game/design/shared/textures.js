// 그림 파일 없이 캔버스에 직접 그리는 텍스처들: 마도서 카드, 카드 빛 테두리, 구름, 바닥 룬 고리, 네 갈래 별빛
// (오각별 마법진과 둥근 빛은 타이틀 화면의 js/design/shared/textures.js를 같이 쓴다)
import * as THREE from 'three';
import { random } from './random.js';

function paper(width, height) { // 빈 캔버스 만들기
  const canvas = Object.assign(document.createElement('canvas'), { width, height });
  return { canvas, g: canvas.getContext('2d') };
}

function finish(canvas, srgb = true) { // 캔버스 → 텍스처
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function roundRect(g, x, y, w, h, r) { // 모서리가 둥근 사각형 경로
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

const polar = (cx, cy, r, a) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];

// 면이 나뉜 별: 꼭짓점마다 왼쪽 반은 밝게, 오른쪽 반은 어둡게 칠해 입체로 보인다
function facetedStar(g, cx, cy, points, outer, inner, rotation, light, shade) {
  const step = Math.PI / points;
  for (let k = 0; k < points; k++) {
    const a = rotation + k * step * 2;
    const tip = polar(cx, cy, outer, a);
    const left = polar(cx, cy, inner, a - step);
    const right = polar(cx, cy, inner, a + step);
    for (const [side, color] of [[left, light], [right, shade]]) {
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(...side);
      g.lineTo(...tip);
      g.closePath();
      g.fillStyle = color;
      g.fill();
    }
  }
}

// ---------- 카드 뒷면 ----------
// 깊은 밤 남색 바탕에 금박 테두리 두 겹과 모서리 장식. 가운데에는 룬 고리 안에 사슬로 봉인된 마도서 문장,
// 표지에는 다섯 등급을 뜻하는 오각별, 위아래로 작은 별. (뽑으면 이 봉인이 풀리며 마도서가 나온다는 뜻)
export const CARD_ASPECT = 0.64; // 카드 가로 ÷ 세로

const GOLD = '#ecc983'; // 금박
const GOLD_HI = '#fff0c8'; // 밝은 금빛 (별의 밝은 면)
const GOLD_DEEP = '#b98a42'; // 짙은 금빛 (별의 그늘 면)

function rune(g, x, y, size, rand) { // 룬 글자 하나: 세로 줄기 + 곁가지 두세 개
  g.beginPath();
  g.moveTo(x, y - size / 2);
  g.lineTo(x, y + size / 2);
  const branches = 2 + Math.floor(rand() * 2);
  for (let k = 0; k < branches; k++) {
    const yy = y - size / 2 + rand() * size;
    const dir = rand() < 0.5 ? -1 : 1;
    if (rand() < 0.5) { g.moveTo(x, yy); g.lineTo(x + dir * size * 0.42, yy - size * 0.28); } // 빗금
    else { g.moveTo(x - size * 0.28, yy); g.lineTo(x + size * 0.28, yy); } // 가로대
  }
  g.stroke();
}

let card = null;
export function cardTexture() { // 카드 뒷면 그림 (한 번 만들어 다섯 장이 같이 씀)
  if (card) return card;
  const W = 512;
  const H = Math.round(W / CARD_ASPECT);
  const { canvas, g } = paper(W, H);
  const rand = random(11);
  const cx = W / 2;
  const cy = H / 2;

  // 바탕: 깊은 밤 남색, 가운데가 은은히 밝다
  roundRect(g, 6, 6, W - 12, H - 12, 34);
  const body = g.createLinearGradient(0, 0, W, H);
  body.addColorStop(0, '#262a5e');
  body.addColorStop(0.5, '#191c46');
  body.addColorStop(1, '#0f1131');
  g.fillStyle = body;
  g.fill();

  g.save();
  g.clip();
  const shine = g.createRadialGradient(cx, cy, 10, cx, cy, W * 0.75); // 문장 둘레가 밝게
  shine.addColorStop(0, 'rgba(150, 160, 230, 0.32)');
  shine.addColorStop(1, 'rgba(150, 160, 230, 0)');
  g.fillStyle = shine;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 110; i++) { // 별가루 (흰 별과 금빛 별)
    g.fillStyle = rand() < 0.3 ? `rgba(255, 224, 160, ${0.2 + rand() * 0.5})` : `rgba(255, 255, 255, ${0.1 + rand() * 0.4})`;
    g.beginPath();
    g.arc(rand() * W, rand() * H, 0.6 + rand() * 1.4, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();

  // 테두리: 바깥 금박 띠, 안쪽 가는 금선 두 겹
  g.strokeStyle = GOLD;
  g.lineWidth = 8;
  roundRect(g, 10, 10, W - 20, H - 20, 30);
  g.stroke();
  g.lineWidth = 2.2;
  roundRect(g, 34, 34, W - 68, H - 68, 14);
  g.stroke();
  g.globalAlpha = 0.5;
  g.lineWidth = 1.2;
  roundRect(g, 44, 44, W - 88, H - 88, 8);
  g.stroke();
  g.globalAlpha = 1;

  // 모서리 장식: 작은 마름모와 안쪽으로 감기는 덩굴
  g.strokeStyle = GOLD;
  g.fillStyle = GOLD_HI;
  g.lineWidth = 2;
  for (const [x, y, sx, sy] of [[34, 34, 1, 1], [W - 34, 34, -1, 1], [34, H - 34, 1, -1], [W - 34, H - 34, -1, -1]]) {
    g.save();
    g.translate(x, y);
    g.scale(sx, sy);
    g.beginPath(); // 마름모
    g.moveTo(0, -9); g.lineTo(9, 0); g.lineTo(0, 9); g.lineTo(-9, 0);
    g.closePath();
    g.fill();
    g.beginPath(); // 덩굴 두 줄기
    g.moveTo(14, 4); g.bezierCurveTo(34, 6, 44, 18, 30, 28); g.bezierCurveTo(22, 33, 18, 24, 24, 21);
    g.moveTo(4, 14); g.bezierCurveTo(6, 34, 18, 44, 28, 30);
    g.stroke();
    g.restore();
  }

  // 위아래 작은 오각별
  for (const y of [86, H - 86]) facetedStar(g, cx, y, 5, 20, 7, -Math.PI / 2, GOLD_HI, GOLD_DEEP);

  // 룬 고리: 두 겹 원 사이에 룬 글자가 둥글게 늘어선다
  g.strokeStyle = GOLD;
  g.lineWidth = 2.4;
  for (const r of [176, 146]) { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); }
  g.lineWidth = 2.2;
  for (let i = 0; i < 30; i++) {
    g.save();
    g.translate(cx, cy);
    g.rotate((i / 30) * Math.PI * 2);
    rune(g, 0, -161, 18, rand);
    g.restore();
  }
  g.strokeStyle = 'rgba(236, 201, 131, 0.22)'; // 문장 뒤 가는 빛살
  g.lineWidth = 1;
  for (let k = 0; k < 48; k++) {
    const a = (k / 48) * Math.PI * 2;
    g.beginPath();
    g.moveTo(...polar(cx, cy, 112, a));
    g.lineTo(...polar(cx, cy, 142, a));
    g.stroke();
  }

  // 마도서: 가죽 표지, 금박 테두리, 모서리 가시, 책등
  const bw = 150, bh = 196, bx = cx - bw / 2, by = cy - bh / 2;
  g.save();
  g.shadowColor = 'rgba(8, 6, 30, 0.7)';
  g.shadowBlur = 18;
  roundRect(g, bx, by, bw, bh, 10);
  const leather = g.createLinearGradient(bx, by, bx + bw, by + bh);
  leather.addColorStop(0, '#5a2472');
  leather.addColorStop(1, '#2b1142');
  g.fillStyle = leather;
  g.fill();
  g.restore();
  g.strokeStyle = GOLD;
  g.lineWidth = 4;
  roundRect(g, bx, by, bw, bh, 10);
  g.stroke();
  g.lineWidth = 1.5;
  roundRect(g, bx + 12, by + 12, bw - 24, bh - 24, 5);
  g.stroke();
  g.lineWidth = 3; // 책등 쪽 금박 줄
  g.beginPath(); g.moveTo(bx + 18, by + 4); g.lineTo(bx + 18, by + bh - 4); g.stroke();
  g.fillStyle = GOLD;
  for (const [x, y, sx, sy] of [[bx, by, -1, -1], [bx + bw, by, 1, -1], [bx, by + bh, -1, 1], [bx + bw, by + bh, 1, 1]]) { // 모서리 가시
    g.beginPath();
    g.moveTo(x - sx * 16, y);
    g.lineTo(x + sx * 12, y + sy * 12);
    g.lineTo(x, y - sy * 16);
    g.closePath();
    g.fill();
  }

  // 표지 문장: 빛나는 원 안의 오각별
  const ey = cy - 18;
  g.save();
  g.shadowColor = 'rgba(255, 226, 160, 0.9)';
  g.shadowBlur = 16;
  g.strokeStyle = GOLD_HI;
  g.lineWidth = 3;
  g.beginPath(); g.arc(cx + 6, ey, 38, 0, Math.PI * 2); g.stroke();
  facetedStar(g, cx + 6, ey, 5, 32, 11, -Math.PI / 2, GOLD_HI, GOLD);
  g.restore();

  // 봉인 사슬과 자물쇠: 책 허리를 가로지른다
  const chainY = cy + 54;
  g.strokeStyle = '#c9cde6';
  g.lineWidth = 3;
  for (let x = bx - 26; x < bx + bw + 26; x += 15) {
    g.beginPath();
    if (Math.round((x - bx) / 15) % 2) g.ellipse(x, chainY, 8, 4, 0, 0, Math.PI * 2); // 눕힌 고리
    else g.ellipse(x, chainY, 3, 5, 0, 0, Math.PI * 2); // 세운 고리
    g.stroke();
  }
  roundRect(g, cx - 13, chainY + 4, 26, 26, 5); // 자물쇠
  g.fillStyle = GOLD;
  g.fill();
  g.fillStyle = '#2b1142';
  g.beginPath(); g.arc(cx, chainY + 15, 3.5, 0, Math.PI * 2); g.fill();
  g.fillRect(cx - 1.5, chainY + 16, 3, 8);

  card = finish(canvas);
  return card;
}

// ---------- 카드 빛 테두리 ----------
// 카드보다 조금 큰 판에 그리는 번진 빛. 카드 뒤에 빛을 더하듯 깔면 가장자리에서 빛이 새어 나온다
export const GLOW_SCALE = [1.55, 1.36]; // 카드 대비 빛 판 크기 (가로, 세로)

let cardGlow = null;
export function cardGlowTexture() { // 카드 빛 테두리 그림
  if (cardGlow) return cardGlow;
  const W = 320;
  const H = Math.round((W / GLOW_SCALE[0]) / CARD_ASPECT * GLOW_SCALE[1]);
  const { canvas, g } = paper(W, H);
  const w = W / GLOW_SCALE[0];
  const h = H / GLOW_SCALE[1];
  g.filter = 'blur(18px)';
  g.fillStyle = 'rgba(255, 255, 255, 0.85)';
  roundRect(g, (W - w) / 2, (H - h) / 2, w, h, 16);
  g.fill();
  g.filter = 'blur(4px)';
  g.strokeStyle = 'rgba(255, 255, 255, 1)';
  g.lineWidth = 5;
  roundRect(g, (W - w) / 2, (H - h) / 2, w, h, 14);
  g.stroke();
  cardGlow = finish(canvas, false);
  return cardGlow;
}

// ---------- 뭉게구름 ----------
// 둥근 덩어리를 뒤(위)에서 앞(아래)으로 겹쳐 그리고, 덩어리마다 왼쪽 위가 밝게 칠해 뭉실뭉실한 윤곽을 만든다.
// 밑면은 평평하게 자르고 라벤더빛 그늘을 준다.
export function cloudTexture(seed, width = 1024, height = 512) { // 구름 한 덩이 그림
  const { canvas, g } = paper(width, height);
  const rand = random(seed);
  const base = height * 0.78; // 구름 밑면 높이
  const puffs = [];
  const count = 30;
  for (let i = 0; i < count; i++) {
    const u = 0.1 + rand() * 0.8; // 가로 위치 (0~1)
    const hump = Math.sin(u * Math.PI) ** 1.5; // 가운데가 높게
    const radius = height * (0.07 + rand() * 0.1) * (0.6 + hump);
    const y = base - radius * 0.35 - rand() * height * 0.42 * hump;
    puffs.push([u * width, y, radius]);
  }
  puffs.sort((a, b) => a[1] - b[1]); // 위에 있는 덩어리부터 (아래 덩어리가 앞을 덮는다)

  g.filter = 'blur(1.2px)';
  for (const [x, y, r] of puffs) {
    const fill = g.createRadialGradient(x - r * 0.32, y - r * 0.38, r * 0.08, x, y, r);
    fill.addColorStop(0, '#ffffff');
    fill.addColorStop(0.6, '#fbfbff');
    fill.addColorStop(0.86, '#e6e8fa');
    fill.addColorStop(1, '#d6daf3');
    g.fillStyle = fill;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  g.filter = 'none';

  g.globalCompositeOperation = 'source-atop'; // 밑으로 갈수록 라벤더 그늘
  const shade = g.createLinearGradient(0, base - height * 0.3, 0, base);
  shade.addColorStop(0, 'rgba(176, 182, 230, 0)');
  shade.addColorStop(1, 'rgba(176, 182, 230, 0.55)');
  g.fillStyle = shade;
  g.fillRect(0, 0, width, height);

  g.globalCompositeOperation = 'destination-in'; // 밑면을 평평하게, 부드럽게 자르기
  const cut = g.createLinearGradient(0, base - 24, 0, base + 6);
  cut.addColorStop(0, 'rgba(0, 0, 0, 1)');
  cut.addColorStop(1, 'rgba(0, 0, 0, 0)');
  g.fillStyle = cut;
  g.fillRect(0, 0, width, height);
  g.globalCompositeOperation = 'source-over';
  return finish(canvas);
}

// ---------- 바닥 룬 고리 ----------
// 큰 마법진의 바깥 고리: 동심원, 룬 띠, 눈금, 다섯 겹 별 다각형 (흰 선, 빛처럼 더해 그린다)
let runes = null;
export function runeRingTexture() { // 룬 고리 그림
  if (runes) return runes;
  const S = 1024;
  const c = S / 2;
  const { canvas, g } = paper(S, S);
  const rand = random(5);
  g.strokeStyle = '#ffffff';
  g.fillStyle = '#ffffff';
  g.lineCap = 'round';
  const ring = (r, width, alpha = 1) => {
    g.globalAlpha = alpha;
    g.lineWidth = width;
    g.beginPath();
    g.arc(c, c, r * c, 0, Math.PI * 2);
    g.stroke();
    g.globalAlpha = 1;
  };
  ring(0.985, 3.2);
  ring(0.958, 1.2, 0.8);
  ring(0.845, 2.2);
  ring(0.82, 1, 0.7);
  ring(0.62, 1.6);
  ring(0.6, 0.8, 0.6);
  ring(0.43, 2);

  // 룬 띠: 0.85~0.955 사이에 짧은 획 몇 개로 된 글자를 둥글게 늘어놓는다
  const glyphs = 56;
  g.lineWidth = 2.6;
  for (let i = 0; i < glyphs; i++) {
    g.save();
    g.translate(c, c);
    g.rotate((i / glyphs) * Math.PI * 2);
    g.translate(0, -0.902 * c);
    const strokes = 2 + Math.floor(rand() * 3);
    g.beginPath();
    for (let k = 0; k < strokes; k++) {
      const x1 = (rand() - 0.5) * 22;
      const y1 = (rand() - 0.5) * 30;
      g.moveTo(x1, y1);
      if (rand() > 0.6) g.arc(x1, y1, 4 + rand() * 6, 0, Math.PI * (0.5 + rand()));
      else g.lineTo((rand() - 0.5) * 22, (rand() - 0.5) * 30);
    }
    g.stroke();
    g.restore();
  }

  // 눈금: 0.6~0.62
  g.lineWidth = 1.4;
  for (let i = 0; i < 180; i++) {
    const a = (i / 180) * Math.PI * 2;
    const long = i % 6 === 0;
    g.beginPath();
    g.moveTo(...polar(c, c, 0.62 * c, a));
    g.lineTo(...polar(c, c, (long ? 0.655 : 0.635) * c, a));
    g.stroke();
  }

  // 다섯 겹 별 다각형 {10/3}: 0.82 고리에 닿는 꼭짓점 열 개를 세 칸씩 건너 잇는다
  g.lineWidth = 2;
  g.beginPath();
  for (let i = 0; i <= 10; i++) {
    const p = polar(c, c, 0.82 * c, -Math.PI / 2 + ((i * 3) % 10) * (Math.PI / 5));
    if (i === 0) g.moveTo(...p);
    else g.lineTo(...p);
  }
  g.stroke();

  // 꼭짓점 작은 고리 열 개
  g.lineWidth = 1.6;
  for (let i = 0; i < 10; i++) {
    g.beginPath();
    g.arc(...polar(c, c, 0.72 * c, -Math.PI / 2 + i * (Math.PI / 5)), 0.035 * c, 0, Math.PI * 2);
    g.stroke();
  }

  runes = finish(canvas, false);
  return runes;
}

// ---------- 네 갈래 별빛 ----------
// 가늘고 긴 빛살 두 줄(가로, 세로)과 짧은 대각선 빛살, 가운데 둥근 빛
let spark = null;
export function sparkTexture() { // 별빛 그림
  if (spark) return spark;
  const S = 256;
  const { canvas, g } = paper(S, S);
  const c = S / 2;
  const streak = (angle, thin, length, alpha) => {
    g.save();
    g.translate(c, c);
    g.rotate(angle);
    g.scale(thin, length);
    const fill = g.createRadialGradient(0, 0, 0, 0, 0, c);
    fill.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    fill.addColorStop(0.35, `rgba(255, 255, 255, ${alpha * 0.35})`);
    fill.addColorStop(1, 'rgba(255, 255, 255, 0)');
    g.fillStyle = fill;
    g.beginPath();
    g.arc(0, 0, c, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
  streak(0, 0.06, 1, 1);
  streak(Math.PI / 2, 0.06, 1, 1);
  streak(Math.PI / 4, 0.04, 0.42, 0.7);
  streak(-Math.PI / 4, 0.04, 0.42, 0.7);
  const core = g.createRadialGradient(c, c, 0, c, c, c * 0.3);
  core.addColorStop(0, 'rgba(255, 255, 255, 1)');
  core.addColorStop(1, 'rgba(255, 255, 255, 0)');
  g.fillStyle = core;
  g.fillRect(0, 0, S, S);
  spark = finish(canvas, false);
  return spark;
}
