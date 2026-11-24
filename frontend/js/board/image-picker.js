// 이미지 첨부 칸: 고르거나 끌어다 놓은 이미지를 다듬어(image.js) 미리 보기에 올리고, 올릴 때 FormData에 넣는다.
// 게시판 글쓰기(js/board/main.js)가 쓴다 (거래소 거래글에는 이미지를 붙이지 않는다). 디자인은 css/post.css.
// 페이지에 이 id의 칸이 있어야 한다: imageField, imageInput, imagePicker, imagePicked, imagePreview, imageRemove
import { $ } from '../shared/page.js';
import { prepareImage } from './image.js';

const dragsFile = (event) => event.dataTransfer?.types.includes('Files'); // 파일을 끄는 중인지 (글자를 끌어 옮기는 것은 그대로 둔다)

// form: 끌어다 놓기를 받을 폼, showError(문구): 폼의 오류 줄에 쓰기, setBusy(참/거짓): 이미지를 다듬는 동안 올리기 버튼 잠그기
export function createImagePicker({ form, showError, setBusy }) {
  let picked = null; // 새로 고른 이미지 (올리기 전)
  let removed = false; // 이미 붙어 있던 이미지를 "빼기"로 뺐는지
  let previewUrl = null; // 미리 보기용 임시 주소
  let token = 0; // 이미지를 다듬는 사이에 다시 고르거나 화면을 옮기면 앞의 결과를 버린다

  function setPreview(src) { // 이미지가 있으면 미리 보기, 없으면 고르는 칸
    if (previewUrl) URL.revokeObjectURL(previewUrl); // 이전 미리 보기가 쓰던 메모리 돌려주기
    previewUrl = src?.startsWith('blob:') ? src : null; // 브라우저 임시 주소(blob:)만 기억해 뒀다가 나중에 해제
    if (src) $('imagePreview').src = src;
    else $('imagePreview').removeAttribute('src');
    $('imagePicked').hidden = !src; // 미리 보기 칸
    $('imagePicker').hidden = Boolean(src); // 고르는 칸
  }

  function reset(saved = null) { // 첨부 칸 처음 상태로 (saved: 고치는 글에 이미 있는 이미지)
    token++; // 다듬는 중인 이미지가 있으면 그 결과를 버린다
    picked = null;
    removed = false;
    $('imageInput').value = '';
    setPreview(saved);
    setBusy(false);
  }

  async function pick(file) { // 고른 이미지를 다듬어 미리 보기에 올린다 (실패하면 이전 이미지는 그대로)
    const mine = ++token; // 이번 선택의 번호
    showError('');
    setBusy(true); // 다듬는 동안은 올리기 버튼을 잠근다
    try {
      const blob = await prepareImage(file); // image.js: 크기를 줄이고 WebP로 다시 저장
      if (mine !== token) return; // 그사이 다른 이미지를 골랐으면 버린다
      picked = blob; // 올리기를 누를 때 보낼 이미지
      setPreview(URL.createObjectURL(blob)); // 서버에 보내기 전에 브라우저 안에서 미리 보기
    } catch (err) {
      if (mine === token) showError(err.message);
    } finally {
      if (mine === token) setBusy(false);
      $('imageInput').value = ''; // 같은 파일을 다시 골라도 동작하게
    }
  }

  $('imageInput').addEventListener('change', () => {
    const file = $('imageInput').files[0]; // 파일 선택 창에서 고른 파일
    if (file) pick(file);
  });

  $('imageRemove').addEventListener('click', () => {
    reset();
    removed = true; // 올릴 때 서버에 removeImage=1을 보낸다
    $('imageInput').focus();
  });

  // 폼 어디에든 파일을 끌어다 놓으면 첨부한다
  form.addEventListener('dragover', (event) => {
    if (!dragsFile(event)) return; // 파일이 아니면(글자 끌기) 그대로 둔다
    event.preventDefault(); // 브라우저가 파일을 열어 버리지 않게
    $('imagePicker').classList.add('is-over'); // 놓을 수 있다고 칸을 밝힌다
  });

  form.addEventListener('dragleave', (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) $('imagePicker').classList.remove('is-over'); // 폼 밖으로 나갔을 때만 끈다
  });

  form.addEventListener('drop', (event) => {
    if (!dragsFile(event)) return; // 파일이 아니면(글자 끌기) 그대로 둔다
    event.preventDefault(); // 브라우저가 파일을 열어 버리지 않게
    $('imagePicker').classList.remove('is-over');
    if ($('imageField').inert) return; // 글을 올리는 중
    const { files } = event.dataTransfer;
    if (files.length > 1) showError('이미지는 한 장만 올릴 수 있어요');
    else if (files[0]) pick(files[0]);
  });

  return {
    reset,
    appendTo(body) { // 올릴 FormData에 이미지 넣기
      if (picked) body.append('image', picked, 'image'); // 새 이미지가 있을 때만 파일을 넣는다
      else if (removed) body.append('removeImage', '1'); // "빼기"를 눌렀으면 서버에 알린다 (아무것도 안 보내면 기존 이미지 유지)
    },
    lock(locked) { // 올리는 동안 이미지를 바꾸지 못하게
      $('imageField').inert = locked;
    },
  };
}
