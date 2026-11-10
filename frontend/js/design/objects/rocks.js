// 섬 둘레를 천천히 도는 돌 조각들. 궤도를 앞뒤로 눌러 카메라 바로 앞을 가로막지 않게 한다.
import * as THREE from "three";
import { ISLAND_TOP, roughen } from "./island.js";

const COUNT = 11; // 돌 조각 개수

export function create({ scene }) {
  // 돌 조각 만들기
  const material = new THREE.MeshStandardMaterial({
    color: 0x2e2c48,
    roughness: 0.9,
    flatShading: true,
  }); // 돌 재질
  const rocks = Array.from({ length: COUNT }, (_, i) => {
    // 돌 조각 하나
    const size = 0.06 + Math.random() * 0.15; // 크기
    const mesh = new THREE.Mesh(
      roughen(new THREE.DodecahedronGeometry(size), size * 0.5),
      material,
    ); // 울퉁불퉁한 돌
    scene.add(mesh);
    return {
      mesh,
      angle: (i / COUNT) * Math.PI * 2, // 궤도 위 위치 (고르게 나눔)
      radius: 3.3 + Math.random() * 1.6, // 궤도 크기
      height: ISLAND_TOP - 0.6 + Math.random() * 3.4, // 높이
      speed: (0.035 + Math.random() * 0.05) * (i % 3 ? 1 : -1), // 도는 속도와 방향
    };
  });

  return (s, t, dt) => {
    // 매 프레임: 돌 조각
    for (const rock of rocks) {
      rock.angle += rock.speed * dt; // 궤도 따라 이동
      rock.mesh.position.set(
        // 위치 (위아래로 둥실둥실)
        Math.cos(rock.angle) * rock.radius,
        rock.height + Math.sin(t * 0.6 + rock.radius) * 0.14,
        Math.sin(rock.angle) * rock.radius * 0.55,
      );
      rock.mesh.rotation.x += dt * 0.3; // 천천히 구르기
      rock.mesh.rotation.y += dt * 0.2;
    }
  };
}
