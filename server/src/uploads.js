// 이미지 업로드: 브라우저가 보낸 이미지를 받아(multer) 내용을 검사하고 server/uploads/에 저장한다.
// DB(posts.post_image_url)에는 '/uploads/파일이름' 경로만 넣는다.
// 저장하는 곳을 나중에 클라우드(R2, S3 등)로 옮길 때는 이 파일의 saveImage, removeImage만 바꾸면 된다.
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
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return 'png';
  if (buffer.toString('latin1', 0, 4) === 'RIFF' && buffer.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  return null;
}

export const isImage = (buffer) => imageType(buffer) !== null; // JPG, PNG, WebP이면 true

const upload = multer({ // 메모리로 받아서 검사를 통과한 것만 디스크에 쓴다
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1, fields: 3, parts: 4, fieldSize: 64 * 1024 }, // 이미지 1장 + 제목, 내용, 이미지 빼기 표시
}).single('image');

export function receiveImage(req, res, next) { // 요청에서 이미지 한 장 꺼내기 → req.file (JSON 요청은 그냥 지나감)
  upload(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: '이미지는 5MB까지 올릴 수 있어요' });
    if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ message: '이미지는 한 장만 올릴 수 있어요' });
    res.status(400).json({ message: '요청 형식이 올바르지 않아요' }); // 깨진 업로드 요청
  });
}

export async function saveImage(buffer) { // 저장하고 DB에 넣을 경로를 돌려준다 (파일 이름은 서버가 무작위로 짓는다)
  const name = `${randomUUID()}.${imageType(buffer)}`;
  await writeFile(path.join(UPLOADS_DIR, name), buffer, { flag: 'wx' });
  return `/uploads/${name}`;
}

export async function removeImage(url) { // 저장한 이미지 지우기 (글은 이미 고쳐졌으니 파일 삭제가 실패해도 요청은 성공으로 둔다)
  const name = url?.match(SAVED_PATH)?.[1];
  if (!name) return;
  await rm(path.join(UPLOADS_DIR, name), { force: true }).catch((err) => console.error('이미지 삭제 실패:', err.message));
}

export const serveUploads = express.static(UPLOADS_DIR, { // /uploads/파일이름 으로 이미지 보여 주기
  index: false, // 폴더 목록은 보여 주지 않음
  maxAge: '1d',
  setHeaders(res) { // 올라온 파일이 이미지가 아닌 것으로 해석되거나 스크립트로 실행되지 않게
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  },
});
