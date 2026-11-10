// 무대: 렌더러, 장면, 카메라, 조명.
// 카메라는 시작할 때 멀리서 다가오고, 천천히 흔들린다.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const NARROW = matchMedia('(max-width: 860px), (max-aspect-ratio: 6/5)'); // 좁은 화면 (css/title.css와 같은 기준)

export function create(canvas) { // 무대 만들기
  const renderer = new THREE.WebGLRenderer({ canvas, powerPreference: 'high-performance' }); // 렌더러 (계단 현상 줄이기는 bloom.js가 맡음)
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // 밝기 압축 (영화 같은 색감)

  const scene = new THREE.Scene(); // 장면
  scene.fog = new THREE.FogExp2(0x0d1222, 0.011); // 안개 (옅게 해서 장면이 뿌옇지 않게)
  const pmrem = new THREE.PMREMGenerator(renderer); // 반사광 만드는 도구
  const room = new RoomEnvironment(renderer); // 금속에 비칠 방 풍경
  scene.environment = pmrem.fromScene(room, 0.04).texture; // 금속 반사광
  pmrem.dispose(); // 다 쓴 도구 정리
  room.dispose();
  scene.add(new THREE.HemisphereLight(0x5068a8, 0x10121e, 0.8)); // 하늘빛 조명
  scene.add(new THREE.DirectionalLight(0xc8d2ff, 2.4).translateX(5).translateY(6).translateZ(4)); // 달빛 조명

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 400); // 카메라
  let distance = 11.5; // 카메라 거리

  // 넓은 화면에서는 검을 오른쪽(약 66%)에 두고, 좁은 화면에서는 가운데에 두고 멀리서 본다
  function resize() { // 화면 크기 맞추기
    const aspect = innerWidth / innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); // 선명도 상한 (다른 부품은 renderer.getPixelRatio()로 읽음)
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = aspect;
    if (NARROW.matches) camera.clearViewOffset();
    else camera.setViewOffset(innerWidth, innerHeight, -innerWidth * 0.16, 0, innerWidth, innerHeight);
    distance = Math.max(11.5, 3 / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect)); // 고리가 화면에 다 들어오는 거리
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  function update(s, t) { // 카메라 움직임
    const intro = THREE.MathUtils.clamp(1 - (t - s.intro) / 3.8, 0, 1) ** 3; // 로딩이 걷히면 3.8초 동안 멀리서 다가온다
    const shake = s.pulse * 0.05; // 내려칠 때 흔들림
    camera.position.set(
      Math.sin(t * 0.07) * 0.6 + (Math.random() - 0.5) * shake, // 좌우
      Math.sin(t * 0.11) * 0.15 + intro * 3.4 + (Math.random() - 0.5) * shake, // 위아래
      distance + intro * 10 - s.push * 4.5, // 앞뒤 ("게임 시작" 줌 포함)
    );
    camera.lookAt(0, 0.15 + intro * 1.2, 0); // 검 쪽 바라보기
  }

  return { renderer, scene, camera, update };
}
