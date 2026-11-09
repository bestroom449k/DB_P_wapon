// 무대: 렌더러, 장면, 카메라, 조명.
// 카메라는 시작할 때 멀리서 다가오고, 천천히 흔들리며, 마우스를 따라 살짝 움직인다.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function create(canvas) { // 무대 만들기
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); // 렌더러
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // 밝기 압축 (영화 같은 색감)

  const scene = new THREE.Scene(); // 장면
  scene.fog = new THREE.FogExp2(0x120f2a, 0.018); // 안개
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(renderer), 0.04).texture; // 금속 반사광
  scene.add(new THREE.HemisphereLight(0x5560b0, 0x1a0f22, 0.8)); // 하늘빛 조명
  scene.add(new THREE.DirectionalLight(0xc8d2ff, 2.4).translateX(5).translateY(6).translateZ(4)); // 달빛 조명

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 400); // 카메라
  const mouse = new THREE.Vector2(); // 마우스 위치
  let distance = 11.5; // 카메라 거리
  addEventListener('pointermove', (e) => mouse.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5)); // 마우스 따라가기

  // 넓은 화면에서는 검을 오른쪽(약 66%)에 두고, 좁은 화면에서는 가운데에 두고 멀리서 본다
  function resize() { // 화면 크기 맞추기
    const aspect = innerWidth / innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = aspect;
    if (aspect > 1.2) camera.setViewOffset(innerWidth, innerHeight, -innerWidth * 0.16, 0, innerWidth, innerHeight);
    else camera.clearViewOffset();
    distance = Math.max(11.5, 3 / (Math.tan(THREE.MathUtils.degToRad(16)) * aspect));
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  function update(s, t) { // 카메라 움직임
    const intro = Math.min(1, Math.max(0, 1 - (t - 2.4) / 3.8)) ** 3; // 로딩이 걷히면(2.4초) 멀리서 다가온다
    const shake = s.pulse * 0.05; // 내려칠 때 흔들림
    camera.position.set(
      Math.sin(t * 0.07) * 0.6 + mouse.x * 1.1 + (Math.random() - 0.5) * shake, // 좌우
      Math.sin(t * 0.11) * 0.15 - mouse.y * 0.6 + intro * 3.4 + (Math.random() - 0.5) * shake, // 위아래
      distance + intro * 10 - s.push * 4.5, // 앞뒤 ("게임 시작" 줌 포함)
    );
    camera.lookAt(0, 0.15 + intro * 1.2, 0); // 검 쪽 바라보기
  }

  return { renderer, scene, camera, update };
}
