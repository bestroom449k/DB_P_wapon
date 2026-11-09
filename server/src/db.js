// MySQL 연결 풀: 요청마다 새로 연결하지 않고, 미리 만들어 둔 연결을 돌려 쓴다
// 접속 정보는 server/.env 파일에서 읽는다 (비밀번호를 코드에 적지 않기 위해)
import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST ?? '127.0.0.1', // MySQL 서버 주소
  port: Number(process.env.DB_PORT ?? 3306), // MySQL 포트
  user: process.env.DB_USER, // MySQL 사용자
  password: process.env.DB_PASSWORD, // MySQL 비밀번호
  database: process.env.DB_NAME ?? 'weapon_game', // db/schema.sql로 만든 DB
  timezone: '+09:00', // schema.sql 주석대로 한국 시간에 맞춤
  charset: 'utf8mb4', // 한글, 이모지
  supportBigNumbers: true, // BIGINT(골드)를 안전하게 읽기
  connectionLimit: 10, // 동시에 열어 둘 연결 수
});
