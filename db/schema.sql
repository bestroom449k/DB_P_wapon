-- =====================================================
-- 무기 뽑기 및 판매 게임 DB (6개 테이블, MySQL 8.0.16 이상)
--
-- [구조]
--   DB에는 유저 데이터만 저장
--   무기 목록(이름·등급·가격·이미지)·등급 확률·강화 규칙 → Node 서버의 gameData.json
--   채팅 → 소켓으로만 주고받고 저장 안 함
--   인벤토리 = user_weapons     (지금 가진 검 하나하나)
--   도감     = user_collection  (한 번이라도 얻은 검 기록)
--   장착     = users.equipped_user_weapon_id
--
-- [자주 나오는 문법]
--   INT / BIGINT          정수 (INT 약 21억까지, BIGINT 훨씬 큼)
--   TINYINT UNSIGNED      0~255 작은 정수 (UNSIGNED = 음수 없음)
--   VARCHAR(n)            최대 n글자 문자열 (한글도 1글자 = 1)
--   TEXT                  긴 글 (최대 약 6만 5천 바이트)
--   DATETIME              날짜+시간 (예: 2026-11-09 08:43:00), 시간대 정보는 저장 안 됨
--   ENUM('A','B')         정해진 값 중 하나만 허용
--   NOT NULL              비워둘 수 없음
--   NULL                  비워둘 수 있음 (값이 없음을 뜻함)
--   DEFAULT x             INSERT 때 값을 안 주면 x로 채움
--   DEFAULT CURRENT_TIMESTAMP  INSERT 때 값을 안 주면 그 순간의 시각으로 채움
--   AUTO_INCREMENT        INSERT 때마다 1, 2, 3 … 자동으로 번호 매김
--   PRIMARY KEY (PK)      행을 구분하는 고유 번호 (중복·NULL 불가)
--   UNIQUE                중복 불가
--   FOREIGN KEY (FK)      다른 테이블에 실제로 있는 값만 넣을 수 있음
--   INDEX                 검색을 빠르게 하는 목차
--   CHECK                 값이 조건을 만족해야만 저장됨
--
-- [시간대 주의]
--   DATETIME은 시간대 없이 저장되고 CURRENT_TIMESTAMP는 DB 서버 시간대를 따름
--   → MySQL 서버 시간대와 Node(mysql2) 연결 옵션의 timezone을 둘 다 '+09:00'으로 맞출 것
--
-- [template_id]
--   gameData.json의 weapons[].id 값
--   DB에 무기 목록이 없어서 FK를 걸 수 없음 → 서버에서 존재 여부를 확인하고,
--   JSON에서 이미 쓴 id는 지우거나 바꾸지 말 것
-- =====================================================

-- DROP DATABASE IF EXISTS weapon_game;  -- 처음부터 다시 만들 때만 주석 해제 (데이터 전부 삭제됨)

CREATE DATABASE IF NOT EXISTS weapon_game -- DB가 없을 때만 새로 만듦
DEFAULT CHARACTER SET utf8mb4;
-- 한글·이모지까지 저장 가능한 문자 인코딩

USE weapon_game;
-- 이후 명령은 이 DB에 실행

-- =====================================================
-- 1. 회원
-- =====================================================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY, -- 회원 번호 (자동 1, 2, 3 …)
    login_id VARCHAR(30) NOT NULL UNIQUE, -- 로그인 아이디, 중복 불가
    password_hash VARCHAR(255) NOT NULL, -- 비밀번호를 bcrypt 등으로 암호화한 값 (원문 저장 금지)
    nickname VARCHAR(30) NOT NULL UNIQUE, -- 게임에 표시되는 이름, 중복 불가
    gold_balance BIGINT UNSIGNED NOT NULL DEFAULT 10000, -- 보유 골드, 가입 시 10000
    --   UNSIGNED라 0 밑으로 빼려 하면 에러 → 잔액 부족 안전장치
    equipped_user_weapon_id BIGINT NULL, -- 지금 장착 중인 검의 인벤토리 번호 (NULL = 장착 안 함)
    --   FK는 맨 아래 ALTER TABLE에서 추가
    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 가입 시각, INSERT 때 자동으로 그 순간 시각
    updated_at DATETIME NULL -- 닉네임·비밀번호를 바꾼 시각 (안 바꿨으면 NULL)
    --   서버에서 직접 NOW()로 넣음
    --   ON UPDATE CURRENT_TIMESTAMP를 안 쓴 이유:
    --   골드·장착이 바뀔 때마다 이 값도 바뀌어 버림
);

-- =====================================================
-- 2. 인벤토리 (지금 가진 검 하나하나)
--    서버에서 트랜잭션으로 확인할 규칙:
--      강화는 장착 중인 검만 가능
--      거래 중(ACTIVE)인 검은 장착·강화·상점 판매 불가
--      장착 중인 검은 거래 등록·상점 판매 불가 (먼저 장착 해제)
-- =====================================================
CREATE TABLE user_weapons (
    user_weapon_id BIGINT AUTO_INCREMENT PRIMARY KEY, -- 인벤토리 번호 (검 한 자루마다 하나)
    owner_user_id INT NOT NULL, -- 지금 주인의 회원 번호 (거래하면 바뀜)
    template_id INT NOT NULL, -- 어떤 검인지 = gameData.json의 무기 id
    --   이름·이미지·등급은 JSON에서 이 id로 찾음
    enhance_level TINYINT UNSIGNED NOT NULL DEFAULT 0, -- 현재 강화 단계, 뽑았을 때 0
    weapon_status ENUM('OWNED', 'SOLD_TO_SHOP') -- OWNED = 가지고 있음
    NOT NULL DEFAULT 'OWNED', -- SOLD_TO_SHOP = 상점에 팔아서 없어짐 (기록용으로 행은 남김)
    obtained_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 뽑은 시각, INSERT 때 자동
    FOREIGN KEY (owner_user_id) REFERENCES users (user_id), -- 실제 있는 회원만 주인이 될 수 있음
    UNIQUE KEY uq_owner_weapon (owner_user_id, user_weapon_id), -- users의 장착 FK가 (주인, 검) 쌍을 참조하려면 필요
    INDEX idx_owner_status (owner_user_id, weapon_status) -- "내 인벤토리에서 가진 검만" 조회를 빠르게
);

-- =====================================================
-- 3. 도감 (한 번이라도 얻은 검 기록)
--    거래로 주인이 바뀌거나 상점에 팔아도 기록이 남아야 해서 인벤토리와 별도
-- =====================================================
CREATE TABLE user_collection (
    user_id INT NOT NULL, -- 회원 번호
    template_id INT NOT NULL, -- 어떤 검인지 = gameData.json의 무기 id
    first_obtained_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 이 검을 처음 얻은 시각
    --   서버는 처음 얻을 때만 INSERT (이미 있으면 그대로 둠)
    max_enhance_level TINYINT UNSIGNED NOT NULL DEFAULT 0, -- 이 검으로 달성한 최고 강화 단계
    --   강화 성공 시 서버에서 더 높을 때만 갱신
    PRIMARY KEY (user_id, template_id), -- 회원 한 명당 같은 검은 도감에 한 줄만
    FOREIGN KEY (user_id) REFERENCES users (user_id) -- 실제 있는 회원만
);

-- =====================================================
-- 4. 게시글 (자유글·거래글 공통)
--    거래글이면 trades 테이블에 같은 post_id 행이 하나 더 있음
-- =====================================================
CREATE TABLE posts (
    post_id BIGINT AUTO_INCREMENT PRIMARY KEY, -- 글 번호
    writer_user_id INT NOT NULL, -- 작성자 회원 번호 (거래글이면 판매자)
    post_title VARCHAR(100) NOT NULL, -- 제목, 최대 100글자
    post_content TEXT NOT NULL, -- 본문
    post_image_url VARCHAR(255), -- 첨부 이미지 경로 (없으면 NULL)
    --   URL 전체 대신 '/uploads/abc.png' 같은 경로만 저장 권장
    view_count INT UNSIGNED NOT NULL DEFAULT 0, -- 조회수, 처음 0
    written_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 작성 시각, INSERT 때 자동
    edited_at DATETIME NULL, -- 글을 수정한 시각 (수정 안 했으면 NULL)
    --   서버에서 NOW()로 넣음
    --   ON UPDATE를 안 쓴 이유: 조회수만 올라도 바뀌어 버림
    deleted_at DATETIME NULL, -- 삭제한 시각 (NULL = 삭제 안 됨)
    --   실제로 지우지 않고 시각만 기록 (소프트 삭제)
    --   목록 조회 시 WHERE deleted_at IS NULL
    FOREIGN KEY (writer_user_id) REFERENCES users (user_id), -- 실제 있는 회원만 작성자
    INDEX idx_written (written_at) -- 최신글 순 정렬을 빠르게
);

-- =====================================================
-- 5. 댓글 (자유글·거래글 공용)
-- =====================================================
CREATE TABLE comments (
    comment_id BIGINT AUTO_INCREMENT PRIMARY KEY, -- 댓글 번호
    post_id BIGINT NOT NULL, -- 어느 글에 달린 댓글인지
    writer_user_id INT NOT NULL, -- 작성자 회원 번호
    comment_content VARCHAR(500) NOT NULL, -- 댓글 내용, 최대 500글자
    written_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- 작성 시각, INSERT 때 자동
    deleted_at DATETIME NULL, -- 삭제한 시각 (NULL = 삭제 안 됨, 소프트 삭제)
    FOREIGN KEY (post_id) REFERENCES posts (post_id), -- 실제 있는 글에만
    FOREIGN KEY (writer_user_id) REFERENCES users (user_id), -- 실제 있는 회원만
    INDEX idx_post_written (post_id, written_at) -- "이 글의 댓글을 시간순으로" 조회를 빠르게
);

-- =====================================================
-- 6. 거래 내역 (거래글 = posts 한 줄 + 이 테이블 한 줄)
--    판매자는 posts.writer_user_id
--    서버에서 트랜잭션(SELECT ... FOR UPDATE)으로 확인할 규칙:
--      등록 시 글쓴이 = 무기 주인, 무기가 OWNED, 장착 중이 아님
--      구매 시 구매자 ≠ 판매자, 구매자 골드 충분
-- =====================================================
CREATE TABLE trades (
    post_id BIGINT PRIMARY KEY, -- 거래글 번호 = posts.post_id (AUTO_INCREMENT 아님)
    user_weapon_id BIGINT NOT NULL, -- 파는 검의 인벤토리 번호
    listed_enhance_level TINYINT UNSIGNED NOT NULL, -- 등록할 때의 강화 단계
    --   팔린 뒤 구매자가 강화해도 거래 당시 기록이 남도록
    sale_price BIGINT UNSIGNED NOT NULL, -- 판매 가격 (골드)
    trade_status ENUM('ACTIVE', 'SOLD', 'CANCELLED') -- ACTIVE = 판매 중, SOLD = 팔림, CANCELLED = 판매 취소
    NOT NULL DEFAULT 'ACTIVE', -- 등록하면 판매 중
    buyer_user_id INT NULL, -- 구매자 회원 번호 (팔리기 전엔 NULL)
    sold_at DATETIME NULL, -- 팔린 시각 (팔리기 전엔 NULL)
    --   DEFAULT CURRENT_TIMESTAMP를 안 쓴 이유: 등록 시각이 아니라 팔린 시각이라서
    active_weapon_id BIGINT AS ( -- 자동 계산 컬럼 (직접 넣지 않음)
        IF(
            trade_status = 'ACTIVE',
            user_weapon_id,
            NULL
        ) -- 판매 중이면 검 번호, 아니면 NULL
    ) STORED,
    UNIQUE KEY uq_active_weapon (active_weapon_id), -- 같은 검이 동시에 두 번 판매 중이 되지 않게
    --   (NULL은 여러 개여도 UNIQUE에 안 걸림)
    CONSTRAINT chk_sale_price CHECK (sale_price > 0), -- 0골드 판매 금지
    CONSTRAINT chk_sold_info CHECK ( -- 팔렸으면 구매자·판매 시각이 반드시 있고,
        (
            trade_status = 'SOLD'
            AND buyer_user_id IS NOT NULL
            AND sold_at IS NOT NULL
        )
        OR (
            trade_status <> 'SOLD'
            AND buyer_user_id IS NULL
            AND sold_at IS NULL
        )
    ), -- 안 팔렸으면 둘 다 비어 있어야 함
    FOREIGN KEY (post_id) REFERENCES posts (post_id), -- 실제 있는 글만
    FOREIGN KEY (user_weapon_id) REFERENCES user_weapons (user_weapon_id), -- 실제 있는 검만
    FOREIGN KEY (buyer_user_id) REFERENCES users (user_id), -- 실제 있는 회원만 구매자
    INDEX idx_status (trade_status) -- "판매 중인 거래만" 조회를 빠르게
);

-- =====================================================
-- 장착 FK
--   users와 user_weapons가 서로를 참조해서 테이블을 다 만든 뒤 추가
--   (회원 번호, 장착 검)이 인벤토리의 (주인, 검)과 일치해야 함
--     → 남의 검은 장착 불가
--     → 장착 중인 검은 주인을 바꿀 수 없음 (거래 완료 전에 장착 해제가 강제됨)
--   equipped_user_weapon_id가 NULL이면 검사하지 않음 (장착 안 한 상태)
-- =====================================================
ALTER TABLE users
ADD CONSTRAINT fk_users_equipped FOREIGN KEY (
    user_id,
    equipped_user_weapon_id
) REFERENCES user_weapons (owner_user_id, user_weapon_id);