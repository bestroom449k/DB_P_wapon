# 주요 기능 작동 원리

다섯 빛 공방의 **커뮤니티 게시판, 뽑기 영상, 책 넘김 연출, 이미지 업로드**가 어떻게 돌아가는지와 기능별 파일을 정리한 문서입니다.

코드의 같은 자리에도 한글 주석이 달려 있으니, 아래 "관련 파일"을 위에서부터 열어 보면 흐름을 따라갈 수 있습니다. DB 구조와 실행 방법은 [README.md](README.md), 라이브러리 설명은 `LIBRARIES.md`에 있습니다.

## 목차

1. [커뮤니티 게시판](#1-커뮤니티-게시판)
2. [뽑기 영상](#2-뽑기-영상)
3. [책 넘김 연출](#3-책-넘김-연출)
4. [이미지 업로드](#4-이미지-업로드)
5. [거래소](#5-거래소)
6. [값을 바꾸고 싶을 때](#6-값을-바꾸고-싶을-때)

## 전체 구조

```
브라우저 (frontend)              서버 (server)            저장하는 곳
HTML, CSS, JS, Three.js   →     Express API       →     MySQL (회원, 글, 인벤토리, 도감)
                          ←     JSON 응답         →     server/uploads/ (이미지 파일)
```

네 기능에 공통으로 적용되는 원칙입니다.

- **결과와 권한은 서버가 정합니다.** 화면의 버튼은 숨길 수 있어도 주소로 직접 요청할 수 있기 때문입니다.
- **DB에는 유저 데이터만 저장합니다.** 아이템, 확률, 강화 규칙은 [db/gameData.json](db/gameData.json)에 있습니다.
- **파일은 폴더에, 파일 경로는 DB에 저장합니다.**

---

## 1. 커뮤니티 게시판

페이지는 `board.html` 하나입니다. 목록, 읽기, 쓰기 화면을 미리 넣어 두고, 주소의 `#` 뒤에 따라 하나만 보여 줍니다.

### 작동 흐름 (글 하나를 읽을 때)

```
1. 목록에서 글을 누른다
2. 주소가 board.html#/post/3 으로 바뀐다 (새로고침 없음)
3. hashchange 이벤트 → route()가 주소를 읽고 renderPost(3)을 부른다
4. api('/posts/3') → 서버에 GET /api/posts/3 요청
5. 서버가 조회수를 1 올리고, 글과 댓글을 MySQL에서 읽어 JSON으로 응답
6. 화면의 빈 틀에 제목, 본문, 이미지, 댓글을 채운다
```

### 화면과 주소

| 주소 | 화면 | 로그인 |
| --- | --- | --- |
| `#/` | 글 목록 | 필요 없음 |
| `#/post/번호` | 글 읽기와 댓글 | 읽기는 필요 없음, 댓글 쓰기는 필요 |
| `#/write` | 글쓰기 | 필요 |
| `#/edit/번호` | 내 글 고치기 | 필요 |

### 서버 API

| 요청 | 하는 일 | 로그인 |
| --- | --- | --- |
| `GET /api/posts` | 글 목록 (최신 글부터, 지운 글과 거래글 제외) | 필요 없음 |
| `GET /api/posts/:postId` | 글 하나와 댓글 (조회수 +1, `?noview=1`이면 그대로) | 필요 없음 |
| `POST /api/posts` | 글쓰기 | 필요 |
| `PATCH /api/posts/:postId` | 내 글 고치기 | 필요 |
| `DELETE /api/posts/:postId` | 내 글 지우기 | 필요 |
| `POST /api/posts/:postId/comments` | 댓글 쓰기 | 필요 |
| `DELETE /api/posts/:postId/comments/:commentId` | 내 댓글 지우기 | 필요 |

### 핵심 설계

| 문제 | 해결 |
| --- | --- |
| 다른 글을 빠르게 누르면 늦게 온 응답이 화면을 덮어쓸 수 있음 | 화면을 그릴 때마다 `renderToken`을 올리고, 번호가 달라진 응답은 버림 |
| 남의 글을 주소로 직접 고치거나 지울 수 있음 | 서버의 `checkWriter`가 글쓴이를 다시 확인 (아니면 403) |
| 글에 HTML이나 스크립트를 넣는 공격 (XSS) | 사람이 쓴 글은 항상 `textContent`로 넣어 글자로만 표시 |
| 입력값으로 SQL을 조작하는 공격 (SQL 인젝션) | 모든 값을 `?` 자리표시자로 따로 전달 |
| 지운 글의 기록 보존 | 행을 지우지 않고 `deleted_at`에 시각만 적는 소프트 삭제 |
| 글자 수 제한 우회 | 제목 100자, 내용 5,000자, 댓글 500자를 화면과 서버에서 모두 검사 |

### 관련 파일

| 파일 | 역할 |
| --- | --- |
| [frontend/board.html](frontend/board.html) | 세 화면의 빈 틀 |
| [frontend/js/board/main.js](frontend/js/board/main.js) | 화면 전환, 글 표시, 글쓰기와 고치기 |
| [frontend/js/shared/comments.js](frontend/js/shared/comments.js) | 댓글 목록, 쓰기, 지우기 (거래소 거래글과 같이 씀) |
| [frontend/js/shared/api.js](frontend/js/shared/api.js) | 서버 요청 공용 함수 |
| [frontend/js/shared/page.js](frontend/js/shared/page.js) | 요소 만들기, 시각 표시, 글자 수, 알림, 확인 창 |
| [frontend/css/board.css](frontend/css/board.css), [frontend/css/post.css](frontend/css/post.css), [frontend/css/page.css](frontend/css/page.css) | 글 목록, 글 읽기·쓰기·댓글(거래소와 같이 씀), 별도 페이지 공통 디자인 |
| [server/src/routes/posts.js](server/src/routes/posts.js) | 글과 댓글 API, 권한 검사, SQL |
| [server/src/common.js](server/src/common.js) | 로그인 확인, 번호 검사 |

---

## 2. 뽑기 영상

**결과는 서버가 먼저 정해서 저장하고, 영상은 그 결과를 보여 주는 연출입니다.** 영상을 건너뛰거나 창을 닫아도 결과는 바뀌지 않습니다.

### 작동 흐름

```
1. "1회 뽑기" 버튼 → POST /api/gacha/draw
2. 서버가 등급과 아이템을 정한다
3. 트랜잭션 하나로 골드 차감 + 인벤토리 추가 + 도감 기록
4. 등급, 아이템, 남은 골드를 응답
5. 화면이 등급에 맞는 영상을 고르고, 3D 그리기를 멈춘 뒤 재생
6. 카드가 멈추는 시각에 결과 명판을 띄운다
7. 확인 또는 Esc → 0.3초 동안 걷히며 3D 화면으로 복귀
```

### 영상 두 종류

| 영상 | 등급 | 파일 | 길이 | 결과가 뜨는 시각 |
| --- | --- | --- | --- | --- |
| 일반판 | 1~4등급 | `frontend/video/gacha-normal.mp4` | 15초 | 13.1초 |
| 황금판 | 5등급 | `frontend/video/gacha-legendary.mp4` | 20초 | 18.1초 |

### 핵심 설계

- **트랜잭션과 행 잠금:** `SELECT ... FOR UPDATE`로 회원 행을 잠가서, 버튼을 동시에 눌러도 골드가 꼬이지 않습니다. 중간에 실패하면 `rollback`으로 전부 취소됩니다.
- **3D 멈춤:** 재생 중에는 `<html>`에 `is-summoning`을 붙이고 [game/main.js](frontend/js/game/main.js)가 3D를 그리지 않습니다. 그래픽카드를 영상에 양보해서 끊기지 않게 하기 위해서입니다.
- **결과 시점:** `timeupdate` 이벤트로 재생 시간을 보다가 `SETTLE` 시각이 되면 명판을 띄웁니다.
- **건너뛰기:** 2초 뒤에 버튼이 나타나고, 누르면 카드가 멈추는 장면으로 바로 이동합니다.
- **문제가 생겼을 때:** 영상을 재생하지 못하면 바로 결과를 보여 줍니다.
- **움직임 줄이기:** 이 설정을 켠 사용자에게는 영상 없이 결과 명판만 보여 줍니다.

> **현재 확률은 시연용입니다.** `db/gameData.json`의 `legendaryPct`가 50이라 5등급이 50%로 나오지만, 게임의 확률 창에는 1%로 적혀 있습니다. 지금은 예시 마도서가 1등급과 5등급 하나씩뿐이라 두 등급만 50%씩 나옵니다.

### 관련 파일

| 파일 | 역할 |
| --- | --- |
| [frontend/game.html](frontend/game.html) | 영상 태그와 결과 명판의 틀 |
| [frontend/js/game/function/hud.js](frontend/js/game/function/hud.js) | 뽑기 요청, 영상 선택과 재생, 건너뛰기, 결과 명판 |
| [frontend/css/game/summon.css](frontend/css/game/summon.css) | 영상 층과 결과 명판 디자인 |
| [frontend/js/game/main.js](frontend/js/game/main.js) | 영상이 도는 동안 3D 그리기 멈춤 |
| [server/src/routes/gacha.js](server/src/routes/gacha.js) | 등급 결정, 트랜잭션 저장 |
| [db/gameData.json](db/gameData.json) | 뽑기 가격, 확률, 아이템 |

---

## 3. 책 넘김 연출

로그인한 뒤 타이틀에서 "게임 시작"을 누르면 마도서가 펼쳐지고, 책장이 넘어가며, 카메라가 책 속으로 들어가 게임 화면으로 이어집니다.

**CSS가 시간표를 정하고, Three.js가 그 값을 매 프레임 읽어 3D를 움직입니다.**

### 시간표 (3.6초)

| 시간 | 일어나는 일 | CSS 값 |
| --- | --- | --- |
| 0~0.5초 | 사슬이 끊어지고 책이 정면으로 돈다 | `--open` |
| 0.5~1.2초 | 표지가 열린다 | `--open` |
| 1~2.6초 | 책장 18장이 점점 빠르게 넘어간다 | `--flip` |
| 1.8~3.6초 | 카메라가 책장 속으로 빨려 들어간다 | `--dive` |
| 2.9~3.5초 | 책장 빛이 화면을 가득 채운다 | `.portal` |
| 3.6초 | `game.html`로 이동 | `animationend` |

### 작동 흐름

```
1. "게임 시작" 링크가 주소를 #enter로 바꾼다
2. CSS가 :target으로 알아채고 enter-book 애니메이션을 시작한다
3. timeline.js가 매 프레임 --open, --flip, --dive 값을 읽는다
4. grimoire.js는 사슬, 표지, 책장을 움직이고 stage.js는 카메라를 움직인다
5. .portal 책장 빛이 화면을 채운다
6. 애니메이션이 끝나면 enter.js가 game.html로 넘긴다
7. 게임 화면은 같은 색의 빛(.veil)으로 시작해서 그 빛이 걷힌다
   (enter.js가 남긴 표시가 있을 때만. 공방·게시판에서 돌아오거나 새로고침하면 빛 없이 바로 시작)
```

### 책장 한 장이 넘어가는 계산

[grimoire.js](frontend/js/design/objects/grimoire.js)의 코드입니다.

```js
const start = (i / LEAVES) * 0.78;                  // 이 장이 넘어가기 시작하는 순간 (앞 장부터 차례로)
const p = smooth(s.flip, start, start + 0.22);      // 이 장이 넘어간 정도 (0~1)
leaf.pivot.rotation.y = -p * (0.9 - i * 0.002) * Math.PI; // 책등을 축으로 회전
const curl = Math.sin(p * Math.PI) * 0.3;           // 넘어가는 한가운데서 가장 많이 휜다
position.setZ(v, curl * (x / PW) ** 1.6);           // 책등에서 멀수록 더 많이 휜다
```

- **시간차:** 장마다 시작 시점이 달라서 촤르륵 넘어가는 것처럼 보입니다.
- **종이처럼 휘기:** 판의 꼭짓점을 매 프레임 직접 옮깁니다.
- **성능:** 넘어가기 시작한 장만 그리고, 나머지는 숨겨 둡니다.

### 끊기지 않고 이어지는 이유

- 카메라가 책장 바로 앞으로 가면서 시야각이 32도에서 78도로 넓어져 빨려 드는 느낌이 납니다.
- 타이틀의 `.portal`과 게임의 `.veil`이 같은 색(`--page-fill`)이라, 페이지가 바뀌어도 화면이 그대로 이어져 보입니다.
- `@view-transition`이 두 페이지 사이를 부드럽게 연결합니다.
- 움직임 줄이기를 켠 사용자에게는 책을 펼치지 않고 0.6초 동안 빛만 차오릅니다.

### 관련 파일

| 파일 | 역할 |
| --- | --- |
| [frontend/js/function/enter.js](frontend/js/function/enter.js) | 연출이 끝나면 게임 화면으로 이동 |
| [frontend/css/timeline.css](frontend/css/timeline.css) | 3.6초 시간표 (`enter-book`) |
| [frontend/js/function/timeline.js](frontend/js/function/timeline.js) | CSS 값을 매 프레임 읽기 |
| [frontend/js/design/objects/grimoire.js](frontend/js/design/objects/grimoire.js) | 사슬, 표지, 책장의 움직임 |
| [frontend/js/function/stage.js](frontend/js/function/stage.js) | 카메라가 책 속으로 이동 |
| [frontend/css/title.css](frontend/css/title.css) | 화면을 채우는 책장 빛 (`.portal`) |
| [frontend/css/game/base.css](frontend/css/game/base.css) | 게임 화면에서 걷히는 빛 (`.veil`) |
| [frontend/game.html](frontend/game.html) | 머리의 작은 스크립트: 책 속으로 들어왔을 때만 빛을 켬 |
| [frontend/css/tokens.css](frontend/css/tokens.css) | 책장 빛 색, 페이지 사이 전환 |

---

## 4. 이미지 업로드

게시글 하나에 이미지 한 장을 붙일 수 있습니다. **파일은 서버 폴더에 저장하고, MySQL에는 그 파일의 경로만 저장합니다.**

### 작동 흐름

```
[브라우저]  이미지 선택 또는 끌어다 놓기
            → 형식과 크기 검사
            → 긴 변 1600px의 WebP로 다시 저장
            → 미리 보기
            → "올리기"를 누르면 제목, 내용과 함께 FormData로 전송

[서버]      로그인 확인
            → multer가 파일을 메모리로 받기 (5MB까지)
            → 파일 앞부분을 읽어 진짜 이미지인지 검사
            → 무작위 이름으로 server/uploads/에 저장

[MySQL]     posts.post_image_url = '/uploads/무작위이름.webp'

[글 읽기]   <img src="/uploads/무작위이름.webp"> → 서버가 파일을 내려준다
```

### 제한

| 항목 | 값 |
| --- | --- |
| 형식 | JPG, PNG, WebP |
| 글 하나당 | 1장 |
| 고를 수 있는 원본 크기 | 20MB |
| 서버가 받는 크기 | 5MB |
| 저장 크기 | 긴 변 1600px, WebP 화질 86% |

### 글을 고치거나 지울 때

| 동작 | 이미지 파일 | DB의 경로 |
| --- | --- | --- |
| 글자만 고침 | 그대로 | 그대로 |
| 새 이미지로 바꿈 | 이전 파일 삭제, 새 파일 저장 | 새 경로 |
| "빼기"를 누름 | 삭제 | `NULL` |
| 글을 지움 | 삭제 | `NULL` |

글은 소프트 삭제로 DB에 남지만, 이미지는 주소만 알면 열리기 때문에 파일을 실제로 지웁니다.

### 안전 장치

| 위험 | 막는 방법 |
| --- | --- |
| 이미지인 척한 파일 | 확장자를 믿지 않고 파일 앞부분(시그니처)을 읽어 확인 |
| 파일 이름으로 다른 폴더에 쓰기 | 사용자가 정한 이름은 쓰지 않고 서버가 무작위 이름을 지음 |
| 올린 파일이 스크립트로 실행됨 | SVG를 받지 않고, `nosniff`와 CSP `sandbox` 헤더를 붙임 |
| 사진 속 촬영 위치 공개 | 캔버스에 다시 그려서 EXIF(GPS 등) 정보를 뺌 |
| 큰 파일로 서버 메모리 소모 | 5MB가 넘으면 받기를 중단 |
| 글 저장 실패 시 파일만 남음 | DB 저장이 실패하면 방금 저장한 파일도 지움 |

### Cloudflare 같은 클라우드를 쓰지 않은 이유

multer는 파일을 **받는 도구**이고, Cloudflare R2는 파일을 **보관하는 곳**입니다. 이 프로젝트는 서버 한 대로 시연하므로, 가입이나 API 키 없이 `npm start`만으로 돌아가는 서버 폴더를 선택했습니다.

실제 서비스로 배포한다면 R2로 옮기는 것이 좋습니다. 저장 코드를 [uploads.js](server/src/uploads.js)에 모아 두어서 주로 `saveImage`와 `removeImage`만 바꾸면 됩니다.

### 관련 파일

| 파일 | 역할 |
| --- | --- |
| [frontend/board.html](frontend/board.html) | 이미지 첨부 칸, 글의 이미지 자리 (게시판 글쓰기와 글 읽기) |
| [frontend/js/shared/image-picker.js](frontend/js/shared/image-picker.js) | 파일 선택, 끌어다 놓기, 미리 보기, FormData에 넣기 |
| [frontend/js/shared/image.js](frontend/js/shared/image.js) | 올리기 전 크기 줄이기, WebP 변환 |
| [frontend/js/shared/api.js](frontend/js/shared/api.js) | FormData 전송 |
| [server/src/uploads.js](server/src/uploads.js) | 받기, 검사, 저장, 삭제, 이미지 제공 |
| [server/src/routes/posts.js](server/src/routes/posts.js) | 경로를 DB에 저장, 교체와 삭제 처리 |
| `server/uploads/` | 실제 이미지 파일 (서버가 자동으로 만들고 git에 올리지 않음) |

---

## 5. 거래소

플레이어끼리 마도서를 골드로 사고파는 기능입니다. 공방 화면(`atelier.html`)의 네 번째 탭에 있고, 게임 화면 아래 메뉴의 "거래소"로 들어갑니다.

**거래글 = 게시판 글 + 거래 정보입니다.** 제목, 설명, 조회수, 댓글은 게시판과 같은 `posts`, `comments` 테이블에 저장하고, 마도서·가격·상태만 `trades`에 따로 둡니다. 그래서 댓글은 게시판과 같은 코드(`js/shared/comments.js`)를 그대로 씁니다. 거래글에는 이미지를 붙이지 않습니다 (이미지 첨부는 게시판 글에만 있음).

### 화면과 주소

| 주소 | 화면 | 로그인 |
| --- | --- | --- |
| `atelier.html#/market` | 판매 중인 목록 (눌러서 거래 화면으로), 아래에 내 마도서 올리기 | 목록은 필요 없음 |
| `#/market/item/번호` | 거래 하나: 마도서, 가격, 설명, 사기·내리기, 판매 기록, 댓글 | 보기는 필요 없음 |
| `#/market/sell/번호` | 판매 글쓰기: 제목, 가격, 설명 | 필요 |

### 작동 흐름

```
[올리기]  내 마도서의 "올리기" → 판매 글쓰기 (제목과 가격은 미리 채워짐)
          → 제목, 가격, 설명을 JSON으로 POST /api/market
          → 서버: 입력 검사 → 내 마도서인지, 장착 중이 아닌지, 이미 올린 것이 아닌지 확인
          → posts 한 줄(판매자, 제목, 설명) + trades 한 줄(마도서, 가격, ACTIVE) 저장
          → 올린 거래 화면으로

[보기]    목록의 줄을 누름 → GET /api/market/:postId (거래 정보) + GET /api/posts/:postId (글과 댓글, 조회수 +1)

[사기]    거래 화면의 "사기" → 확인 창 → POST /api/market/:postId/buy
          → 서버: 구매자와 판매자 행 잠금 → 거래 행 잠금 → 마도서 행 잠금
          → 구매자 골드 빼기, 판매자 골드 더하기, 마도서 주인 바꾸기
          → trades를 SOLD로 (구매자, 팔린 시각), 구매자 도감에 기록
          → 거래 화면에 "○○님이 샀어요"

[내리기]  내 거래 화면의 "내리기" → POST /api/market/:postId/cancel → trades를 CANCELLED로 (글과 댓글은 기록으로 남음)

[댓글]    게시판과 같은 POST /api/posts/:postId/comments
```

### 서버 API

| 요청 | 하는 일 | 로그인 |
| --- | --- | --- |
| `GET /api/market` | 판매 중인 마도서 목록 (최신 순) | 필요 없음 |
| `GET /api/market/:postId` | 거래 하나: 마도서, 가격, 상태, 판매자, 구매자 | 필요 없음 |
| `POST /api/market` | 내 마도서 올리기: `userWeaponId`, `price`, `title`, `content`(설명, 없어도 됨) | 필요 |
| `POST /api/market/:postId/buy` | 사기 | 필요 |
| `POST /api/market/:postId/cancel` | 내가 올린 마도서 내리기 | 필요 |
| `GET /api/posts/:postId`, `POST /api/posts/:postId/comments` | 거래글의 제목·설명과 댓글 (게시판과 같은 API) | 쓰기만 필요 |

거래 하나를 읽는 쿼리는 **테이블 5개를 잇는 조인**입니다. 판매자와 구매자가 둘 다 `users`에 있어서 같은 테이블을 두 번 붙이고, 구매자는 팔렸을 때만 있으므로 `LEFT JOIN`을 씁니다.

```sql
FROM trades t
JOIN posts p        ON p.post_id = t.post_id            -- 거래글
JOIN users s        ON s.user_id = p.writer_user_id     -- 판매자
JOIN user_weapons w ON w.user_weapon_id = t.user_weapon_id -- 파는 마도서
LEFT JOIN users b   ON b.user_id = t.buyer_user_id      -- 구매자 (팔렸을 때만)
```

### 규칙과 안전 장치

| 규칙 | 지키는 방법 |
| --- | --- |
| 같은 마도서가 두 번 팔리지 않음 | 거래 행을 `FOR UPDATE`로 잠그고 상태가 ACTIVE인지 다시 확인. DB에도 판매 중인 무기는 하나만 허용하는 UNIQUE(`active_weapon_id`)가 있음 |
| 골드가 꼬이지 않음 | 골드 이동, 주인 변경, 거래 기록을 트랜잭션 하나로 묶음 |
| 두 사람이 서로의 것을 동시에 사도 멈추지 않음 | 두 회원 행을 회원 번호가 작은 쪽부터 잠금 |
| 판매 중인 마도서는 장착·강화·상점 판매 불가 | 인벤토리 API가 ACTIVE 거래를 확인. 공방 화면에는 "거래소 판매 중"으로 표시 |
| 장착 중인 마도서는 올릴 수 없음 | 올릴 때 장착 여부를 확인 (먼저 "장착 풀기") |
| 내 것은 살 수 없음, 골드가 모자라면 살 수 없음 | 서버가 확인하고 안내 문구로 거절 |
| 거래글이 게시판에 섞이지 않음 | 글마다 종류(`posts.post_type`: GENERAL 자유글 / TRADE 거래글)를 적음. 게시판 목록은 GENERAL만 보여 주고, 게시판 API는 거래글을 고치거나 지우지 못함. 게시판 주소로 거래글을 열면 거래소 화면으로 보냄 |
| 거래 내역은 거래글에만 붙음 | `trades`의 FK가 (글 번호, 'TRADE')를 가리킴. 자유글에는 거래 내역을 붙일 수 없고, 거래 내역이 있는 글은 자유글로 바꿀 수 없음 |
| 거래 정보가 빠진 거래글이 생기지 않음 | posts 한 줄과 trades 한 줄을 트랜잭션 하나로 같이 넣음 (두 테이블에 걸친 규칙이라 MySQL 제약으로는 못 걸어서 서버가 지킴) |
| 가격 | 1부터 1억 골드까지 정수 |
| 제목, 설명 | 제목 100자, 설명 5,000자(없어도 됨). 이미지는 받지 않음 |

### 관련 파일

| 파일 | 역할 |
| --- | --- |
| [frontend/atelier.html](frontend/atelier.html) | 거래소 세 화면의 틀 (목록, 거래 하나, 판매 글쓰기) |
| [frontend/js/atelier/main.js](frontend/js/atelier/main.js) | 화면 전환, 목록, 거래 화면, 판매 글쓰기, 사기, 내리기 |
| [frontend/js/shared/comments.js](frontend/js/shared/comments.js) | 댓글 (게시판과 같이 씀) |
| [frontend/css/atelier.css](frontend/css/atelier.css), [frontend/css/post.css](frontend/css/post.css) | 거래소 줄과 마도서 칸, 글 읽기·쓰기·댓글 디자인 |
| [server/src/routes/market.js](server/src/routes/market.js) | 거래소 API, 잠금 순서, 트랜잭션 |
| [server/src/routes/inventory.js](server/src/routes/inventory.js) | 판매 중 표시(`listed`), 판매 중이면 장착·강화·판매 거절 |
| [server/src/common.js](server/src/common.js) | 트랜잭션 도구, 글자 수 검사 (인벤토리, 게시판과 같이 씀) |

---

## 6. 값을 바꾸고 싶을 때

서버 쪽 파일이나 `db/gameData.json`을 바꾼 뒤에는 서버를 다시 켜야 적용됩니다.

| 바꿀 것 | 고칠 곳 | 함께 확인할 것 |
| --- | --- | --- |
| 뽑기 가격 | `db/gameData.json`의 `draw.cost` | `game.html`의 버튼에 적힌 가격 |
| 5등급 확률 | `db/gameData.json`의 `draw.legendaryPct` | `game.html`의 확률 창 |
| 뽑기 영상 | `frontend/video/`의 파일 | `hud.js`의 `SETTLE` (카드가 멈추는 시각) |
| 책 넘김 전체 길이 | `css/timeline.css`의 `--enter` | 시간표는 %로 적혀 있어서 함께 늘어남 |
| 넘어가는 책장 수 | `grimoire.js`의 `LEAVES` | |
| 글자 수 제한 | 서버는 `server/src/common.js`의 `LIMITS`, 화면은 `js/board/main.js`와 `js/atelier/main.js`의 `LIMITS`, 댓글은 `js/shared/comments.js`의 `MAX` | 서버와 화면을 같이 고침. 제목과 댓글은 DB 칸 크기(100, 500)까지 |
| 이미지 상한 | `uploads.js`의 `MAX_BYTES`와 `image.js`의 `MAX_UPLOAD` | 두 곳을 같이 고침. 오류 문구의 "5MB"도 함께 |
| 저장 이미지 크기, 화질 | `image.js`의 `MAX_SIDE`, `QUALITY` | |
| 거래소 가격 상한 | `routes/market.js`와 `js/atelier/main.js`의 `MAX_PRICE` | 두 곳을 같이 고침 |
