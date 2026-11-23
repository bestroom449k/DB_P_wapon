// 서버 API 부르기: JSON을 주고받고, 실패하면 서버가 보낸 문구(없으면 연결 안내)로 오류를 던진다
// 파일을 보낼 때는 body에 FormData를 넘긴다 (이때 Content-Type은 브라우저가 정한다)
// (게임 game.html, 게시판 board.html, 공방 atelier.html이 같이 쓴다)
const OFFLINE = '서버에 연결할 수 없어요. 서버가 켜져 있는지 확인해 주세요';

export async function api(path, { method = 'GET', body } = {}) {
  const isForm = body instanceof FormData;
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: isForm ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw Object.assign(new Error(OFFLINE), { status: 0 }); // 서버가 꺼져 있음
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(data?.message ?? OFFLINE), { status: res.status });
  return data;
}
