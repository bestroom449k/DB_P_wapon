// 마도서가 쓰는 그림들: 그림 파일 없이 캔버스에 직접 그린다.
// 룬 글자는 항상 같은 순서로 나오는 난수로 그려서, 새로고침해도 모양이 같다.
import * as THREE from 'three';

const TAU = Math.PI * 2;

export function mulberry32(a) { // 항상 같은 순서로 나오는 난수
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w, h) { // 그림판과 붓
  const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
  return [c, c.getContext('2d')];
}

function colorTexture(c) { // 색 그림 → 텍스처
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function glyph(g, x, y, s, r) { // 룬 글자 하나: 세로 줄기 + 곁가지 2~3개
  g.beginPath();
  const top = y - s / 2;
  const stem = x + (r() - 0.5) * s * 0.3;
  g.moveTo(stem, top);
  g.lineTo(stem, y + s / 2);
  const n = 2 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const kind = Math.floor(r() * 4);
    const yy = top + r() * s;
    const dir = r() < 0.5 ? -1 : 1;
    if (kind === 0) { g.moveTo(stem, yy); g.lineTo(stem + dir * s * 0.45, yy - s * 0.3); } // 빗금
    else if (kind === 1) { g.moveTo(stem, yy); g.quadraticCurveTo(stem + dir * s * 0.55, yy, stem, yy + s * 0.35); } // 고리
    else if (kind === 2) { g.moveTo(stem - s * 0.3, yy); g.lineTo(stem + s * 0.3, yy); } // 가로대
    else { const cx = stem + dir * s * 0.4, rad = s * 0.06; g.moveTo(cx + rad, yy); g.arc(cx, yy, rad, 0, TAU); } // 점
  }
  g.stroke();
}

export function runeCircleTexture() { // 표지 마법진 (흰 선, 투명 바탕)
  const S = 1024;
  const [c, g] = makeCanvas(S, S);
  const r = mulberry32(7);
  g.translate(S / 2, S / 2);
  g.strokeStyle = '#fff';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const ring = (rad, w) => { g.lineWidth = w; g.beginPath(); g.arc(0, 0, rad, 0, TAU); g.stroke(); };
  ring(490, 10); ring(462, 4); ring(330, 6); ring(300, 3); ring(120, 5);
  g.lineWidth = 5; // 바깥 눈금
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * TAU, len = i % 6 === 0 ? 26 : 12;
    g.beginPath();
    g.moveTo(Math.cos(a) * 462, Math.sin(a) * 462);
    g.lineTo(Math.cos(a) * (462 - len), Math.sin(a) * (462 - len));
    g.stroke();
  }
  g.lineWidth = 7; // 룬 띠
  for (let i = 0; i < 28; i++) {
    g.save(); g.rotate((i / 28) * TAU); g.translate(0, -396); glyph(g, 0, 0, 62, r); g.restore();
  }
  g.lineWidth = 6; // 육망성
  for (const off of [0, Math.PI / 3]) {
    g.beginPath();
    for (let i = 0; i < 3; i++) { const a = off + i * (TAU / 3) - Math.PI / 2; g.lineTo(Math.cos(a) * 300, Math.sin(a) * 300); }
    g.closePath();
    g.stroke();
  }
  g.lineWidth = 4; // 꼭짓점 작은 원
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 - Math.PI / 2;
    g.beginPath(); g.arc(Math.cos(a) * 300, Math.sin(a) * 300, 22, 0, TAU); g.stroke();
  }
  return colorTexture(c);
}

function drawPageInk(g, W, H, glow) { // 첫 장의 마법진과 주문 (같은 씨앗이라 잉크판과 빛판이 딱 겹친다)
  const r = mulberry32(21);
  g.strokeStyle = glow ? '#fff' : 'rgba(58, 34, 22, 0.88)';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  if (!glow) { g.lineWidth = 3; g.strokeRect(40, 40, W - 80, H - 80); g.lineWidth = 1.5; g.strokeRect(52, 52, W - 104, H - 104); } // 테두리
  const cx = W / 2, cy = H * 0.34, R = W * 0.3;
  g.lineWidth = glow ? 5 : 3;
  for (const rad of [R, R * 0.86, R * 0.42]) { g.beginPath(); g.arc(cx, cy, rad, 0, TAU); g.stroke(); }
  g.beginPath(); // 오각별
  for (let i = 0; i <= 5; i++) { const a = -Math.PI / 2 + i * ((4 * Math.PI) / 5); g.lineTo(cx + Math.cos(a) * R * 0.86, cy + Math.sin(a) * R * 0.86); }
  g.stroke();
  g.lineWidth = glow ? 4 : 2.4; // 마법진 둘레 룬
  for (let i = 0; i < 20; i++) {
    g.save(); g.translate(cx, cy); g.rotate((i / 20) * TAU); g.translate(0, -R * 0.93); glyph(g, 0, 0, R * 0.1, r); g.restore();
  }
  g.lineWidth = glow ? 4.5 : 3; // 장 제목
  for (let i = 0; i < 5; i++) glyph(g, cx + (i - 2) * 40, H * 0.585, 34, r);
  g.lineWidth = glow ? 3.2 : 2; // 본문
  for (let line = 0; line < 9; line++) {
    const y = H * 0.65 + line * 32;
    let x = 86 + (line === 0 ? 30 : 0);
    while (x < W - 106) {
      const word = 2 + Math.floor(r() * 5);
      for (let k = 0; k < word && x < W - 100; k++) { glyph(g, x, y, 20, r); x += 17; }
      x += 22;
    }
  }
}

export function pageTextures() { // 첫 장: 바랜 양피지 그림 + 빛나는 주문 그림
  const W = 768, H = 1024;
  const [c, g] = makeCanvas(W, H);
  const paper = g.createRadialGradient(W / 2, H * 0.45, 60, W / 2, H / 2, H * 0.72);
  paper.addColorStop(0, '#f3e8cb');
  paper.addColorStop(0.7, '#dcc79c');
  paper.addColorStop(1, '#a98a5c');
  g.fillStyle = paper;
  g.fillRect(0, 0, W, H);
  const r = mulberry32(5);
  for (let i = 0; i < 14; i++) { // 얼룩
    const x = r() * W, y = r() * H, rad = 30 + r() * 110;
    const stain = g.createRadialGradient(x, y, 0, x, y, rad);
    stain.addColorStop(0, 'rgba(120, 84, 40, 0.1)');
    stain.addColorStop(1, 'rgba(120, 84, 40, 0)');
    g.fillStyle = stain;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  drawPageInk(g, W, H, false);
  const [gc, gg] = makeCanvas(W, H);
  gg.fillStyle = '#000';
  gg.fillRect(0, 0, W, H);
  drawPageInk(gg, W, H, true);
  return { page: colorTexture(c), glow: colorTexture(gc) };
}

export function pageEdgeTexture(sideways) { // 책장 단면의 종이 결 (sideways: 위아래 면용으로 눕힘)
  const [c, g] = makeCanvas(256, 64);
  g.fillStyle = '#e7d8b4';
  g.fillRect(0, 0, 256, 64);
  const r = mulberry32(3);
  for (let x = 0; x < 256; x += 3) { g.fillStyle = `rgba(110, 80, 45, ${0.12 + r() * 0.22})`; g.fillRect(x, 0, 1, 64); }
  const t = colorTexture(c);
  if (sideways) { t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; }
  return t;
}

export function leatherGrain() { // 가죽 결 (요철 + 거칠기), 이어 붙여도 이음매가 안 보이게
  const S = 512;
  const [c, g] = makeCanvas(S, S);
  const r = mulberry32(11);
  g.fillStyle = '#808080';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 2400; i++) {
    const x = r() * S, y = r() * S, rad = 1.2 + r() * 3.6, v = r() < 0.55 ? 40 : 210;
    g.fillStyle = `rgba(${v}, ${v}, ${v}, ${0.06 + r() * 0.1})`;
    for (const px of [x, x - S, x + S]) for (const py of [y, y - S, y + S]) { // 가장자리에 걸친 점은 반대편에도
      if (px < -rad || px > S + rad || py < -rad || py > S + rad) continue;
      g.beginPath(); g.arc(px, py, rad, 0, TAU); g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function glyphTextures() { // 펼친 책에서 떠오르는 글자 조각 6종
  const r = mulberry32(99);
  return Array.from({ length: 6 }, () => {
    const [c, g] = makeCanvas(128, 128);
    g.strokeStyle = '#fff';
    g.lineWidth = 7;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.shadowColor = '#fff';
    g.shadowBlur = 14;
    glyph(g, 64, 64, 70, r);
    return colorTexture(c);
  });
}

export function veinTexture() { // 보석에서 표지 가장자리로 뻗는 빛 균열 (표지 비율 600×800, 보석은 위로 0.12 올라간 자리)
  const [c, g] = makeCanvas(600, 800);
  const r = mulberry32(41);
  g.strokeStyle = '#fff';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.shadowColor = '#fff';
  g.shadowBlur = 10;
  function crack(x, y, a, len, w, depth) { // 구불구불 뻗다가 가끔 갈라지는 금
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(x, y);
    for (let i = 0; i < 8; i++) {
      a += (r() - 0.5) * 0.7;
      x += (Math.cos(a) * len) / 8;
      y += (Math.sin(a) * len) / 8;
      g.lineTo(x, y);
      if (depth > 0 && r() < 0.22) { // 갈라지는 가지
        g.stroke();
        crack(x, y, a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.5), len * 0.5, w * 0.6, depth - 1);
        g.lineWidth = w;
        g.beginPath();
        g.moveTo(x, y);
      }
    }
    g.stroke();
  }
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + r() * 0.4;
    crack(300 + Math.cos(a) * 80, 352 + Math.sin(a) * 80, a, 260 + r() * 120, 5, 2);
  }
  return colorTexture(c);
}

export const WING_ROOT = [40 / 512, 60 / 512]; // 날개 그림에서 날개 뿌리 자리 (왼쪽 아래에서 잰 비율)

export function wingTexture() { // 빛의 날개 한쪽: 뿌리에서 부채꼴로 펼쳐진 깃털
  const S = 512;
  const [c, g] = makeCanvas(S, S);
  g.translate(WING_ROOT[0] * S, S - WING_ROOT[1] * S);
  const feather = (a, len, wid, alpha) => { // 깃털 하나
    g.save();
    g.rotate(a);
    const grad = g.createLinearGradient(0, 0, len, 0);
    grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
    grad.addColorStop(0.7, `rgba(255, 255, 255, ${alpha * 0.55})`);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(len * 0.5, -wid, len, 0);
    g.quadraticCurveTo(len * 0.5, wid * 0.4, 0, 0);
    g.fill();
    g.strokeStyle = `rgba(255, 255, 255, ${alpha})`; // 깃대
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(len * 0.9, 0);
    g.stroke();
    g.restore();
  };
  for (let i = 0; i < 10; i++) feather(-0.08 - i * 0.135, 450 - Math.abs(i - 2) * 22, 34, 0.5); // 긴 깃털
  for (let i = 0; i < 8; i++) feather(-0.2 - i * 0.16, 250 - i * 8, 30, 0.65); // 덮깃
  for (let i = 0; i < 6; i++) feather(-0.35 - i * 0.2, 130, 26, 0.8); // 작은 깃
  return colorTexture(c);
}
