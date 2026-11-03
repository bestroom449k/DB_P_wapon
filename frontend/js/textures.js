import * as THREE from 'three';

// 이미지 파일 없이 캔버스에 직접 그리는 절차적 텍스처들.

function seeded(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

function toTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// 공방 바닥의 마법진: 다섯 등급을 뜻하는 오각별 {5/2}, 십각별 {10/3}과 룬 띠
export function magicCircleTexture(size = 1024) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const k = size / 1024;
  const R = size * 0.485;
  const rand = seeded(9);

  g.translate(size / 2, size / 2);
  g.strokeStyle = '#fff';
  g.fillStyle = '#fff';
  g.lineCap = 'round';
  g.lineJoin = 'round';

  const ring = (r, w, a = 1) => {
    g.globalAlpha = a;
    g.lineWidth = w * k;
    g.beginPath();
    g.arc(0, 0, r, 0, Math.PI * 2);
    g.stroke();
  };

  const star = (points, step, r, w, a) => {
    g.globalAlpha = a;
    g.lineWidth = w * k;
    g.beginPath();
    for (let i = 0; i <= points; i++) {
      const ang = ((i * step) / points) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r;
      i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.stroke();
  };

  ring(R, 5);
  ring(R * 0.962, 1.6, 0.75);
  ring(R * 0.80, 3.2);
  ring(R * 0.775, 1.2, 0.6);
  ring(R * 0.43, 2.6);
  ring(R * 0.40, 1, 0.5);
  ring(R * 0.17, 2.2, 0.9);

  // 바깥 눈금
  for (let i = 0; i < 100; i++) {
    const ang = (i / 100) * Math.PI * 2;
    const long = i % 20 === 0;
    g.globalAlpha = long ? 1 : 0.55;
    g.lineWidth = (long ? 3 : 1.4) * k;
    g.beginPath();
    g.moveTo(Math.cos(ang) * R * 0.962, Math.sin(ang) * R * 0.962);
    g.lineTo(Math.cos(ang) * R * (long ? 0.995 : 0.985), Math.sin(ang) * R * (long ? 0.995 : 0.985));
    g.stroke();
  }

  // 룬 띠: 획 몇 개로 이루어진 가상의 문자
  const glyphs = 60;
  for (let i = 0; i < glyphs; i++) {
    g.save();
    g.rotate((i / glyphs) * Math.PI * 2);
    g.translate(0, -R * 0.881);
    g.globalAlpha = 0.9;
    g.lineWidth = 2.2 * k;
    const w = 9 * k;
    const h = 15 * k;
    const strokes = 2 + Math.floor(rand() * 3);
    for (let s = 0; s < strokes; s++) {
      const kind = Math.floor(rand() * 5);
      g.beginPath();
      if (kind === 0) {
        const x = (rand() * 2 - 1) * w;
        g.moveTo(x, -h);
        g.lineTo(x, h);
      } else if (kind === 1) {
        g.moveTo(-w, (rand() * 2 - 1) * h);
        g.lineTo(w, (rand() * 2 - 1) * h);
      } else if (kind === 2) {
        g.arc((rand() * 2 - 1) * w * 0.4, (rand() * 2 - 1) * h * 0.4, w * 0.7, rand() * Math.PI, Math.PI * (1 + rand()));
      } else if (kind === 3) {
        g.moveTo(-w, -h);
        g.lineTo(0, (rand() * 2 - 1) * h * 0.5);
        g.lineTo(w, -h);
      } else {
        g.arc((rand() * 2 - 1) * w * 0.6, (rand() * 2 - 1) * h * 0.6, 2.2 * k, 0, Math.PI * 2);
        g.fill();
        continue;
      }
      g.stroke();
    }
    g.restore();
  }

  star(5, 2, R * 0.775, 2.6, 0.95);
  star(10, 3, R * 0.775, 1.3, 0.55);

  // 꼭짓점마다 작은 원 (등급 5개)
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(ang) * R * 0.775;
    const y = Math.sin(ang) * R * 0.775;
    g.globalAlpha = 1;
    g.lineWidth = 2.4 * k;
    g.beginPath();
    g.arc(x, y, 22 * k, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(x, y, 6 * k, 0, Math.PI * 2);
    g.fill();
  }

  // 안쪽 바큇살
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2;
    g.globalAlpha = i % 2 ? 0.45 : 0.9;
    g.lineWidth = (i % 2 ? 1 : 2) * k;
    g.beginPath();
    g.moveTo(Math.cos(ang) * R * 0.17, Math.sin(ang) * R * 0.17);
    g.lineTo(Math.cos(ang) * R * 0.40, Math.sin(ang) * R * 0.40);
    g.stroke();
  }

  return toTexture(c);
}

// 부드러운 원형 빛 (검 뒤의 후광, 빛 기둥 바닥)
export function glowTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.14)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return toTexture(c);
}
