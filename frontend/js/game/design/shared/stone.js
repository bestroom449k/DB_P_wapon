// 여러 부품이 같이 쓰는 재질: 달빛 받은 대리석(테라스, 기둥, 아치), 섬 바위, 풀, 나뭇잎, 성벽과 지붕, 불 켜진 창과 등불
// 밤 장면이라 바탕색은 달빛에 비친 차가운 색으로 두고, 따뜻한 빛은 창문과 등불에만 쓴다.
import * as THREE from 'three';

export const marble = new THREE.MeshStandardMaterial({ color: 0xc3c8e4, roughness: 0.5 }); // 달빛 받은 흰 대리석
export const marbleTrim = new THREE.MeshStandardMaterial({ color: 0x9da3c8, roughness: 0.6 }); // 대리석 받침과 띠 (조금 어둡게 해서 모양이 읽히게)
export const rock = new THREE.MeshLambertMaterial({ color: 0x5f5b7c, flatShading: true }); // 섬 바위 (남보라 돌)
export const grass = new THREE.MeshLambertMaterial({ color: 0x35524b }); // 섬 윗면 풀 (밤의 짙은 청록)
export const leaves = [0x2a4a43, 0x34594d, 0x41685a].map((color) => new THREE.MeshLambertMaterial({ color })); // 나뭇잎 세 가지 (밤의 짙은 초록)
export const bark = new THREE.MeshLambertMaterial({ color: 0x463b48 }); // 나무 줄기
export const wall = new THREE.MeshLambertMaterial({ color: 0xc6cbe6 }); // 성벽 (달빛에 하얗게)
export const roof = new THREE.MeshLambertMaterial({ color: 0x343e86 }); // 성 지붕 (깊은 파랑)
export const windowLight = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.7, 1.15, 0.55), fog: false }); // 불 켜진 창 (1보다 밝아서 빛이 번지고, 안개 너머에서도 보인다)
export const lanternLight = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.3, 0.62) }); // 등불 심지
