// 오늘 밤의 실제 달 모양: astronomy-engine 라이브러리로 지금 이 순간 달의 위상을 계산한다.
// 인터넷에 묻는 API가 아니라 브라우저 안에서 천문 공식으로 계산하므로 열쇠(API 키)도, 서버도 필요 없다.
// 하늘(js/design/background/sky.js)이 이 값으로 달의 밝은 쪽과 어두운 쪽을 나눠 그린다. 타이틀과 게임 화면이 같이 쓴다.
import * as Astronomy from 'astronomy-engine';

const degrees = Astronomy.MoonPhase(new Date()); // 달의 위상 (도): 0 = 삭(달이 안 보임), 90 = 상현달, 180 = 보름달, 270 = 하현달
const angle = (degrees * Math.PI) / 180;

// 달 표면을 비추는 햇빛의 방향 (달을 바라보는 화면 기준: x는 오른쪽, z는 우리 쪽)
// 상현달(90도)은 오른쪽이 밝고, 하현달(270도)은 왼쪽이 밝다 (북반구에서 보는 모양)
export const moonLight = [Math.sin(angle), 0, -Math.cos(angle)];

export const moonFull = (1 - Math.cos(angle)) / 2; // 밝게 보이는 비율 (0 = 삭, 1 = 보름달)
