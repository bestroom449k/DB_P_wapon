// 여러 부품이 같이 쓰는 재질 설정
import * as THREE from 'three';

// 빛처럼 보이게 하는 설정 (룬 띠, 마법진, 후광, 마력 가루, 룬 조각, 룬 마법진, 빛 기둥, 반짝이)
//   transparent: 반투명 허용
//   depthWrite: false → 겹쳐도 서로 가리지 않음
//   AdditiveBlending → 뒤에 있는 색에 더해져서 겹칠수록 밝아짐
export const GLOW = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
