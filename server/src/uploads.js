// 이미지 업로드: 브라우저가 보낸 이미지를 받아(multer) 내용을 검사하고 server/uploads/에 저장한다.
// DB(posts.post_image_url)에는 '/uploads/파일이름' 경로만 넣는다.
// 저장하는 곳을 나중에 클라우드(R2, S3 등)로 옮길 때는 이 파일의 saveImage, removeImage만 바꾸면 된다.
//
// 작동 원리 (이미지가 든 글쓰기 요청 하나의 흐름)
//   1. routes/posts.js: 로그인 확인 → receiveImage가 요청에서 파일을 꺼내 메모리에 둔다 (req.file, 5MB까지)
//   2. isImage: 파일 앞부분의 시그니처로 진짜 JPG, PNG, WebP인지 확인한다
//   3. saveImage: 무작위 이름으로 server/uploads/에 저장하고 '/uploads/이름' 경로를 돌려준다
//   4. routes/posts.js: 그 경로를 posts.post_image_url에 저장한다
//   5. 화면의 <img src="/uploads/이름"> 요청이 오면 serveUploads가 파일을 내려준다 (app.js에서 연결)
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import multer from 'multer';

const UPLOADS_DIR = fileURLToPath(new URL('../uploads', import.meta.url)); // 저장 폴더 (git에 올리지 않음)
mkdirSync(UPLOADS_DIR, { recursive: true }); // 처음 실행할 때 폴더 만들기

const MAX_BYTES = 5 * 1024 * 1024; // 이미지 한 장 상한 (5MB)
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG 파일의 첫 8바이트
const SAVED_PATH = /^\/uploads\/([0-9a-f-]{36}\.(?:jpg|png|webp))$/; // 서버가 저장한 경로 모양 (이 모양만 지운다)

function imageType(buffer) { // 파일 앞부분을 읽어 실제 형식을 알아낸다 (확장자와 브라우저가 보낸 형식은 믿지 않음)
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg'; // JPG는 FF D8 FF로 시작
  if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return 'png'; // PNG는 정해진 8바이트로 시작
  if (buffer.toString('latin1', 0, 4) === 'RIFF' && buffer.toString('latin1', 8, 12) === 'WEBP') return 'webp'; // WebP는 RIFF....WEBP
  return null; // 그 밖의 파일은 받지 않는다
}

export const isImage = (buffer) => imageType(buffer) !== null; // JPG, PNG, WebP이면 true

const upload = multer({ // 메모리로 받아서 검사를 통과한 것만 디스크에 쓴다
  storage: multer.memoryStorage(), // 디스크가 아니라 메모리에 먼저 받는다 (거절한 파일이 폴더에 남지 않게)
  limits: { fileSize: MAX_BYTES, files: 1, fields: 3, parts: 4, fieldSize: 64 * 1024 }, // 이미지 1장 + 제목, 내용, 이미지 빼기 표시 (게시판 글만, 거래글은 이미지를 받지 않음)
}).single('image'); // FormData의 'image' 칸에서 파일 한 개만 받는다

export function receiveImage(req, res, next) { // 요청에서 이미지 한 장 꺼내기 → req.file (JSON 요청은 그냥 지나감)
  upload(req, res, (err) => { // multer 실행 → 끝나면 이 함수가 불린다
    if (!err) return next(); // 문제없으면 다음 단계(글 저장)로
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: '이미지는 5MB까지 올릴 수 있어요' }); // 5MB 초과
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ message: '이미지는 한 장만 올릴 수 있어요' }); // 두 장 이상
    res.status(400).json({ message: '요청 형식이 올바르지 않아요' }); // 깨진 업로드 요청
  });
}

export async function saveImage(buffer) { // 저장하고 DB에 넣을 경로를 돌려준다 (파일 이름은 서버가 무작위로 짓는다)
  const name = `${randomUUID()}.${imageType(buffer)}`; // 겹치지 않는 이름 + 실제 형식의 확장자 (사용자가 정한 파일 이름은 쓰지 않는다)
  await writeFile(path.join(UPLOADS_DIR, name), buffer, { flag: 'wx' }); // 폴더에 쓰기 (wx: 같은 이름이 있으면 덮어쓰지 않고 실패)
  return `/uploads/${name}`; // DB에 넣을 경로
}

export async function removeImage(url) { // 저장한 이미지 지우기 (글은 이미 고쳐졌으니 파일 삭제가 실패해도 요청은 성공으로 둔다)
  const name = url?.match(SAVED_PATH)?.[1]; // 서버가 저장한 모양의 경로에서 파일 이름만 꺼낸다
  if (!name) return; // 이미지가 없거나 모양이 다르면 아무것도 지우지 않는다 (다른 파일을 지우는 사고 방지)
  await rm(path.join(UPLOADS_DIR, name), { force: true }).catch((err) => console.error('이미지 삭제 실패:', err.message)); // 파일 삭제
}

export const serveUploads = express.static(UPLOADS_DIR, { // /uploads/파일이름 으로 이미지 보여 주기
  index: false, // 폴더 목록은 보여 주지 않음
  maxAge: '1d', // 브라우저가 하루 동안 저장해 두고 다시 받지 않는다
  setHeaders(res) { // 올라온 파일이 이미지가 아닌 것으로 해석되거나 스크립트로 실행되지 않게
    res.setHeader('X-Content-Type-Options', 'nosniff'); // 브라우저가 파일 종류를 멋대로 추측하지 못하게
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox"); // 이 주소를 직접 열어도 스크립트가 실행되지 않게
  },
});
