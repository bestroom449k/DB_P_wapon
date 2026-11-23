---
name: 다섯 빛 공방 (Fivefold Atelier)
description: 달빛 아래 떠 있는 공방에서 마도서에 룬을 새겨 다섯 빛을 깨우는, 하나의 밤 세계
colors:
  night-0: "#0b0e26"
  night-1: "#161a44"
  night-2: "#20255a"
  panel: "rgba(14, 17, 46, 0.82)"
  line: "rgba(169, 175, 219, 0.3)"
  moon: "#eef0ff"
  mist: "#a9afdb"
  lamp: "#ffcf8a"
  lamp-hi: "#ffe6b8"
  lamp-ink: "#24180f"
  g1: "#aab3c8"
  g2: "#3fd6a4"
  g3: "#a56bff"
  g4: "#ff4f6d"
  g5: "#ffbe4d"
  page-light: "#fff6e2"
  page-glow: "#f1e2c0"
typography:
  display:
    fontFamily: "Diphylleia, Noto Serif KR, serif"
    fontSize: "clamp(3.2rem, min(7.6vw, 12.5vh), 6rem)"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Diphylleia, Noto Serif KR, serif"
    fontSize: "clamp(1.6rem, 2.2vw, 2.1rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.02em"
  menu:
    fontFamily: "Diphylleia, Noto Serif KR, serif"
    fontSize: "clamp(1.3rem, min(2vw, 3.2vh), 1.7rem)"
    fontWeight: 400
    lineHeight: 1.25
  title:
    fontFamily: "Diphylleia, Noto Serif KR, serif"
    fontSize: "1.35rem"
    fontWeight: 400
    lineHeight: 1.2
  body:
    fontFamily: "Gowun Dodum, Apple SD Gothic Neo, Malgun Gothic, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Gowun Dodum, Apple SD Gothic Neo, Malgun Gothic, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  kbd: "6px"
  field: "10px"
  plaque: "14px"
  dialog: "18px"
  dock: "20px"
  draw: "26px"
  pill: "999px"
spacing:
  gutter-title: "clamp(16px, 4vw, 64px)"
  gutter-game: "clamp(16px, 2.4vw, 40px)"
  panel-pad: "22px"
  dialog-pad: "28px"
components:
  button-primary:
    backgroundColor: "{colors.lamp}"
    textColor: "{colors.lamp-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0.7rem 1.4rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.moon}"
    rounded: "{rounded.pill}"
    padding: "0.7rem 1.4rem"
  button-draw:
    backgroundColor: "{colors.lamp}"
    textColor: "{colors.lamp-ink}"
    typography: "{typography.headline}"
    rounded: "{rounded.draw}"
    padding: "20px 24px 15px"
    width: "clamp(260px, 21vw, 340px)"
  chip:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.moon}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    height: "44px"
    padding: "0 16px 0 10px"
  chip-hover:
    backgroundColor: "{colors.night-2}"
  button-back:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.moon}"
    rounded: "{rounded.pill}"
    size: "52px"
  dock:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.moon}"
    rounded: "{rounded.dock}"
    padding: "6px"
  dock-item:
    textColor: "{colors.moon}"
    rounded: "{rounded.plaque}"
    width: "74px"
    height: "66px"
  dialog:
    backgroundColor: "{colors.night-1}"
    textColor: "{colors.moon}"
    rounded: "{rounded.dialog}"
    padding: "28px 28px 22px"
    width: "min(420px, calc(100vw - 32px))"
  popover-rates:
    backgroundColor: "{colors.night-1}"
    textColor: "{colors.moon}"
    rounded: "{rounded.dialog}"
    padding: "22px 22px 18px"
    width: "min(300px, calc(100vw - 32px))"
  field-input:
    backgroundColor: "{colors.night-0}"
    textColor: "{colors.moon}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "0.7rem 0.9rem"
  toast:
    backgroundColor: "{colors.night-2}"
    textColor: "{colors.moon}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: "0.75rem 1.4rem"
  nameplate:
    backgroundColor: "{colors.night-0}"
    textColor: "{colors.moon}"
    rounded: "{rounded.plaque}"
    padding: "0.7rem 1.8rem"
---

# Design System: 다섯 빛 공방 (Fivefold Atelier)

## Overview

**Creative North Star: "달빛 아래 룬 각인 의식"**

타이틀(`frontend/index.html`)과 첫 게임 화면(`frontend/game.html`)은 하나의 밤 세계다. 차가운 남색 밤하늘, 흰빛 파랑 오로라, 작은 달, 달빛 받은 남회색 돌. 이 차분한 바탕 위에서 진한 색을 가질 수 있는 것은 다섯 등급 색뿐이고, 따뜻한 빛은 성의 창문, 테라스의 등불, 그리고 UI의 등불 금색에만 있다. 대표 아이템인 마도서는 마법(룬, 봉인, 낱장)으로 말하며, 대장간(망치, 불꽃)으로 말하지 않는다.

화면의 대부분은 Three.js 3D 장면이고, HTML UI는 장면 위 가장자리에 얇게 얹힌다. UI 재질은 두 가지뿐이다. 깊은 남색 반투명 판(가는 선 테두리)과, 화면마다 하나뿐인 주 행동을 위한 등불 금색 판. 두 화면은 "책장 빛"으로 이어진다. 타이틀에서 책 속으로 빨려 들어가면 화면이 책장 빛(`page-light`)으로 가득 차고, 게임 화면은 같은 빛이 걷히며 시작한다.

그림 파일은 하나도 없다. 아이콘은 SVG symbol, 커서와 로딩 별과 장식 별은 CSS 안의 data URI SVG, 하늘·돌·룬·카드는 셰이더와 캔버스로 그린다. 데스크톱 브라우저 전용이다.

**Key Characteristics:**
- 화면 대부분은 밤의 3D 장면, UI는 가장자리의 남색 판과 금색 주 버튼
- 채도 낮은 차가운 밤. 진한 색은 등급 색 다섯 개뿐
- 따뜻한 빛은 창문, 등불, 등불 금색 UI에만
- 오각별과 룬 글자가 반복되는 상징
- 빠르게 시작해 부드럽게 멈추는 한 가지 감속 곡선
- 이미지 파일 없음, 모든 그림은 코드

## Colors

깊은 남색 세 단계와 달빛 글자 두 단계가 바탕을 이루고, 등불 금색이 유일한 UI 강조색이며, 다섯 등급 색은 세계 안에서 가장 진한 색으로 따로 아껴 둔다. 모든 값은 `frontend/css/tokens.css` 한 곳에서 정하고, 3D 장면도 등급 색을 거기서 읽는다.

### Primary
- **등불 금색** (`lamp`): 주 행동 버튼(로그인 창의 확인, 1회 뽑기), 포커스 링(`outline: 2px solid`), 글자 선택 배경, 입력 커서, 판의 가는 금테. 화면에서 가장 먼저 눈에 들어와야 하는 것에만 쓴다.
- **밝은 금빛** (`lamp-hi`): 금색 그러데이션의 위쪽, 1회 뽑기 테두리, 별 장식과 확률 버튼 아이콘.
- **금판 글자** (`lamp-ink`): 금색 판 위의 글자. 금색 위에 흰 글자를 올리지 않는다.

### Secondary: 다섯 등급 색
등급이 오를수록 남색 밤하늘에서 더 튀도록 고른 색. UI(등급 칸, 명판, 확률 목록의 마름모, 메뉴 깃펜 커서)와 3D(룬 띠, 룬 조각, 빛 기둥)가 같은 값을 쓴다.
- **무쇠** (`g1`): 밤하늘에 거의 녹아드는 달빛 은색. 1등급.
- **비취** (`g2`): 남색과 겹치지 않게 초록 쪽으로 민 비취색. 2등급.
- **자수정** (`g3`): 남색과 같은 계열이라 잘 어울리는 보라. 3등급.
- **홍옥** (`g4`): 처음 나오는 따뜻한 색. 4등급.
- **황금** (`g5`): 남색의 정반대라 가장 튀는 색. 5등급은 무지개가 아니라 황금빛이다.

### Tertiary: 책장 빛
- **책장 빛** (`page-light`) / **책장 그늘** (`page-glow`): 타이틀의 입장 빛(`.portal`)과 게임 화면의 시작 막(`.veil`)에만 쓴다. 두 화면이 같은 `radial-gradient(ellipse at 50% 50%, page-light 0%, page-glow 75%, #e2cc9c 100%)`로 끝나고 시작한다. 평소 화면에는 나오지 않는다.

### Neutral
- **가장 깊은 밤** (`night-0`): 바탕, 입력 칸 바탕, 3D가 뜨기 전의 배경 그러데이션 끝.
- **밤 판** (`night-1`): 로그인·회원가입 창, 확률 창.
- **떠 있는 판** (`night-2`): 알림, 버튼과 칩의 hover 바탕.
- **반투명 남색 판** (`panel`): 3D 장면 위에 얹는 판(뒤로가기, 골드, 확률 칩, 기능 메뉴).
- **달빛 선** (`line`): 판의 기본 테두리.
- **달빛** (`moon`): 본문과 제목 글자.
- **옅은 달빛** (`mist`): 보조 글자, 단위, 설명, 쉬고 있는 아이콘.

### Named Rules
**The 등급 색 독점 Rule.** 화면에서 가장 진한 색은 언제나 등급 색이다. 하늘, 돌, 마력 가루, UI 바탕은 채도를 낮게 두고, 새 색을 더할 때 등급 색보다 진하게 만들지 않는다.

**The 금색 하나 Rule.** 등불 금색 판은 화면마다 주 행동 하나에만 쓴다. 나머지 판은 남색이고, 금색은 그 판의 가는 선과 포커스로만 들어간다.

**The 따뜻한 빛 자리 Rule.** 3D 장면에서 따뜻한 빛은 창문(`windowLight`)과 등불(`lanternLight`, `PointLight 0xffc27a`)에만 있다. 대리석, 성벽, 바위는 달빛에 비친 차가운 색으로 둔다.

## Typography

**Display Font:** Diphylleia (with Noto Serif KR, serif)
**Body Font:** Gowun Dodum (with Apple SD Gothic Neo, Malgun Gothic, sans-serif)

**Character:** 붓으로 쓴 듯한 Diphylleia가 제목, 메뉴, 등급 이름, 주 버튼 글자처럼 "의식"의 목소리를 맡고, 둥글고 편한 Gowun Dodum이 숫자, 설명, 알림처럼 "안내"의 목소리를 맡는다. 굵기는 두 글꼴 모두 400 하나뿐이다.

### Hierarchy
- **Display** (400, `clamp(3.2rem, min(7.6vw, 12.5vh), 6rem)`, 1.05): 타이틀의 게임 이름 하나. 등급 색 빛 번짐(`text-shadow`)을 두른다.
- **Headline** (400, `clamp(1.6rem, 2.2vw, 2.1rem)`, 1): 게임 화면 제목("뽑기")과 1회 뽑기 글자, 명판의 등급 이름(`clamp(1.75rem, 2.2vw, 2.4rem)`).
- **Menu** (400, `clamp(1.3rem, min(2vw, 3.2vh), 1.7rem)`, 1.25): 타이틀 메인 메뉴 항목. 쉴 때 투명도 0.55, 고르면 1.
- **Title** (400, 1.35rem~1.65rem, 1.2~1.3): 창 제목(확률 창, 로그인 창).
- **Body** (400, 1rem, 1.4): 골드 숫자, 알림, 입력, 확률 값. 숫자는 `font-variant-numeric: tabular-nums`.
- **Label** (400, 0.875rem~0.9375rem, 1.5): 기능 메뉴 이름, 단위, 설명, 키 안내.

### Named Rules
**The 두 목소리 Rule.** 세계 안의 이름(제목, 메뉴, 등급, 주 행동)은 Diphylleia, 정보(숫자, 설명, 알림, 입력)는 Gowun Dodum. 굵게(`font-weight` 500 이상)나 대문자 변환은 쓰지 않는다.

## Layout

전체 화면 3D 캔버스(`position: fixed; inset: 0`) 위에 UI가 고정 위치로 얹힌다. 페이지는 스크롤하지 않는다(`overflow: hidden`). 가장자리 여백은 화면마다 하나의 `gutter`로 정한다(타이틀 `gutter-title`, 게임 `gutter-game`).

- **타이틀:** 2열 그리드(`minmax(0,1fr) minmax(0,1.25fr)`). 왼쪽 열에 제목, 부제, 메뉴가 세로로 쌓이고, 오른쪽 약 66% 자리에 마도서가 떠 있으며 그 바로 아래 제단 앞에 등급 명판이 선다.
- **게임 화면:** 네 모서리 배치. 위 왼쪽에 원형 뒤로가기, 제목, 금별 선. 위 오른쪽에 골드와 확률 칩. 아래 왼쪽에 기능 메뉴, 아래 오른쪽에 1회 뽑기. 가운데는 3D 장면(카드 다섯 장, 빛 기둥, 마법진)에 비워 둔다.
- 제목이 장면의 밝은 부분(오로라) 위에 오면, 왼쪽에서 오른쪽으로 옅어지는 남색 띠(`rgba(8,10,30,0.72)` → 투명)를 글자 뒤에 깐다.
- 데스크톱 전용이다. CSS에 남아 있는 좁은 화면 규칙(860px / 720px)은 예전 것을 그대로 둔 것이고, 새 화면에서 지켜야 할 기준이 아니다.

## Elevation & Depth

깊이는 세 겹으로 만든다. 3D 장면의 실제 원근과 안개, 그 위 판의 "판 두께" 이중 안쪽 선, 판 아래로 떨어지는 짙은 그림자. 판은 언제나 장면보다 어둡고, 그림자는 아래로 길게 떨어지는 부드러운 음수 확산 그림자뿐이다. 유리 흐림(`backdrop-filter`)은 쓰지 않는다. 빛 번짐(`text-shadow`, `drop-shadow`)은 이 세계의 재료라서 제목, 메뉴, 별 장식, 등급 이름에 쓴다.

### Shadow Vocabulary
- **떠 있는 판** (`box-shadow: 0 8px 20px -10px rgba(0, 0, 0, 0.8)`): 칩, 뒤로가기.
- **판 두께 + 그림자** (`box-shadow: inset 0 0 0 3px rgba(11, 14, 38, 0.55), inset 0 0 0 4px rgba(169, 175, 219, 0.08), 0 16px 34px -14px rgba(0, 0, 0, 0.85)`): 기능 메뉴, 명판. 바깥 금테 안쪽에 어두운 띠와 아주 옅은 달빛 선이 한 겹 더 있다.
- **창** (`box-shadow: 0 30px 80px -24px rgba(0, 0, 0, 0.75)`): 로그인·회원가입 창.
- **등불빛** (`box-shadow: 0 12px 40px -12px rgba(255, 190, 110, 0.5)`): 1회 뽑기 아래 바닥으로 떨어지는 따뜻한 빛. hover에 `0 16px 48px -10px rgba(255,190,110,0.7)`로 커진다.
- **등급 빛** (`text-shadow: 0 0 18px color-mix(in srgb, var(--grade) 60%, transparent)`): 고른 메뉴 항목, 문 열기 글자, 제목. 지금 등급 색을 따라 바뀐다.

### Named Rules
**The 판 두께 Rule.** 주요 판(기능 메뉴, 명판, 확률 창, 1회 뽑기)은 바깥 테두리 안쪽에 3~5px 간격의 이중 안쪽 선을 둬서 두께 있는 판처럼 보이게 한다.

## Shapes

모서리는 모두 둥글다. 작은 것일수록 알약(`pill`), 큰 판일수록 반경이 커진다: 키 표시 `kbd`, 입력 `field`, 명판과 메뉴 칸 `plaque`, 창 `dialog`, 기능 메뉴 `dock`, 1회 뽑기 `draw`. 뒤로가기는 완전한 원이다. 테두리는 언제나 1px 한 줄이고, 판 안의 구분선은 점선(`1px dotted` / `1px dashed`, 달빛 0.2~0.35)이다.

반복되는 형태는 셋이다. **마름모**(45도 돌린 정사각형)는 등급 표시(명판의 등급 칸 13px, 확률 목록 11px). **네 갈래 별**(`--i-spark`)은 금별 선 끝, 1회 뽑기 가장자리 세 개, 확률 칩 아이콘. **오각별**은 브랜드 상징으로 파비콘, 로딩, 마법진, 동전 아이콘에 나온다.

## Components

### Buttons
등불 금색 판은 "지금 할 일", 남색 판은 "다른 곳으로 가기".
- **Shape:** 알약(`pill`). 1회 뽑기만 큰 둥근 판(`draw`).
- **Primary:** 등불 금색 바탕, 금판 글자, Gowun Dodum 1rem. hover에 `filter: brightness(1.08)`, 누르면 `scale(0.97)`.
- **Ghost:** 투명 바탕, 달빛 0.4 테두리, 달빛 글자. 창의 취소 버튼.
- **Focus:** 모든 요소 공통 `outline: 2px solid var(--lamp); outline-offset: 3px`.
- **Disabled:** 투명도 0.6, `cursor: progress`.

### 1회 뽑기 (주 행동)
화면에서 하나뿐인 금색 판. 밝은 금빛 → 등불 금색 → 짙은 금빛으로 내려가는 그러데이션 위에 위쪽 흰 광택(`radial-gradient` `rgba(255,246,226,0.75)`), 밝은 금빛 1px 테두리, 판 두께 이중선, 아래로 떨어지는 등불빛. 위 가운데와 양옆 가운데에 흰빛 네 갈래 별 세 개. 글자는 Diphylleia Headline, 가격은 그 아래 짙은 금색 가는 줄 밑에 Gowun Dodum과 동전 아이콘. hover에 3px 떠오르고 등불빛이 커지며, 뽑는 중(disabled)에는 채도가 조금 빠지고 위 별이 1.2초에 한 바퀴 돈다.

### 칩과 뒤로가기
- **Style:** 반투명 남색 판, 달빛 선 테두리, 높이 44px 알약(골드 표시, 확률 버튼). 뒤로가기는 52px 원.
- **State:** hover와 열린 상태에 바탕이 `night-2`, 테두리가 금색 55%로 바뀐다. 뒤로가기는 hover에 왼쪽으로 3px 물러난다.

### 기능 메뉴 (게임 화면 아래 왼쪽)
반투명 남색 판에 금색 40% 가는 테두리와 판 두께 이중선. 74×66px 칸 네 개(강화, 도감, 상점, 커뮤니티. 거래소는 만들 때 다시 넣는다)에 26px 선 아이콘과 이름, 칸 사이에 달빛 점선. hover에 칸 바탕이 옅은 등불빛(`rgba(255,207,138,0.1)`)이 되고 아이콘이 금색으로 2px 떠오른다.

### 창과 팝오버
- **로그인·회원가입 창:** `night-1` 판, 달빛 0.24 테두리, 창 그림자. 열 때 18px 아래에서 올라오며 `scale(0.98)`에서 커진다. 뒤에 어두운 막(`rgba(4,5,18,0.55)`).
- **확률 창 (popover):** `night-1` 판, 금색 45% 테두리와 금색 18% 안쪽 이중선. 오른쪽 위 기준으로 펼쳐진다. 목록은 등급 색 마름모 + 등급 이름(등급 색) + 확률(tabular-nums), 줄 사이는 달빛 점선. 바깥을 누르거나 Esc로 닫힌다.

### Inputs / Fields
- **Style:** `night-0` 바탕, 달빛 0.3 테두리, `field` 반경, 입력 커서는 등불 금색.
- **Focus:** 테두리가 등불 금색, 바깥으로 3px 금빛 링(`0 0 0 3px rgba(255,207,138,0.18)`).
- **Error:** 창 아래 오류 줄은 높이를 미리 잡아 둬서 글자가 생겨도 창이 들썩이지 않는다.

### 알림 (toast)
아래 가운데 `night-2` 알약. 10~12px 아래에서 떠올라 머물다 사라진다(타이틀 3.2초, 게임 3초). 아직 없는 기능은 이 알림으로 "준비 중"이라고 알린다.

### 메뉴와 깃펜 커서 (타이틀)
메인 메뉴 항목은 Diphylleia Menu, 쉴 때 투명도 0.55. 고른 항목(hover, 포커스, 둘 다 없으면 첫 항목)은 투명도 1로 오른쪽으로 10px 밀리고, 앞쪽 56px 자리로 깃펜 커서(40×12px, `--i-quill` 마스크)가 미끄러져 온다. 깃펜 색은 지금 등급 색을 따라 바뀌고, 키보드로 고른 항목에는 등불 금색 밑줄이 따로 붙는다.

### 등급 명판 (타이틀)
제단 앞에 세운 명판. 위에서 아래로 짙어지는 남색 판(`rgba(20,24,62,0.94)` → `rgba(8,10,28,0.94)`), 금색 38% 1px 테두리, `plaque` 반경, 판 두께 이중선. 왼쪽부터 등급 칸 다섯(마름모, 지금 등급까지 채워짐), "N등급"(mist), 등급 이름(등급 색, Headline 크기). 룬이 새겨지는 순간 등급 이름과 방금 채워진 칸이 크게 찍혔다가(1.32배 / 2.2배) 감속 곡선으로 제자리를 잡는다.

### 움직임 문법
- **감속 곡선:** 거의 모든 움직임은 `cubic-bezier(0.16, 1, 0.3, 1)`(`--ease-out`) 하나로, 빠르게 시작해 부드럽게 멈춘다. 사라질 때만 점점 빨라지는 `cubic-bezier(0.55, 0, 1, 0.45)`.
- **룬 각인 타임라인 (32.4초, 무한 반복):** `:root`의 `forge-cycle` 하나가 CSS 변수(`--level`, `--grade`, `--charge`, `--pulse`, `--burst`, `--finale`, `--spin`, `--reforge`)를 바꾸고, 화면 글자와 3D 장면은 이 값만 읽는다. 1~4등급은 6.8초씩 머문 뒤 오르고(20.99%, 41.98%, 62.96%, 83.95%), 매번 직전 약 1.3초(5등급은 약 1.8초) 동안 룬 조각이 모여든다. 가장 귀한 5등급은 짧고 굵게 약 5초: 85.7~93.5% 빛 기둥과 책 한 바퀴, 94.4~95.9% 완성된 책이 빛을 타고 올라가 보관되고, 95.9%에 1등급으로 돌아가 97.2~99.7% 새 책이 내려온다.
- **책 속으로 입장 (3.6초):** 로그인 후 "게임 시작"(`#enter`)에서 각인 타임라인을 멈추고 `enter-book`이 돈다. 0~0.5초 사슬이 끊어지고 책이 정면으로, 0.5~1.2초 표지가 열리고, 1~2.6초 책장이 점점 빨리 넘어가며, 1.8~3.6초 카메라가 펼친 면 속으로 들어간다. 마지막 0.6초 동안 책장 빛이 점점 빨리 차올라 화면을 채우면 `enter.js`가 게임 화면으로 넘긴다. 페이지 사이는 `@view-transition`으로 이어진다.
- **게임 화면 등장:** 같은 책장 빛 막(`.veil`)이 0.2초 뒤 1.8초 동안 걷히며 밤의 테라스가 드러난다.
- **1회 뽑기 (영상):** 서버가 결과를 정하면 등급에 맞는 영상(1~4등급 일반판 15초, 5등급 황금판 20초)을 틀고, 카드가 멈추는 13.1초(황금판 18.1초)에 결과 명판을 띄운다. 영상이 덮는 동안 3D 장면은 그리지 않는다.
- **움직임 줄이기:** 타이틀은 각인 타임라인을 멈추고 5등급이 다 된 한 장면을 보여 주며, 3D 시간도 멈춘다. 입장은 책이 펼쳐지지 않고 0.6초 동안 책장 빛만 차오른다. 게임 화면의 막은 0.4초에 걷히고, 뽑기는 1초 동안 짧게 빛나기만 하며, 알림은 움직이지 않고 나타났다 사라진다. 장식 별의 반짝임과 회전은 멈춘다.

### 3D 세계
- **하늘:** 카메라를 감싼 구에 셰이더로 그린다. 지평선은 차가운 남회색, 꼭대기는 거의 검은 남색. 지평선 위에 아래 가장자리가 흰빛이고 위로 갈수록 차가운 파랑인 오로라 커튼, 반짝이는 별, 작고 차가운 달. 타이틀에서는 오로라가 지금 등급 색을 20%만 띤다. 두 화면이 같은 `sky.js`를 쓴다.
- **빛과 색감:** `ACESFilmicToneMapping`, 위는 차분한 하늘빛·아래는 짙은 남색인 반구광. 게임 화면은 후처리에서 채도를 조금 뺀다(0.84). 1보다 밝게 정한 작은 면(창문, 등불 심지, 룬, 빛 기둥)만 번진다.
- **룬 띠:** 등급 고리 다섯은 룬 글자가 흐르는 빛의 띠다. 평소에는 혼천의처럼 제각각 돌다가 제 등급의 룬이 새겨지면 수평으로 눕고, 5등급이 되면 다섯 띠 모두 황금빛으로 물든다.
- **룬 조각:** 새기기 직전 책 둘레를 나선으로 돌며 모여들고, 새겨지는 순간 바깥으로 퍼진 뒤 중력 대신 천천히 떠오르며 사라진다.
- **마력 가루:** 점 560개가 셰이더 안에서 천천히 위로 흐르며 깜빡인다. 색은 달빛 흰색, 하늘 파랑, 연보라, 옅은 금빛, 옅은 비취로 모두 옅다. 두 화면이 같은 `dust.js`를 쓴다.

## Do's and Don'ts

### Do:
- **Do** 색은 `frontend/css/tokens.css`의 변수로만 쓰고, 새 화면도 같은 밤 세계(남색 판, 등불 금색, 등급 색) 위에 만든다.
- **Do** 주 행동은 화면마다 하나만 등불 금색 판으로 만들고, 나머지는 반투명 남색 판에 가는 선 테두리로 만든다.
- **Do** 등급을 보여 줄 때는 `g1`~`g5`와 이름(무쇠, 비취, 자수정, 홍옥, 황금)을 짝으로 쓰고, 표시 모양은 마름모로 한다.
- **Do** 움직임은 `cubic-bezier(0.16, 1, 0.3, 1)`을 쓰고, 긴 연출은 CSS 변수 타임라인으로 만들어 3D가 그 값을 읽게 한다.
- **Do** 모든 연출에 `prefers-reduced-motion: reduce` 대안(멈춘 한 장면, 짧은 빛)을 함께 만든다.
- **Do** 아이콘은 `game.html` 아이콘 묶음에 1.7~1.8px 선의 SVG symbol로 추가한다.
- **Do** 숫자(골드, 가격, 확률)는 `tabular-nums`로 쓴다.

### Don't:
- **Don't** PNG, JPG 같은 그림 파일을 쓰지 않는다. 모든 그림은 SVG, 캔버스, 셰이더로 그린다.
- **Don't** 하늘, 돌, 가루, 판에 등급 색보다 진한 색을 쓰지 않는다. 5등급을 무지개색으로 만들지 않는다.
- **Don't** 3D 장면의 대리석, 성벽, 바위에 따뜻한 빛을 두지 않는다. 따뜻한 빛은 창문과 등불에만.
- **Don't** 망치, 불꽃, 대장간으로 연출하지 않는다. 마도서는 룬, 봉인, 낱장으로 말한다.
- **Don't** 판에 유리 흐림(`backdrop-filter`)을 쓰지 않는다.
- **Don't** 금색 판 위에 흰 글자를 쓰지 않는다. 금판 글자(`lamp-ink`)를 쓴다.
- **Don't** 이모지나 글자 기호로 아이콘을 대신하지 않는다.
- **Don't** 책장 빛(`page-light`, `page-glow`)을 화면 전환 밖의 평소 UI에 쓰지 않는다.
