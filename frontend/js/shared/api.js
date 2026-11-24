// 서버 API 부르기: JSON을 주고받고, 실패하면 서버가 보낸 문구(없으면 연결 안내)로 오류를 던진다
// 파일을 보낼 때는 body에 FormData를 넘긴다 (이때 Content-Type은 브라우저가 정한다)
// (타이틀 index.html의 로그인, 게임 game.html, 게시판 board.html, 공방 atelier.html이 같이 쓴다)
const OFFLINE = '서버에 연결할 수 없어요. 서버가 켜져 있는지 확인해 주세요';

export async function api(path, { method = 'GET', body } = {}) { // 예: api('/posts'), api('/posts', { method: 'POST', body })
  const isForm = body instanceof FormData; // 파일이 든 요청인지
  let res;
  try {
    res = await fetch(`/api${path}`, { // 서버로 요청 보내기 (로그인 쿠키는 브라우저가 자동으로 붙인다)
      method,
      headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined, // FormData는 브라우저가 경계값까지 넣어 정해야 해서 비워 둔다
      body: isForm ? body : body ? JSON.stringify(body) : undefined, // 파일이면 그대로, 아니면 JSON 글자로
    });
  } catch {
    throw Object.assign(new Error(OFFLINE), { status: 0 }); // 서버가 꺼져 있음
  }
  const data = await res.json().catch(() => null); // 응답을 JSON으로 읽기 (JSON이 아니면 null)
  if (!res.ok) throw Object.assign(new Error(data?.message ?? OFFLINE), { status: res.status }); // 400, 401 등은 서버 문구와 상태 코드를 담아 오류로
  return data; // 성공한 응답
}
