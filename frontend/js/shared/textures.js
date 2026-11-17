// 그림 파일 없이 만드는 텍스처 두 가지.
import * as THREE from 'three';

// 바닥 마법진 그림: 다섯 등급을 뜻하는 오각별과 룬 띠 (흰 선, 1024px)
const MAGIC_CIRCLE_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='1024' height='1024' viewBox='-100 -100 200 200' fill='none' stroke='white'>
  <circle r='97' stroke-width='2'/><circle r='93' stroke-width='.7'/>
  <circle r='95' stroke-width='4' stroke-dasharray='.6 5.37'/>
  <circle r='85' stroke-width='6' stroke-dasharray='2 4 5 3 1 5 3 4' opacity='.85'/>
  <circle r='78' stroke-width='1.6'/><circle r='75' stroke-width='.6'/>
  <path d='M0 -75L44.08 60.68L-71.33 -23.18L71.33 -23.18L-44.08 60.68Z' stroke-width='1.6' stroke-linejoin='round'/>
  <path d='M0 42L39.94 12.98L24.69 -33.98L-24.69 -33.98L-39.94 12.98Z' stroke-width='.8'/>
  <circle r='42' stroke-width='1.2'/><circle r='30' stroke-width='24' stroke-dasharray='.8 18.05' opacity='.7'/><circle r='17' stroke-width='1.2'/>
  <g stroke-width='1.4'><circle cy='-75' r='7'/><circle cx='71.33' cy='-23.18' r='7'/><circle cx='44.08' cy='60.68' r='7'/><circle cx='-44.08' cy='60.68' r='7'/><circle cx='-71.33' cy='-23.18' r='7'/></g>
</svg>`;

export function circleTexture() { // 마법진 그림
  const texture = new THREE.TextureLoader().load(`data:image/svg+xml,${encodeURIComponent(MAGIC_CIRCLE_SVG)}`);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// 가운데가 밝고 가장자리로 갈수록 투명해지는 둥근 빛 (후광, 바닥 빛)
let glow = null; // 한 번 만든 그림을 여러 부품이 같이 씀
export function glowTexture() { // 둥근 빛 그림
  if (glow) return glow;
  const canvas = Object.assign(document.createElement('canvas'), { width: 256, height: 256 });
  const g = canvas.getContext('2d');
  const gradient = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  for (const [at, alpha] of [[0, 1], [0.18, 0.55], [0.45, 0.14], [1, 0]]) {
    gradient.addColorStop(at, `rgba(255, 255, 255, ${alpha})`);
  }
  g.fillStyle = gradient;
  g.fillRect(0, 0, 256, 256);
  glow = new THREE.CanvasTexture(canvas);
  return glow;
}
