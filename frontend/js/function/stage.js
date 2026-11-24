// 무대: 렌더러, 장면, 카메라, 조명.
// 카메라는 시작할 때 멀리서 다가오고, 천천히 흔들린다.
// 공방 입장(게임 시작) 때는 펼친 책을 화면 가운데로 데려오며 다가가다가, 시야를 넓히며 책장 속으로 빨려 들어간다.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BOOK_Y } from '../design/objects/grimoire.js';

const NARROW = matchMedia('(max-width: 860px), (max-aspect-ratio: 6/5)'); // 좁은 화면 (css/title.css와 같은 기준)
const FOV = 32; // 평소 시야각
const PAGE = new THREE.Vector3(0, BOOK_Y + 0.3, 0); // 펼친 책장 가운데 (책이 뒤로 젖혀져 조금 위)
const PAGE_EYE = new THREE.Vector3(0, BOOK_Y + 0.42, 0.42); // 책장에 거의 닿은 카메라 자리 (책장 바로 앞, 살짝 위)

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

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400); // 카메라
  let distance = 11.5; // 카메라 거리
  let shiftX = 0; // 책을 오른쪽에 두려고 화면을 미는 양 (좁은 화면은 0)
  let centered = -1; // 지금 화면을 민 정도 (0 = 오른쪽, 1 = 가운데). 바뀔 때만 다시 계산

  function frame(center) { // 책을 오른쪽(0)에서 가운데(1) 사이 어디에 둘지
    if (center === centered) return;
    centered = center;
    const x = shiftX * (1 - center);
    if (x === 0) camera.clearViewOffset();
    else camera.setViewOffset(innerWidth, innerHeight, x, 0, innerWidth, innerHeight);
    camera.updateProjectionMatrix();
  }

  // 넓은 화면에서는 책을 오른쪽(약 66%)에 두고, 좁은 화면에서는 가운데에 두고 멀리서 본다
  function resize() { // 화면 크기 맞추기
    const aspect = innerWidth / innerHeight;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); // 선명도 상한 (다른 부품은 renderer.getPixelRatio()로 읽음)
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = aspect;
    shiftX = NARROW.matches ? 0 : -innerWidth * 0.16;
    distance = Math.max(11.5, 3 / (Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * aspect)); // 룬 띠가 화면에 다 들어오는 거리
    centered = -1; // 화면 크기가 바뀌었으니 다시 계산
    frame(0);
  }
  addEventListener('resize', resize);
  resize();

  const look = new THREE.Vector3(); // 카메라가 바라보는 곳
  function update(s, t) { // 카메라 움직임
    const intro = THREE.MathUtils.clamp(1 - (t - s.intro) / 3.8, 0, 1) ** 3; // 로딩이 걷히면 3.8초 동안 멀리서 다가온다
    const shake = s.pulse * 0.05; // 룬이 새겨질 때 흔들림
    camera.position.set(
      Math.sin(t * 0.07) * 0.6 + (Math.random() - 0.5) * shake, // 좌우
      Math.sin(t * 0.11) * 0.15 + intro * 3.4 + (Math.random() - 0.5) * shake, // 위아래
      distance + intro * 10 - s.push * 4.5, // 앞뒤 (로그인 창 줌 포함)
    );
    look.set(0, 0.15 + intro * 1.2, 0); // 책 쪽 바라보기

    // 공방 입장: 표지가 열리면 책이 화면 가운데로 오며 조금 다가가고, 책장이 넘어가면 점점 빨라지며 책장 속으로 들어간다
    const toPage = s.open * 0.15 + s.dive ** 1.6 * 0.85; // 0 → 1 (끝으로 갈수록 빨라짐)
    if (toPage > 0) {
      camera.position.lerp(PAGE_EYE, toPage); // 카메라를 책장 바로 앞으로 옮긴다
      look.lerp(PAGE, Math.min(1, s.open)); // 시선을 책장 가운데로
    }
    camera.lookAt(look);
    frame(THREE.MathUtils.smoothstep(s.open, 0, 1)); // 펼치는 동안 책을 화면 가운데로

    const fov = FOV + s.dive ** 3 * 46; // 마지막에 시야가 넓어지며 빨려 드는 느낌 (32 → 78도)
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }

  return { renderer, scene, camera, update };
}
