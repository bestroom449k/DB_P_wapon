// 올리기 전 이미지 다듬기: 브라우저에서 긴 변 1600px 안으로 줄이고 WebP로 다시 저장한다.
// 큰 사진도 서버 상한(5MB) 안에 들어오고, 사진에 담긴 촬영 위치(GPS) 같은 정보는 새 파일에 남지 않는다.
const TYPES = ['image/jpeg', 'image/png', 'image/webp']; // 고를 수 있는 형식 (서버 server/src/uploads.js와 같음)
const MAX_PICK = 20 * 1024 * 1024; // 고를 수 있는 원본 크기 (20MB)
const MAX_UPLOAD = 5 * 1024 * 1024; // 다듬은 뒤 서버로 보내는 크기 (5MB)
const MAX_SIDE = 1600; // 긴 변 픽셀
const QUALITY = 0.86; // WebP 화질

export async function prepareImage(file) { // 파일 → 올릴 이미지(Blob). 문제가 있으면 안내 문구로 오류를 던진다
  if (!TYPES.includes(file.type)) throw new Error('JPG, PNG, WebP 이미지만 올릴 수 있어요');
  if (file.size > MAX_PICK) throw new Error('20MB보다 큰 파일은 올릴 수 없어요');

  let bitmap;
  try {
    bitmap = await createImageBitmap(file); // 실제로 그림이 열리는지도 여기서 확인된다
  } catch {
    throw new Error('이미지를 열 수 없어요. 다른 파일을 골라 주세요');
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', QUALITY));
  if (!blob) throw new Error('이미지를 준비하지 못했어요. 다른 파일을 골라 주세요');
  if (blob.size > MAX_UPLOAD) throw new Error('이미지가 너무 커요. 더 작은 이미지를 골라 주세요');
  return blob;
}
