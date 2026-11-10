// 그림 파일 없이 캔버스에 직접 그리는 텍스처들: 카드 뒷면, 카드 빛 테두리, 뭉게구름, 바닥 룬 고리, 네 갈래 별빛
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
// 페리윙클 바탕, 은색 테두리 두 겹, 모서리 장식, 가운데에는 다섯 갈래 나침반 별 (다섯 빛 공방의 오각별)
export const CARD_ASPECT = 0.64; // 카드 가로 ÷ 세로

let card = null;
export function cardTexture() { // 카드 뒷면 그림 (한 번 만들어 다섯 장이 같이 씀)
  if (card) return card;
  const W = 512;
  const H = Math.round(W / CARD_ASPECT);
  const { canvas, g } = paper(W, H);
  const rand = random(11);

  // 바탕
  roundRect(g, 6, 6, W - 12, H - 12, 34);
  const body = g.createLinearGradient(0, 0, W, H);
  body.addColorStop(0, '#a9b0f7');
  body.addColorStop(0.5, '#8a91ea');
  body.addColorStop(1, '#6b6cd2');
  g.fillStyle = body;
  g.fill();

  g.save();
  g.clip();
  const shine = g.createRadialGradient(W / 2, H * 0.46, 10, W / 2, H * 0.46, W * 0.8); // 가운데가 밝게
  shine.addColorStop(0, 'rgba(232, 234, 255, 0.6)');
  shine.addColorStop(1, 'rgba(232, 234, 255, 0)');
  g.fillStyle = shine;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 90; i++) { // 별가루
    g.fillStyle = `rgba(255, 255, 255, ${0.12 + rand() * 0.4})`;
    g.beginPath();
    g.arc(rand() * W, rand() * H, 0.7 + rand() * 1.5, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();

  // 테두리: 바깥 은색 띠, 안쪽 가는 선 두 겹
  g.strokeStyle = '#f1f2ff';
  g.lineWidth = 8;
  roundRect(g, 10, 10, W - 20, H - 20, 30);
  g.stroke();
  g.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  g.lineWidth = 2.2;
  roundRect(g, 34, 34, W - 68, H - 68, 14);
  g.stroke();
  g.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  g.lineWidth = 1.2;
  roundRect(g, 44, 44, W - 88, H - 88, 8);
  g.stroke();

  // 모서리 장식: 작은 마름모와 안쪽으로 감기는 덩굴
  g.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  g.fillStyle = '#ffffff';
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
  for (const [x, y] of [[W / 2, 34], [W / 2, H - 34]]) { // 위아래 가운데 작은 마름모
    g.beginPath();
    g.moveTo(x, y - 7); g.lineTo(x + 7, y); g.lineTo(x, y + 7); g.lineTo(x - 7, y);
    g.closePath();
    g.fill();
  }

  // 가운데 문양: 고리, 빛살, 나침반 별
  const cx = W / 2;
  const cy = H / 2;
  g.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  g.lineWidth = 1;
  for (let k = 0; k < 40; k++) { // 가는 빛살
    const a = (k / 40) * Math.PI * 2;
    g.beginPath();
    g.moveTo(...polar(cx, cy, 58, a));
    g.lineTo(...polar(cx, cy, 134, a));
    g.stroke();
  }
  g.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  g.lineWidth = 2.4;
  g.beginPath(); g.arc(cx, cy, 148, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 1.2;
  g.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  g.beginPath(); g.arc(cx, cy, 136, 0, Math.PI * 2); g.stroke();
  g.fillStyle = 'rgba(255, 255, 255, 0.85)';
  for (let k = 0; k < 60; k++) { // 점 고리
    g.beginPath();
    g.arc(...polar(cx, cy, 160, (k / 60) * Math.PI * 2), 1.6, 0, Math.PI * 2);
    g.fill();
  }

  g.save();
  g.shadowColor = 'rgba(255, 255, 255, 0.85)';
  g.shadowBlur = 22;
  facetedStar(g, cx, cy, 5, 104, 26, -Math.PI / 2 + Math.PI / 5, '#e9ebff', '#bfc4f6'); // 짧은 별 (뒤)
  facetedStar(g, cx, cy, 5, 206, 34, -Math.PI / 2, '#ffffff', '#d3d6fb'); // 긴 별 (앞, 고리 밖으로 뻗는다)
  g.restore();
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc(cx, cy, 9, 0, Math.PI * 2); g.fill();

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
