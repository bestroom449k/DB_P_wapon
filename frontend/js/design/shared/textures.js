// 그림 파일 없이 만드는 텍스처 두 가지.
import * as THREE from 'three';

// 바닥 마법진: css/timeline.css의 --i-circle 그림을 흰 선으로 바꿔 쓴다
export function circleTexture() { // 마법진 그림
  const svg = getComputedStyle(document.documentElement)
    .getPropertyValue('--i-circle')
    .trim()
    .slice(5, -2) // url("...") 에서 따옴표 안쪽만
    .replace("stroke='black'", "stroke='white'")
    .replace('<svg ', "<svg width='1024' height='1024' ");
  const texture = new THREE.TextureLoader().load(svg);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 가운데가 밝고 가장자리로 갈수록 투명해지는 둥근 빛 (후광, 바닥 빛)
export function glowTexture() { // 둥근 빛 그림
  const canvas = Object.assign(document.createElement('canvas'), { width: 256, height: 256 });
  const g = canvas.getContext('2d');
  const gradient = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  for (const [at, alpha] of [[0, 1], [0.18, 0.55], [0.45, 0.14], [1, 0]]) {
    gradient.addColorStop(at, `rgba(255, 255, 255, ${alpha})`);
  }
  g.fillStyle = gradient;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}
