// 무대: 렌더러, 장면, 카메라, 조명, 마우스.
// 카메라는 들어올 때 위에서 내려오며 다가오고, 마우스를 따라 아주 조금 움직인다 (시차).
import * as THREE from 'three';

const LOOK = new THREE.Vector3(0, 2.75, 0); // 카메라가 바라보는 곳
const BASE_FOV = 36; // 넓은 화면의 시야각

export function create(canvas) { // 무대 만들기
  const renderer = new THREE.WebGLRenderer({ canvas, powerPreference: 'high-performance' }); // 렌더러 (계단 현상 줄이기는 bloom.js가 맡음)
  renderer.toneMapping = THREE.NoToneMapping; // 밝기 압축 없이: 흰 구름은 흰색 그대로, 1보다 밝은 빛만 번진다

  const scene = new THREE.Scene(); // 장면
  scene.fog = new THREE.Fog(0xd4e5fb, 20, 150); // 멀수록 지평선 하늘색에 묻히는 안개 (먼 섬과 성이 아련하게)
  // 조명은 흰 대리석의 가장 밝은 면이 1을 넘지 않을 만큼만 (넘으면 빛 번짐이 건물까지 번진다)
  scene.add(new THREE.HemisphereLight(0xdbe7ff, 0xd2d0f3, 2.1)); // 위는 하늘빛, 아래는 라벤더빛 (그늘이 회색이 아니라 보랏빛이 되게)
  const sun = new THREE.DirectionalLight(0xfff5ea, 1.7); // 햇빛 (왼쪽 위 앞에서)
  sun.position.set(-9, 16, 12);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.1, 600); // 카메라
  const home = new THREE.Vector3(0, 1.75, 13.5); // 카메라 기본 자리
  const world = { renderer, scene, camera, update, spread: 1, pointer: new THREE.Vector2(), pointerOver: false };

  // 넓은 화면은 참고 구도 그대로, 세로로 긴 화면은 카드를 모으고(spread) 시야를 넓혀 카드 다섯 장이 다 들어오게
  function resize() { // 화면 크기 맞추기
    const aspect = innerWidth / innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); // 선명도 상한 (다른 부품은 renderer.getPixelRatio()로 읽음)
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = aspect;
    world.spread = THREE.MathUtils.clamp(aspect / 1.55, 0.5, 1); // 카드 사이 간격 (1 = 참고 구도)
    camera.fov = aspect < 1 ? 46 : BASE_FOV;
    const halfWidth = 1.15 + 3.85 * world.spread; // 바깥 카드 끝까지의 거리
    const fit = halfWidth / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect); // 카드가 다 들어오는 거리
    home.z = Math.max(13.5, fit + 1.2);
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  // 마우스: 장면 위에 있을 때만 카드에 반응한다 (버튼 위에서는 반응하지 않음)
  const target = new THREE.Vector2(); // 마우스가 가리키는 곳 (-1 ~ 1)
  addEventListener('pointermove', (event) => {
    target.set((event.clientX / innerWidth) * 2 - 1, -(event.clientY / innerHeight) * 2 + 1);
    world.pointer.copy(target);
    world.pointerOver = event.target === canvas;
  });
  document.documentElement.addEventListener('pointerleave', () => {
    target.set(0, 0);
    world.pointerOver = false;
  });

  const lean = new THREE.Vector2(); // 마우스를 부드럽게 따라가는 값
  function update(s, t) { // 카메라 움직임
    const intro = s.still ? 0 : (1 - THREE.MathUtils.clamp((t - 0.15) / 3, 0, 1)) ** 3; // 들어올 때 3초 동안 위에서 내려오며 다가온다
    lean.lerp(target, s.still ? 0 : 0.04);
    const sway = s.still ? 0 : Math.sin(t * 0.13) * 0.22; // 아주 느린 좌우 흔들림
    const shake = s.flash * 0.04; // 번쩍일 때 살짝 떨림
    camera.position.set(
      home.x + sway + lean.x * 0.7 + (Math.random() - 0.5) * shake,
      home.y + lean.y * 0.3 + intro * 2.6 + (Math.random() - 0.5) * shake,
      home.z + intro * 5 - s.charge * 0.9, // 기를 모을 때 조금 다가간다
    );
    camera.lookAt(LOOK.x + lean.x * 0.25, LOOK.y + intro * 1.6, LOOK.z);
  }

  return world;
}
