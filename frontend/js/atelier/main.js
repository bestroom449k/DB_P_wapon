// 공방 화면: 주소 뒤 # 부분으로 세 화면을 오간다 (위쪽 탭)
//   #/collection  도감: 게임에 나오는 마도서 선반 (못 만난 마도서는 잠긴 칸)
//   #/enhance     강화: 장착한 마도서를 작업대에 올려 룬을 새긴다, 아래는 내 마도서 목록과 장착
//   #/shop        상점: 내 마도서를 지금 가치대로 판다 (한 번 묻고 팔기, 장착 중이면 먼저 풀기)
// 서버 API는 server/src/routes/collection.js, server/src/routes/inventory.js. 로그인해야 내용이 보인다.
// 강화에 실패하면 골드만 쓰고 단계는 그대로다 (서버가 정함).
import { api } from '../shared/api.js';
import { $, el, count, timeTag, showToast, askConfirm } from '../shared/page.js';

const views = { collection: $('viewCollection'), enhance: $('viewEnhance'), shop: $('viewShop') };
const tabs = { collection: $('tabCollection'), enhance: $('tabEnhance'), shop: $('tabShop') };
const TITLES = { collection: '도감', enhance: '강화', shop: '상점' };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const ENGRAVE_MS = 1100; // 룬을 새기는 연출 길이 (atelier.css의 ring-spin과 같다)
const LEAVE_MS = 350; // 판 마도서 줄이 사라지는 길이 (atelier.css의 row-leave와 같다)

let loggedIn = false;
let inventory = null; // { gold, maxLevel, items } (강화, 상점 화면이 같이 쓴다. 화면을 열 때마다 새로 받는다)
let renderToken = 0; // 늦게 도착한 응답이 다른 화면을 덮어쓰지 않게 매번 올린다

// ---------- 공통 ----------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const gradeColor = (grade) => `var(--g${grade})`;
const withObject = (word) => { // 받침에 맞는 을/를 ("마도서를")
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return `${word}${code >= 0 && code < 11172 && code % 28 ? '을' : '를'}`;
};

function renderWho(gold) { // 위 오른쪽: 골드, 로그인 전이면 로그인 링크
  const who = $('who');
  if (loggedIn) {
    who.replaceChildren(el('span', 'who__name', count(gold)), ' 골드');
    return;
  }
  const link = el('a', '', '로그인');
  link.href = 'index.html#login';
  who.replaceChildren('로그인 전 · ', link);
}

let firstShow = true;

function show(name) { // 세 화면 중 하나만 보이게, 탭 표시
  if (firstShow) { // 처음 열 때는 탭 표시가 서서히 켜지지 않고 바로 보이게
    const nav = tabs.collection.parentElement;
    nav.classList.add('is-instant');
    requestAnimationFrame(() => requestAnimationFrame(() => nav.classList.remove('is-instant')));
    firstShow = false;
  }
  for (const [key, view] of Object.entries(views)) view.hidden = key !== name;
  for (const [key, tab] of Object.entries(tabs)) {
    if (key === name) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  }
  document.title = `${TITLES[name]} · 다섯 빛 공방`;
}

function bookCover(grade, locked = false) { // 마도서 표지 (그림은 atelier.css)
  const book = el('div', locked ? 'book is-locked' : 'book');
  book.style.setProperty('--c', gradeColor(grade));
  book.setAttribute('aria-hidden', 'true');
  book.append(el('span', 'book__ring'), locked ? el('span', 'book__mark', '?') : el('span', 'book__star'));
  return book;
}

function gradeLine(grade, gradeName, line = el('p', 'grade-line')) { // 등급 색 마름모 + "N등급 이름"
  line.style.setProperty('--c', gradeColor(grade));
  line.replaceChildren(`${grade}등급 `, el('b', '', gradeName));
  return line;
}

function starRow(level, max, small = false) { // 강화 단계 별 (켜진 별 = 지금 단계)
  const row = el('span', small ? 'stars stars--small' : 'stars');
  row.setAttribute('role', 'img');
  row.setAttribute('aria-label', `강화 +${level}, 최대 +${max}`);
  for (let i = 0; i < max; i++) row.append(el('span', i < level ? 'star is-on' : 'star'));
  return row;
}

function bookRow(item, value, ...actions) { // 내 마도서 한 줄 (강화 목록, 상점 목록): 표지, 이름·등급·별, 값, 오른쪽 버튼
  const row = el('li', item.equipped ? 'inv-row is-equipped' : 'inv-row');
  const info = el('div', 'inv-row__info');
  const line = el('div', 'inv-row__line');
  line.append(gradeLine(item.grade, item.gradeName), starRow(item.level, inventory.maxLevel, true));
  info.append(el('h4', 'inv-row__name', item.name), line);
  const act = el('div', 'inv-row__act');
  act.append(...actions);
  row.append(bookCover(item.grade), info, value, act);
  return row;
}

function smallButton(label, onClick) { // 줄 오른쪽의 작은 남색 버튼
  const button = el('button', 'btn btn--ghost btn--small', label);
  button.type = 'button';
  button.addEventListener('click', () => onClick(button));
  return button;
}

function viewNote(prefix, text, action = null) { // 판 대신 안내 (로그인 전, 마도서가 없을 때, 오류): prefix = 'bench' | 'shop'
  $(`${prefix}Note`).hidden = false;
  $(`${prefix}NoteText`).textContent = text;
  const link = $(`${prefix}NoteAction`);
  link.hidden = !action;
  if (action) {
    link.textContent = action.label;
    link.href = action.href;
    link.className = `btn ${action.lamp ? 'btn--lamp' : 'btn--ghost'}`;
  }
}

// ---------- 도감 ----------

function shelfItem(entry) { // 선반의 마도서 한 권
  const item = el('li', entry.owned ? 'shelf-item' : 'shelf-item is-locked');
  item.append(bookCover(entry.grade, !entry.owned), gradeLine(entry.grade, entry.gradeName));
  if (entry.owned) {
    item.append(el('h3', 'shelf-item__name', entry.name));
    const first = el('span', '', '처음 얻은 날 ');
    first.append(timeTag(entry.firstObtainedAt));
    const meta = el('p', 'meta');
    meta.append(first, el('span', '', `최고 +${entry.maxLevel}`));
    item.append(meta, el('p', 'shelf-item__desc', entry.description));
  } else {
    item.append(el('h3', 'shelf-item__name', '???'), el('p', 'meta', '아직 만나지 못한 마도서'));
  }
  return item;
}

async function renderCollection() {
  show('collection');
  const token = ++renderToken;
  $('shelf').replaceChildren();
  $('collectionNote').hidden = true;
  $('collectionCount').textContent = '도감을 불러오는 중이에요';
  try {
    const { entries } = await api('/collection');
    if (token !== renderToken) return;
    const owned = entries.filter((entry) => entry.owned).length;
    $('collectionCount').replaceChildren('모은 마도서 ', el('b', '', count(owned)), ` / ${count(entries.length)}권`);
    $('shelf').replaceChildren(...entries.map(shelfItem));
    if (!loggedIn) {
      $('collectionNote').hidden = false;
      $('collectionNoteText').textContent = '로그인하면 내가 모은 마도서가 보여요.';
      $('collectionLogin').hidden = false;
    }
  } catch (err) {
    if (token !== renderToken) return;
    $('collectionCount').textContent = '';
    $('collectionNote').hidden = false;
    $('collectionNoteText').textContent = err.message;
    $('collectionLogin').hidden = true;
  }
}

// ---------- 강화 ----------

function benchNote(text, action = null) { // 작업대 대신 안내 (로그인 전, 마도서가 없을 때, 장착 전, 오류)
  $('benchBody').hidden = true;
  viewNote('bench', text, action);
}

function drawBench() { // 작업대: 장착한 마도서와 다음 단계 정보
  const item = inventory.items.find((it) => it.equipped);
  if (!inventory.items.length) {
    benchNote('아직 마도서가 없어요. 게임 화면에서 뽑기를 해 보세요.', { label: '뽑기 하러 가기', href: 'game.html' });
    return;
  }
  if (!item) {
    benchNote('아래 목록에서 강화할 마도서를 장착해 주세요.');
    return;
  }
  $('benchNote').hidden = true;
  $('benchBody').hidden = false;
  $('benchBook').replaceChildren(bookCover(item.grade));
  gradeLine(item.grade, item.gradeName, $('benchGrade'));
  $('benchName').textContent = item.name;
  $('benchStars').replaceChildren(starRow(item.level, inventory.maxLevel));

  const { next } = item;
  const button = $('enhanceButton');
  const result = $('benchResult');
  result.className = 'bench__result';
  result.textContent = '';
  if (!next) {
    $('statChance').textContent = '-';
    $('statCost').textContent = '-';
    $('statValue').textContent = count(item.value);
    button.disabled = true;
    button.textContent = '가장 높은 단계예요';
    return;
  }
  $('statChance').textContent = `${next.successPct}%`;
  $('statCost').textContent = `${count(next.cost)} 골드`;
  $('statValue').textContent = `${count(item.value)} → ${count(next.value)}`;
  button.textContent = '룬 새기기';
  button.disabled = inventory.gold < next.cost;
  if (button.disabled) result.textContent = `골드가 부족해요 (${count(next.cost)}골드 필요)`;
}

function inventoryRow(item) { // 강화 목록의 한 줄: 가치와 장착 버튼
  const value = el('span', 'inv-row__value', `가치 ${count(item.value)}`);
  return bookRow(item, value, item.equipped ? el('span', 'inv-row__badge', '장착 중') : smallButton('장착', (button) => equipItem(item, button)));
}

function drawInventory() {
  $('inventorySheet').hidden = !inventory.items.length;
  $('inventoryCount').textContent = `${count(inventory.items.length)}권`;
  $('inventory').replaceChildren(...inventory.items.map(inventoryRow));
}

async function renderEnhance() {
  show('enhance');
  const token = ++renderToken;
  benchNote('작업대를 준비하는 중이에요');
  $('inventorySheet').hidden = true;
  if (!loggedIn) {
    benchNote('로그인하면 내 마도서를 강화할 수 있어요.', { label: '로그인하러 가기', href: 'index.html#login', lamp: true });
    return;
  }
  try {
    const data = await api('/inventory');
    if (token !== renderToken) return;
    inventory = data;
    renderWho(data.gold);
    drawBench();
    drawInventory();
  } catch (err) {
    if (token !== renderToken) return;
    benchNote(err.message);
  }
}

async function equipItem(item, button) { // 장착하기
  button.disabled = true;
  try {
    await api(`/inventory/${item.userWeaponId}/equip`, { method: 'POST' });
    for (const it of inventory.items) it.equipped = it.userWeaponId === item.userWeaponId;
    drawBench();
    drawInventory();
    showToast(`${withObject(item.name)} 장착했어요`);
  } catch (err) {
    button.disabled = false;
    showToast(err.message);
  }
}

$('enhanceButton').addEventListener('click', async () => { // 룬 새기기
  const button = $('enhanceButton');
  const result = $('benchResult');
  button.disabled = true;
  $('inventory').inert = true; // 새기는 동안 다른 마도서로 바꾸지 못하게
  result.className = 'bench__result';
  result.textContent = '룬을 새기는 중이에요';
  const wait = reduceMotion.matches ? 0 : ENGRAVE_MS;
  $('benchBook').firstElementChild.classList.add('is-engraving');
  const started = performance.now();

  let data = null;
  let error = null;
  try {
    data = await api('/inventory/enhance', { method: 'POST' });
  } catch (err) {
    error = err;
  }
  await sleep(Math.max(0, wait - (performance.now() - started))); // 연출이 끝날 때까지 기다렸다가 결과를 보여 준다
  $('inventory').inert = false;

  if (error) { // 다른 창에서 골드나 장착이 바뀌었을 수 있어 목록을 다시 받아 온다
    try {
      inventory = await api('/inventory');
      renderWho(inventory.gold);
      drawInventory();
    } catch {}
    drawBench();
    $('benchResult').textContent = error.message;
    return;
  }
  inventory.gold = data.gold;
  inventory.items = inventory.items.map((it) => (it.userWeaponId === data.item.userWeaponId ? data.item : it));
  renderWho(data.gold);
  drawBench();
  drawInventory();

  const book = $('benchBook').firstElementChild;
  const after = $('benchResult');
  if (data.success) {
    book.classList.add('is-success');
    $('benchStars').querySelectorAll('.star.is-on')[data.item.level - 1]?.classList.add('is-pop');
    after.className = 'bench__result is-success';
    after.textContent = `룬을 새겼어요! 이제 +${data.item.level} 단계예요.`;
  } else {
    book.classList.add('is-fail');
    after.className = 'bench__result';
    after.textContent = '룬이 흩어졌어요. 골드만 쓰고 단계는 그대로예요.';
  }
});

// ---------- 상점 ----------

function shopNote(text, action = null) { // 목록 대신 안내 (로그인 전, 마도서가 없을 때, 오류)
  $('shopLead').hidden = true;
  $('shopList').replaceChildren();
  viewNote('shop', text, action);
}

function shopRow(item) { // 상점 목록의 한 줄: 판매 가격과 팔기 (장착 중이면 먼저 풀기)
  const price = el('span', 'inv-row__price');
  price.append(el('b', '', count(item.value)), ' 골드');
  if (item.equipped) {
    return bookRow(item, price, el('span', 'inv-row__badge', '장착 중'), smallButton('장착 풀기', unequipItem));
  }
  return bookRow(item, price, smallButton('팔기', (button) => sellItem(item, button)));
}

function drawShop() {
  if (!inventory.items.length) {
    $('shopCount').textContent = '';
    shopNote('팔 마도서가 없어요. 게임 화면에서 뽑기를 해 보세요.', { label: '뽑기 하러 가기', href: 'game.html' });
    return;
  }
  $('shopNote').hidden = true;
  $('shopLead').hidden = false;
  $('shopCount').textContent = `내 마도서 ${count(inventory.items.length)}권`;
  $('shopList').replaceChildren(...inventory.items.map(shopRow));
}

async function reloadShop() { // 다른 창에서 팔거나 장착을 바꿨을 수 있을 때 목록을 다시 받아 온다
  try {
    inventory = await api('/inventory');
    renderWho(inventory.gold);
    drawShop();
  } catch {}
}

async function renderShop() {
  show('shop');
  const token = ++renderToken;
  $('shopCount').textContent = '상점을 여는 중이에요';
  $('shopLead').hidden = true;
  $('shopList').replaceChildren();
  $('shopNote').hidden = true;
  if (!loggedIn) {
    $('shopCount').textContent = '';
    shopNote('로그인하면 내 마도서를 팔 수 있어요.', { label: '로그인하러 가기', href: 'index.html#login', lamp: true });
    return;
  }
  try {
    const data = await api('/inventory');
    if (token !== renderToken) return;
    inventory = data;
    renderWho(data.gold);
    drawShop();
  } catch (err) {
    if (token !== renderToken) return;
    $('shopCount').textContent = '';
    shopNote(err.message);
  }
}

async function sellItem(item, button) { // 팔기: 한 번 묻고, 서버가 지금 가치만큼 골드를 준다
  const ok = await askConfirm({
    title: `${withObject(item.name)} 팔까요?`,
    text: `${count(item.value)}골드를 받아요. 판 마도서는 돌아오지 않지만 도감 기록은 남아요.`,
    ok: '팔기',
  });
  if (!ok) return;
  button.disabled = true;
  let data;
  try {
    data = await api(`/inventory/${item.userWeaponId}/sell`, { method: 'POST' });
  } catch (err) {
    showToast(err.message);
    await reloadShop();
    return;
  }
  inventory.gold = data.gold;
  inventory.items = inventory.items.filter((it) => it.userWeaponId !== item.userWeaponId);
  renderWho(data.gold);
  showToast(`${withObject(item.name)} 팔고 ${count(data.price)}골드를 받았어요`);
  const row = button.closest('.inv-row');
  if (row && !reduceMotion.matches) { // 판 줄이 옅어지며 빠진 뒤 목록을 다시 그린다
    row.classList.add('is-leaving');
    await sleep(LEAVE_MS);
  }
  if (!views.shop.hidden) drawShop();
}

async function unequipItem(button) { // 장착 풀기 (장착 중인 마도서는 팔 수 없어서)
  button.disabled = true;
  try {
    await api('/inventory/unequip', { method: 'POST' });
    for (const it of inventory.items) it.equipped = false;
    drawShop();
    showToast('장착을 풀었어요. 이제 팔 수 있어요');
  } catch (err) {
    button.disabled = false;
    showToast(err.message);
  }
}

// ---------- 화면 바꾸기 ----------

const RENDER = { collection: renderCollection, enhance: renderEnhance, shop: renderShop };

function route() { // 주소 뒤 # 부분을 읽어 화면을 고른다 (모르는 주소는 도감으로)
  const page = location.hash.replace(/^#\/?/, '');
  const name = Object.hasOwn(RENDER, page) ? page : 'collection';
  if (page !== name) history.replaceState(null, '', `#/${name}`);
  return RENDER[name]();
}

function navigate() { // 뷰 전환이 되는 브라우저에서는 판이 부드럽게 바뀐다 (page.css)
  if (!document.startViewTransition || reduceMotion.matches) return route();
  const transition = document.startViewTransition(() => {
    route(); // 불러오는 중 화면까지만 바꾸고 바로 넘긴다 (서버 응답을 기다리지 않음)
  });
  transition.ready.catch(() => {}); // 전환 중에 또 이동하면 앞 전환은 건너뛴다 (오류가 아님)
}

addEventListener('hashchange', navigate);

async function start() {
  let gold = 0;
  try {
    const { user } = await api('/auth/me');
    loggedIn = Boolean(user);
    gold = user?.gold ?? 0;
  } catch {
    loggedIn = false; // 서버가 꺼져 있으면 로그인 전으로 보고, 화면에서 연결 안내를 띄운다
  }
  renderWho(gold);
  route();
}

start();
