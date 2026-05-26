/* ============================================================
   카드뉴스 페이지 — 세로 스크롤 방식
   - 정책카드: 공약 1~6, 각 8장
   - 시리즈: 시리즈 1~2, 각 8장
   - 선택한 그룹의 카드 8장을 세로로 펼침 (스와이프·화살표 없음)
   - 파일 규칙: assets/img/policy-cards/{n}/01.jpg~08.jpg
                assets/img/series-cards/{n}/01.jpg~08.jpg
   ============================================================ */

const MODES = {
  policy: {
    label: '정책 카드',
    type: 'static',
    folder: 'assets/img/policy-cards',
    groups: 6,
    groupLabel: n => `공약 0${n}`,
    groupTitle: n => POLICY_TITLES[n - 1] || `공약 0${n}`
  },
  series: {
    label: '시리즈 카드',
    type: 'static',
    folder: 'assets/img/series-cards',
    groups: 2,
    groupLabel: n => `시리즈 ${n}`,
    groupTitle: n => `시리즈 ${n}`
  },
  recent: {
    label: '신규 카드',
    type: 'drive',
    title: '관리자가 올린 카드뉴스'
  }
};

/* 신규 카드 모드용 Google Drive 폴더 ID */
const CARDS_GDRIVE_FOLDER_ID = '1nDWyrIFyHFc5l-b5jPPB3cWdszAxbuB9';
const CARDS_GDRIVE_API_KEY   = 'AIzaSyA6GCjF7kj-ClInis5sbjWxKQ7B8RIZfTI';

/* 글쓰기 모달 카테고리 옵션 */
const CARD_CATEGORIES = [
  { value: '',          label: '신규 카드 (어디에도 분류 안 함)' },
  { value: 'policy-1',  label: '정책카드 · 공약 01 (AI 교육 대전환)' },
  { value: 'policy-2',  label: '정책카드 · 공약 02 (진로·경제교육)' },
  { value: 'policy-3',  label: '정책카드 · 공약 03 (글로벌 인성교육)' },
  { value: 'policy-4',  label: '정책카드 · 공약 04 (수준별 맞춤형 학습)' },
  { value: 'policy-5',  label: '정책카드 · 공약 05 (교육공동체 동행교육)' },
  { value: 'policy-6',  label: '정책카드 · 공약 06 (체험중심교육)' },
  { value: 'series-1',  label: '시리즈 카드 · 시리즈 1' },
  { value: 'series-2',  label: '시리즈 카드 · 시리즈 2' }
];

/* 현재 모드+그룹 → 디폴트 카테고리 */
function defaultCategoryForCurrentTab() {
  if (state.mode === 'policy') return `policy-${state.group}`;
  if (state.mode === 'series') return `series-${state.group}`;
  return '';
}

const POLICY_TITLES = [
  'AI 교육 대전환',
  '진로 · 경제교육',
  '글로벌 인성교육',
  '수준별 맞춤형 학습',
  '교육공동체 동행교육',
  '체험중심교육'
];

const CARDS_PER_GROUP = 8;

/* ============================================================ */

const modeBtns = document.querySelectorAll('.cards-mode button');
const tabsEl = document.getElementById('cards-tabs');
const stageEl = document.getElementById('cards-stage');

const VIEW_KEY = 'jsy_cards_view';
let state = {
  mode: 'policy',
  group: 1,
  view: localStorage.getItem(VIEW_KEY) === 'horizontal' ? 'horizontal' : 'vertical'
};

/* ===== 라우팅 — #policy-1, #series-2, #recent ===== */
function readHash() {
  if (/^#recent/.test(location.hash)) return { mode: 'recent', group: 1 };
  const m = /(policy|series)-(\d+)/.exec(location.hash);
  if (!m) return { mode: 'policy', group: 1 };
  return { mode: m[1], group: Number(m[2]) };
}

function setHash(mode, group) {
  if (mode === 'recent') location.hash = 'recent';
  else location.hash = `${mode}-${group}`;
}

/* ===== 카드 자동 감지 ===== */
function detectCards(mode, group) {
  return new Promise(resolve => {
    const cards = [];
    let pending = CARDS_PER_GROUP;

    for (let i = 1; i <= CARDS_PER_GROUP; i++) {
      const src = `${MODES[mode].folder}/${group}/${String(i).padStart(2, '0')}.jpg`;
      const probe = new Image();
      probe.onload = () => { cards.push({ idx: i, src }); finish(); };
      probe.onerror = finish;
      probe.src = src;
    }
    function finish() {
      pending--;
      if (pending === 0) {
        cards.sort((a, b) => a.idx - b.idx);
        resolve(cards);
      }
    }
  });
}

/* ===== 렌더 ===== */
function renderModeButtons() {
  modeBtns.forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.mode === state.mode);
  });
}

function renderTabs() {
  const cfg = MODES[state.mode];
  tabsEl.innerHTML = '';
  if (cfg.type === 'drive') return; // 신규 카드 모드는 하위 탭 없음
  for (let n = 1; n <= cfg.groups; n++) {
    const btn = document.createElement('button');
    btn.className = 'cards-tab' + (n === state.group ? ' is-active' : '');
    btn.textContent = cfg.groupLabel(n);
    btn.dataset.group = n;
    btn.addEventListener('click', () => setHash(state.mode, n));
    tabsEl.appendChild(btn);
  }
}

function renderAdminToolbar() {
  const wrap = document.getElementById('cards-admin-toolbar');
  if (!wrap) return;
  const logged = window.Admin?.isLoggedIn();
  if (!logged) { wrap.innerHTML = ''; return; }
  const cfg = MODES[state.mode];
  const where = cfg.type === 'static' ? cfg.groupLabel(state.group) : '신규 카드';
  wrap.innerHTML = `
    <div class="activities-admin-bar" style="margin-bottom:18px;">
      <span class="admin-badge">관리자 모드</span>
      <button class="btn btn-primary" id="cards-new-post">+ ${escapeHtml(where)}에 카드 추가</button>
      <span class="admin-tip">모달에서 다른 카테고리로 변경 가능</span>
    </div>
  `;
  document.getElementById('cards-new-post').addEventListener('click', () => openCardsPostModal(defaultCategoryForCurrentTab()));
}

async function renderStage() {
  const cfg = MODES[state.mode];

  // 신규 카드 모드 — Google Drive 기반
  if (cfg.type === 'drive') {
    await renderDriveStage(cfg);
    return;
  }

  const isHorizontal = state.view === 'horizontal';

  stageEl.innerHTML = `
    <div class="cards-stage-head">
      <span class="section-eyebrow">${cfg.label}</span>
      <h3>${cfg.groupTitle(state.group)}</h3>
      <div class="cs-counter" id="cs-counter">불러오는 중…</div>
      <div class="view-toggle" role="group" aria-label="보기 방식">
        <button class="view-toggle-btn ${!isHorizontal ? 'is-active' : ''}" data-view="vertical" aria-label="세로 보기">
          <span class="vt-icon">☰</span><span class="vt-label">세로</span>
        </button>
        <button class="view-toggle-btn ${isHorizontal ? 'is-active' : ''}" data-view="horizontal" aria-label="가로 보기">
          <span class="vt-icon">⇆</span><span class="vt-label">가로</span>
        </button>
      </div>
    </div>
    <div class="cards-${state.view}" id="cards-container"></div>
    ${isHorizontal ? '<div class="cards-h-controls"><button class="cards-h-arrow" id="cards-h-prev" aria-label="이전 카드">←</button><span class="cards-h-counter" id="cards-h-counter">1 / ${CARDS_PER_GROUP}</span><button class="cards-h-arrow" id="cards-h-next" aria-label="다음 카드">→</button></div>' : ''}
    <div class="cards-bottom-nav" id="cards-bottom-nav"></div>
  `;

  // 보기 토글 핸들러
  stageEl.querySelectorAll('.view-toggle-btn').forEach(b => {
    b.addEventListener('click', () => {
      const v = b.dataset.view;
      if (v === state.view) return;
      state.view = v;
      localStorage.setItem(VIEW_KEY, v);
      renderStage();
    });
  });

  // 정적 8장 + 해당 카테고리의 Drive 카드 통합
  const staticCards = await detectCards(state.mode, state.group);
  const targetCategory = `${state.mode}-${state.group}`;
  // 정책/시리즈 모드는 오래된 순 (먼저 올린 것이 위) + 핀 우선
  const driveCards = sortByPinAndDate(
    (await fetchAllDrivePosts()).filter(p => p.category === targetCategory),
    true /* ascByDate */
  );

  // 통합 — 핀 Drive 먼저, 정적 8장, 그 다음 일반 Drive (오래된 순)
  const pinnedCards = driveCards.filter(p => p.pinned);
  const normalCards = driveCards.filter(p => !p.pinned);
  const mapDrive = p => ({
    src: driveThumbUrl(p.id, 1200),
    alt: p.title || p.name,
    isDrive: true, id: p.id, pinned: p.pinned,
    title: p.title, body: p.body,
    imageIds: p.imageIds || [p.id],
    extras: p.extras || [],
    label: p.title || p.name
  });
  const cards = [
    ...pinnedCards.map(mapDrive),
    ...staticCards.map(c => ({
      src: c.src,
      alt: `${cfg.groupLabel(state.group)} 카드 ${c.idx}`,
      isDrive: false,
      label: `카드 ${c.idx}`
    })),
    ...normalCards.map(mapDrive)
  ];

  const container = document.getElementById('cards-container');
  const counter = document.getElementById('cs-counter');
  const bottomNav = document.getElementById('cards-bottom-nav');
  const logged = window.Admin?.isLoggedIn();

  if (cards.length === 0) {
    stageEl.innerHTML = `
      <div class="cards-stage-head">
        <span class="section-eyebrow">${cfg.label}</span>
        <h3>${cfg.groupTitle(state.group)}</h3>
      </div>
      <div class="cards-empty">
        <strong>아직 카드가 준비되지 않았습니다</strong>
        ${logged ? `위쪽 '+ ${cfg.groupLabel(state.group)}에 카드 추가' 버튼으로 첫 카드를 올려보세요.` : '디자이너가 작업을 마치면 이 영역에 카드뉴스가 자동으로 나타납니다.'}
      </div>
    `;
    return;
  }

  const adminInfo = driveCards.length > 0 ? ` · 관리자 추가 ${driveCards.length}장 포함` : '';
  counter.textContent = isHorizontal
    ? `${cards.length}장${adminInfo} · 좌우로 넘기거나 카드를 눌러 크게 보세요`
    : `${cards.length}장${adminInfo} · 카드를 눌러 크게 보거나 스크롤하며 보세요`;

  container.innerHTML = cards.map((c, i) => {
    const imgCount = (c.imageIds || []).length;
    return `
    <figure class="vcard ${c.isDrive ? 'is-drive' : ''} ${c.pinned ? 'is-pinned' : ''}" data-idx="${i}">
      <img src="${c.src}" alt="${escapeAttr(c.alt)}" loading="${i < 2 ? 'eager' : 'lazy'}">
      <figcaption class="vcard-num">${i + 1} / ${cards.length}</figcaption>
      ${c.isDrive && imgCount > 1 ? `<div class="multi-badge" title="${imgCount}장">📷 ${imgCount}</div>` : ''}
      ${c.isDrive && c.pinned ? `<div class="pin-badge" title="고정됨">📌</div>` : ''}
      ${c.isDrive && c.title ? `<div class="recent-card-title">${escapeHtml(c.title)}</div>` : ''}
      ${c.isDrive && logged ? `
        <div class="post-actions">
          <button class="post-action-btn pin-btn" data-id="${c.id}" data-pinned="${c.pinned ? '1' : '0'}" aria-label="${c.pinned ? '고정 해제' : '고정'}" title="${c.pinned ? '고정 해제' : '맨 위 고정'}">${c.pinned ? '📌' : '📍'}</button>
          <button class="post-action-btn edit-btn" data-id="${c.id}" aria-label="수정" title="수정">✏️</button>
          <button class="post-action-btn delete-btn" data-id="${c.id}" data-extras="${escapeAttr((c.extras || []).join(','))}" data-title="${escapeAttr(c.label)}" aria-label="삭제" title="삭제">✕</button>
        </div>
      ` : ''}
    </figure>
    `;
  }).join('');

  // 카드 클릭 → 라이트박스
  container.querySelectorAll('.vcard').forEach(card => {
    card.querySelector('img').addEventListener('click', () => openLightbox(Number(card.dataset.idx), cards));
  });

  // 관리자 — Drive 카드 액션
  if (logged) {
    container.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); deleteRecentCard(btn.dataset.id, btn.dataset.title, btn.dataset.extras || ''); });
    });
    container.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); openEditCardModal(btn.dataset.id); });
    });
    container.querySelectorAll('.pin-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        await toggleCardPin(btn.dataset.id);
      });
    });
  }

  // 가로 모드 컨트롤 (좌우 화살표 + 카운터)
  if (isHorizontal) {
    const hPrev = document.getElementById('cards-h-prev');
    const hNext = document.getElementById('cards-h-next');
    const hCounter = document.getElementById('cards-h-counter');

    function scrollByCard(delta) {
      const first = container.querySelector('.vcard');
      if (!first) return;
      const w = first.getBoundingClientRect().width + 16; // gap
      container.scrollBy({ left: delta * w, behavior: 'smooth' });
    }

    hPrev.addEventListener('click', () => scrollByCard(-1));
    hNext.addEventListener('click', () => scrollByCard(1));

    // 키보드 좌우 화살표
    const onKey = e => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); scrollByCard(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); scrollByCard(1); }
    };
    document.addEventListener('keydown', onKey);
    // cleanup은 다음 렌더 시 stageEl.innerHTML로 자동 (리스너만 남지만 미사용 영역엔 무해)

    // 스크롤 시 카운터 갱신
    const updateCounter = () => {
      const items = container.querySelectorAll('.vcard');
      const c = container.getBoundingClientRect().left + container.getBoundingClientRect().width / 2;
      let idx = 0, best = Infinity;
      items.forEach((it, i) => {
        const r = it.getBoundingClientRect();
        const cent = r.left + r.width / 2;
        const d = Math.abs(cent - c);
        if (d < best) { best = d; idx = i; }
      });
      hCounter.textContent = `${idx + 1} / ${items.length}`;
    };
    container.addEventListener('scroll', updateCounter, { passive: true });
    setTimeout(updateCounter, 100);
  }

  // 하단 이전/다음 공약 네비
  const prev = state.group > 1 ? state.group - 1 : null;
  const next = state.group < cfg.groups ? state.group + 1 : null;
  bottomNav.innerHTML = `
    ${prev ? `<button class="btn btn-ghost" data-group="${prev}">← ${cfg.groupLabel(prev)}</button>` : '<span></span>'}
    <button class="btn btn-outline" id="cards-back-top">맨 위로 ↑</button>
    ${next ? `<button class="btn btn-primary" data-group="${next}">${cfg.groupLabel(next)} →</button>` : '<span></span>'}
  `;
  bottomNav.querySelectorAll('[data-group]').forEach(b => {
    b.addEventListener('click', () => setHash(state.mode, Number(b.dataset.group)));
  });
  document.getElementById('cards-back-top').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ===== 모드 전환 ===== */
modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.mode === state.mode) return;
    setHash(btn.dataset.mode, 1);
  });
});

/* ===== 초기화 + hashchange ===== */
function syncFromHash() {
  const h = readHash();
  state.mode = h.mode in MODES ? h.mode : 'policy';
  const cfg = MODES[state.mode];
  if (cfg.type === 'static') {
    state.group = Math.min(cfg.groups, Math.max(1, h.group));
  }
  renderModeButtons();
  renderTabs();
  renderAdminToolbar();
  renderStage();
  if (window.scrollY > 200) {
    const target = document.querySelector('.cards-mode');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/* 로그인 상태 변하면 관리자 UI 다시 그림 */
window.addEventListener('admin:change', () => {
  renderAdminToolbar();
  if (MODES[state.mode]?.type === 'drive') renderStage();
});

window.addEventListener('hashchange', syncFromHash);
syncFromHash();

/* ============================================================
   신규 카드 모드 — Google Drive 기반 + 관리자 업로드
   ============================================================ */

let recentPosts = []; // [{id, title, body, createdTime, name}, ...]
let allDrivePosts = null;
let allDriveTime = 0;
const DRIVE_CACHE_TTL = 30000; // 30초

async function fetchAllDrivePosts(force = false) {
  if (!force && allDrivePosts && Date.now() - allDriveTime < DRIVE_CACHE_TTL) {
    return allDrivePosts;
  }
  if (!CARDS_GDRIVE_FOLDER_ID || !CARDS_GDRIVE_API_KEY) return [];
  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', `'${CARDS_GDRIVE_FOLDER_ID}' in parents and mimeType contains 'image/' and trashed=false`);
  url.searchParams.set('fields', 'files(id,name,createdTime,modifiedTime,description)');
  url.searchParams.set('orderBy', 'createdTime desc');
  url.searchParams.set('pageSize', '200');
  url.searchParams.set('key', CARDS_GDRIVE_API_KEY);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const all = (data.files || []).map(parseDrivePost);
    // 마스터만, extras를 imageIds로 결합
    const idMap = new Map(all.map(f => [f.id, f]));
    allDrivePosts = all
      .filter(f => !f.parent)
      .map(master => {
        const extraFiles = (master.extras || []).map(id => idMap.get(id)).filter(Boolean);
        return { ...master, imageIds: [master.id, ...extraFiles.map(f => f.id)] };
      });
    allDriveTime = Date.now();
    return allDrivePosts;
  } catch (e) {
    console.error('[Cards] Drive fetch error:', e);
    return allDrivePosts || [];
  }
}

function invalidateDriveCache() { allDrivePosts = null; }

function parseDrivePost(file) {
  let title = '', body = '', category = '', pinned = false, parent = null, extras = [];
  if (file.description) {
    try {
      const d = JSON.parse(file.description);
      title = d.title || ''; body = d.body || '';
      category = d.category || ''; pinned = !!d.pinned;
      parent = d.parent || null;
      extras = Array.isArray(d.extras) ? d.extras : [];
    }
    catch { body = file.description; }
  }
  return { id: file.id, name: file.name, title, body, category, pinned, parent, extras, createdTime: file.createdTime };
}

function sortByPinAndDate(arr, ascByDate = false) {
  return arr.slice().sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const av = new Date(a.createdTime).getTime();
    const bv = new Date(b.createdTime).getTime();
    return ascByDate ? av - bv : bv - av;
  });
}

function driveThumbUrl(id, size = 800) {
  return `https://lh3.googleusercontent.com/d/${id}=w${size}`;
}

function cardsToast(msg, type = 'info') {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
  el.className = `toast toast-${type} is-visible`;
  el.textContent = msg;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('is-visible'), 3000);
}

async function renderDriveStage(cfg) {
  if (!CARDS_GDRIVE_FOLDER_ID || !CARDS_GDRIVE_API_KEY) {
    stageEl.innerHTML = `
      <div class="cards-empty">
        <strong>📷 설정이 필요합니다</strong>
        신규 카드뉴스를 받을 Google Drive 폴더가 아직 연결되지 않았습니다.<br>
        관리자에게 폴더 ID 등록을 요청해주세요.
      </div>
    `;
    return;
  }

  stageEl.innerHTML = `
    <div class="cards-stage-head">
      <span class="section-eyebrow">${cfg.label}</span>
      <h3>${cfg.title}</h3>
      <div class="cs-counter" id="cs-counter">불러오는 중…</div>
    </div>
    <div class="cards-vertical" id="cards-vertical"></div>
  `;

  try {
    // 모든 Drive 카드 캐시 사용 → 카테고리 없는 것만 신규 카드로 + 핀 우선
    const all = await fetchAllDrivePosts();
    recentPosts = sortByPinAndDate(all.filter(p => !p.category), false);

    const counter = document.getElementById('cs-counter');
    const wrap = document.getElementById('cards-vertical');
    const logged = window.Admin?.isLoggedIn();

    if (recentPosts.length === 0) {
      counter.textContent = '아직 등록된 카드가 없습니다';
      wrap.innerHTML = `
        <div class="cards-empty">
          <strong>📭 아직 등록된 신규 카드가 없습니다</strong>
          ${logged ? '위쪽 "+ 새 카드뉴스" 버튼으로 첫 카드를 올려보세요.' : '관리자가 새 카드를 올리면 이곳에 자동으로 표시됩니다.'}
        </div>
      `;
      return;
    }

    counter.textContent = `${recentPosts.length}장 · 클릭하면 크게 보입니다`;

    wrap.innerHTML = recentPosts.map((p, i) => {
      const imgCount = (p.imageIds || [p.id]).length;
      return `
      <figure class="vcard recent-card ${p.title ? 'has-title' : ''} ${p.pinned ? 'is-pinned' : ''}" data-idx="${i}">
        <img src="${driveThumbUrl(p.id, 1200)}" alt="${escapeAttr(p.title || p.name)}" loading="${i < 2 ? 'eager' : 'lazy'}">
        ${imgCount > 1 ? `<div class="multi-badge" title="${imgCount}장">📷 ${imgCount}</div>` : ''}
        ${p.pinned ? `<div class="pin-badge" title="고정됨">📌</div>` : ''}
        ${p.title ? `<div class="recent-card-title">${escapeHtml(p.title)}</div>` : ''}
        ${logged ? `
          <div class="post-actions">
            <button class="post-action-btn pin-btn" data-id="${p.id}" aria-label="${p.pinned ? '고정 해제' : '고정'}" title="${p.pinned ? '고정 해제' : '맨 위 고정'}">${p.pinned ? '📌' : '📍'}</button>
            <button class="post-action-btn edit-btn" data-id="${p.id}" aria-label="수정" title="수정">✏️</button>
            <button class="post-action-btn delete-btn" data-id="${p.id}" data-extras="${escapeAttr((p.extras || []).join(','))}" data-title="${escapeAttr(p.title || p.name)}" aria-label="삭제" title="삭제">✕</button>
          </div>
        ` : ''}
      </figure>
      `;
    }).join('');

    if (logged) {
      wrap.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', e => { e.stopPropagation(); deleteRecentCard(btn.dataset.id, btn.dataset.title, btn.dataset.extras || ''); });
      });
      wrap.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', e => { e.stopPropagation(); openEditCardModal(btn.dataset.id); });
      });
      wrap.querySelectorAll('.pin-btn').forEach(btn => {
        btn.addEventListener('click', async e => { e.stopPropagation(); await toggleCardPin(btn.dataset.id); });
      });
    }

    // 신규 모드 카드 클릭 → 통합 라이트박스 (글 표시 포함)
    wrap.querySelectorAll('.vcard').forEach(card => {
      const img = card.querySelector('img');
      img.addEventListener('click', () => {
        const idx = Number(card.dataset.idx);
        // 통합 카드 구조로 변환
        const cards = recentPosts.map(p => ({
          src: driveThumbUrl(p.id, 1600),
          alt: p.title || p.name,
          isDrive: true, id: p.id, title: p.title, body: p.body,
          label: p.title || p.name
        }));
        openLightbox(idx, cards);
      });
    });
  } catch (e) {
    console.error('[Cards Recent] Drive API error:', e);
    document.getElementById('cards-vertical').innerHTML = `
      <div class="cards-empty">
        <strong>불러올 수 없습니다</strong>
        ${escapeHtml(e.message)}
      </div>
    `;
  }
}

function escapeAttr(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeHtml(s) { return escapeAttr(s); }

/* ===== 신규 카드 — 라이트박스 (글+사진 동시 표시) ===== */
function openRecentLightbox(idx) {
  const p = recentPosts[idx];
  if (!p) return;

  // 기존 cards-lightbox를 활용. img + 캡션
  const lb = document.getElementById('cards-lightbox');
  const img = document.getElementById('cl-img');
  const counter = document.getElementById('cl-counter');
  const prev = document.getElementById('cl-prev');
  const next = document.getElementById('cl-next');

  let curIdx = idx;
  function show(i) {
    curIdx = i;
    const post = recentPosts[i];
    img.src = driveThumbUrl(post.id, 1600);
    img.alt = post.title || post.name;
    counter.innerHTML = `${i + 1} / ${recentPosts.length}${post.title ? `<br><span style="font-size:13px; font-weight:600; opacity:0.85; margin-top:4px; display:inline-block;">${escapeHtml(post.title)}</span>` : ''}`;
    prev.disabled = i === 0;
    next.disabled = i === recentPosts.length - 1;
  }
  show(idx);

  // 임시 핸들러 (라이트박스 닫힐 때 정리)
  const onPrev = () => { if (curIdx > 0) show(curIdx - 1); };
  const onNext = () => { if (curIdx < recentPosts.length - 1) show(curIdx + 1); };
  prev._tempHandler = onPrev;
  next._tempHandler = onNext;
  prev.addEventListener('click', onPrev);
  next.addEventListener('click', onNext);

  lb.classList.add('is-open');
  document.body.style.overflow = 'hidden';

  // 닫기 시 임시 핸들러 제거
  const cleanupOnClose = () => {
    prev.removeEventListener('click', onPrev);
    next.removeEventListener('click', onNext);
    lb.removeEventListener('transitionend', cleanupOnClose);
  };
  setTimeout(() => {
    const observer = new MutationObserver(() => {
      if (!lb.classList.contains('is-open')) {
        cleanupOnClose();
        observer.disconnect();
      }
    });
    observer.observe(lb, { attributes: true, attributeFilter: ['class'] });
  }, 0);
}

/* ===== 글쓰기 모달 (카테고리 선택 포함) ===== */
function openCardsPostModal(defaultCategory = '', init = {}) {
  let modal = document.getElementById('cards-post-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'cards-post-modal';
    modal.className = 'post-modal';
    modal.innerHTML = `
      <div class="post-modal-backdrop"></div>
      <div class="post-modal-body">
        <button class="post-modal-close" type="button" aria-label="닫기">✕</button>
        <h3 id="cards-modal-title">새 카드뉴스 올리기</h3>
        <form id="cards-post-form">
          <label class="post-field">
            <span class="post-label">📂 어디에 올릴까요?</span>
            <select id="cards-post-category" class="post-select">
              ${CARD_CATEGORIES.map(c => `<option value="${escapeAttr(c.value)}">${escapeHtml(c.label)}</option>`).join('')}
            </select>
          </label>
          <label class="post-field">
            <span class="post-label">제목 <small>(선택)</small></span>
            <input type="text" id="cards-post-title" maxlength="100" placeholder="카드뉴스 제목을 입력하세요">
          </label>
          <label class="post-field">
            <span class="post-label">본문 <small>(선택)</small></span>
            <textarea id="cards-post-body" rows="5" maxlength="2000" placeholder="카드뉴스에 함께 띄울 설명을 적어주세요"></textarea>
          </label>
          <label class="post-field" id="cards-post-file-field">
            <span class="post-label" id="cards-post-file-label">카드 이미지 <small>(필수 · 여러 장 선택 가능)</small></span>
            <div class="post-file-drop" id="cards-post-file-drop">
              <input type="file" id="cards-post-file" accept="image/*" multiple required>
              <div class="post-file-placeholder">클릭하거나 카드 이미지를 드래그해서 선택하세요</div>
              <div id="cards-post-file-list" class="post-file-list" style="display:none;"></div>
            </div>
          </label>
          <label class="post-field" id="cards-post-group-field" style="display:flex; align-items:center; gap:10px;">
            <input type="checkbox" id="cards-post-group" style="width:18px; height:18px; cursor:pointer;" checked>
            <span style="font-size:14px; font-weight:700; color:var(--gray-700);">🎴 여러 사진을 한 카드뉴스(카루셀)로 묶기</span>
          </label>
          <div id="cards-edit-images" class="edit-images-wrap" style="display:none;"></div>
          <label class="post-field" style="display:flex; align-items:center; gap:10px;">
            <input type="checkbox" id="cards-post-pinned" style="width:18px; height:18px; cursor:pointer;">
            <span style="font-size:14px; font-weight:700; color:var(--gray-700);">📌 맨 위에 고정</span>
          </label>
          <div class="post-modal-actions">
            <button type="button" class="btn btn-ghost" id="cards-post-cancel">취소</button>
            <button type="submit" class="btn btn-primary" id="cards-post-submit">올리기</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => {
      modal.classList.remove('is-open');
      document.body.style.overflow = '';
      modal._editId = null;
      modal.querySelector('#cards-post-form').reset();
      updateCardsFileList(null);
    };
    modal.querySelector('.post-modal-backdrop').addEventListener('click', close);
    modal.querySelector('.post-modal-close').addEventListener('click', close);
    modal.querySelector('#cards-post-cancel').addEventListener('click', close);

    const fileInput = modal.querySelector('#cards-post-file');
    const drop = modal.querySelector('#cards-post-file-drop');

    fileInput.addEventListener('change', () => updateCardsFileList(fileInput.files));
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('is-dragover'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('is-dragover'); }));
    drop.addEventListener('drop', e => {
      const dt = new DataTransfer();
      Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')).forEach(f => dt.items.add(f));
      if (dt.files.length > 0) { fileInput.files = dt.files; updateCardsFileList(fileInput.files); }
    });

    modal.querySelector('#cards-post-form').addEventListener('submit', async e => {
      e.preventDefault();
      const title = modal.querySelector('#cards-post-title').value.trim();
      const body = modal.querySelector('#cards-post-body').value.trim();
      const category = modal.querySelector('#cards-post-category').value;
      const pinned = modal.querySelector('#cards-post-pinned').checked;
      const editId = modal._editId;
      const token = window.Admin?.getToken();
      if (!token) { cardsToast('로그인이 필요합니다.', 'error'); return; }

      const submit = modal.querySelector('#cards-post-submit');
      submit.disabled = true;

      try {
        if (editId) {
          // 수정 모드 — 이미지 추가/제거/순서 + 메타
          const post = modal._editPost;
          const removed = modal._removedExtras || [];
          const newFiles = Array.from(fileInput.files);
          let currentImageIds = (modal._reorderedImageIds || post.imageIds || [post.id]).slice();

          for (let i = 0; i < removed.length; i++) {
            submit.textContent = `이미지 제거 중… (${i + 1}/${removed.length})`;
            try {
              await fetch(`https://www.googleapis.com/drive/v3/files/${removed[i]}`, {
                method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
              });
            } catch (err) { console.error('Delete failed:', removed[i], err); }
            currentImageIds = currentImageIds.filter(id => id !== removed[i]);
          }

          for (let i = 0; i < newFiles.length; i++) {
            submit.textContent = `새 이미지 올리는 중… (${i + 1}/${newFiles.length})`;
            try {
              const newId = await uploadCardExtra(newFiles[i], editId, token);
              currentImageIds.push(newId);
            } catch (err) { console.error('Upload failed:', newFiles[i].name, err); }
          }

          const extras = currentImageIds.filter(id => id !== editId);
          submit.textContent = '저장 중…';
          await updateCardMeta(editId, title, body, category, pinned, extras, token);
          close();
          cardsToast('수정되었습니다.', 'success');
          renderStage();
        } else {
          const files = Array.from(fileInput.files);
          if (files.length === 0) { cardsToast('카드 이미지를 선택해주세요.', 'error'); return; }
          const groupMode = modal.querySelector('#cards-post-group').checked && files.length > 1;

          if (groupMode) {
            // 묶음
            submit.textContent = `올리는 중… (1/${files.length})`;
            const masterId = await uploadCardMaster(files[0], title, body, category, pinned, [], token);
            const extras = [];
            for (let i = 1; i < files.length; i++) {
              submit.textContent = `올리는 중… (${i + 1}/${files.length})`;
              try { const exId = await uploadCardExtra(files[i], masterId, token); extras.push(exId); }
              catch (err) { console.error('Extra upload failed:', files[i].name, err); }
            }
            await updateCardMeta(masterId, title, body, category, pinned, extras, token);
            close();
            cardsToast(`1개 카드뉴스(이미지 ${files.length}장) 등록됨`, 'success');
          } else {
            let ok = 0, fail = 0;
            for (let i = 0; i < files.length; i++) {
              submit.textContent = `올리는 중… (${i + 1}/${files.length})`;
              try { await uploadCardMaster(files[i], title, body, category, pinned, [], token); ok++; }
              catch (err) { fail++; console.error('Upload failed:', files[i].name, err); }
            }
            close();
            if (fail === 0) cardsToast(`${ok}개 카드 등록됨`, 'success');
            else if (ok > 0) cardsToast(`${ok}개 성공 · ${fail}개 실패`, 'error');
            else cardsToast('업로드 실패 — 폴더 권한 확인', 'error');
          }
          renderStage();
        }
      } catch (err) {
        cardsToast('실패: ' + err.message, 'error');
      } finally {
        submit.disabled = false;
        submit.textContent = editId ? '저장' : '올리기';
      }
    });
  }
  // 수정/새 작성 분기
  const isEdit = !!init.editId;
  modal._editId = init.editId || null;
  modal._editPost = init.editPost || null;
  modal._removedExtras = [];
  modal._reorderedImageIds = init.editPost ? (init.editPost.imageIds || []).slice() : null;
  modal.querySelector('#cards-modal-title').textContent = isEdit ? '카드 수정' : '새 카드뉴스 올리기';
  modal.querySelector('#cards-post-title').value = init.title || '';
  modal.querySelector('#cards-post-body').value = init.body || '';
  modal.querySelector('#cards-post-pinned').checked = !!init.pinned;
  modal.querySelector('#cards-post-category').value = init.category !== undefined ? init.category : defaultCategory;
  modal.querySelector('#cards-post-file-field').style.display = 'block';
  modal.querySelector('#cards-post-group-field').style.display = isEdit ? 'none' : 'flex';
  modal.querySelector('#cards-edit-images').style.display = isEdit ? 'block' : 'none';
  modal.querySelector('#cards-post-submit').textContent = isEdit ? '저장' : '올리기';
  const fileEl = modal.querySelector('#cards-post-file');
  fileEl.value = '';
  fileEl.required = !isEdit;
  const labelEl = modal.querySelector('#cards-post-file-label');
  const phEl = modal.querySelector('#cards-post-modal .post-file-placeholder');
  if (isEdit) {
    labelEl.innerHTML = '추가 이미지 <small>(선택 · 카드뉴스에 더할 이미지)</small>';
    phEl.innerHTML = '추가로 올릴 이미지를 선택하세요';
    renderCardsEditImagesList();
  } else {
    labelEl.innerHTML = '카드 이미지 <small>(필수 · 여러 장 선택 가능)</small>';
    phEl.innerHTML = '클릭하거나 카드 이미지를 드래그해서 선택하세요';
  }
  updateCardsFileList(null);

  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => modal.querySelector('#cards-post-title').focus(), 50);
}

function updateCardsFileList(files) {
  const list = document.getElementById('cards-post-file-list');
  const placeholder = document.querySelector('#cards-post-modal .post-file-placeholder');
  if (!list || !placeholder) return;
  if (!files || files.length === 0) {
    list.style.display = 'none';
    placeholder.style.display = '';
    list.innerHTML = '';
    return;
  }
  list.style.display = 'block';
  placeholder.style.display = 'none';
  list.innerHTML = Array.from(files).map(f => `
    <div class="post-file-item">
      <img src="${URL.createObjectURL(f)}" alt="${escapeAttr(f.name)}">
      <div class="post-file-info">
        <div class="post-file-name">${escapeHtml(f.name)}</div>
        <div class="post-file-size">${(f.size / 1024).toFixed(0)} KB</div>
      </div>
    </div>
  `).join('') + `<div class="post-file-summary">총 <strong>${files.length}장</strong> 선택됨${files.length > 1 ? ' · 각각 별도 카드로 등록' : ''}</div>`;
}

async function uploadCardMaster(file, title, body, category, pinned, extras, token) {
  const metadata = {
    name: file.name,
    parents: [CARDS_GDRIVE_FOLDER_ID],
    description: JSON.stringify({ title: title || '', body: body || '', category: category || '', pinned: !!pinned, extras: extras || [] })
  };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  invalidateDriveCache();
  const data = await res.json();
  return data.id;
}

async function uploadCardExtra(file, parentId, token) {
  const metadata = {
    name: file.name,
    parents: [CARDS_GDRIVE_FOLDER_ID],
    description: JSON.stringify({ parent: parentId })
  };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  invalidateDriveCache();
  const data = await res.json();
  return data.id;
}

async function updateCardMeta(id, title, body, category, pinned, extras, token) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: JSON.stringify({ title: title || '', body: body || '', category: category || '', pinned: !!pinned, extras: extras || [] }) })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  invalidateDriveCache();
}

function openEditCardModal(id) {
  const all = allDrivePosts || [];
  const post = all.find(p => p.id === id);
  if (!post) { cardsToast('카드를 찾을 수 없습니다', 'error'); return; }
  openCardsPostModal(post.category || '', {
    editId: post.id,
    editPost: post,
    title: post.title,
    body: post.body,
    category: post.category || '',
    pinned: post.pinned
  });
}

function renderCardsEditImagesList() {
  const modal = document.getElementById('cards-post-modal');
  const wrap = modal?.querySelector('#cards-edit-images');
  if (!wrap || !modal._editPost) return;
  const post = modal._editPost;
  const removed = modal._removedExtras || [];
  const order = modal._reorderedImageIds || (post.imageIds || [post.id]).slice();
  const remaining = order.filter(id => !removed.includes(id));

  wrap.innerHTML = `
    <div class="edit-images-label">현재 카드 이미지 (${remaining.length}장)</div>
    <div class="edit-images-grid">
      ${remaining.map((id, i) => `
        <div class="edit-image-item ${id === post.id ? 'is-master' : ''}" data-id="${id}">
          <img src="${driveThumbUrl(id, 400)}" alt="이미지 ${i + 1}">
          <div class="edit-image-num">${i + 1}${id === post.id ? ' · 대표' : ''}</div>
          <div class="edit-image-actions">
            ${i > 0 ? `<button type="button" class="edit-img-btn" data-action="moveUp" data-id="${id}" title="앞으로">◀</button>` : ''}
            ${i < remaining.length - 1 ? `<button type="button" class="edit-img-btn" data-action="moveDown" data-id="${id}" title="뒤로">▶</button>` : ''}
            ${id !== post.id ? `<button type="button" class="edit-img-btn edit-img-remove" data-action="remove" data-id="${id}" title="제거">✕</button>` : `<span style="font-size:10px; color:var(--gray-500); padding:0 8px;">대표</span>`}
          </div>
        </div>
      `).join('')}
    </div>
    <div class="edit-images-hint">💡 대표 사진(첫 이미지)은 제거할 수 없습니다. 카드뉴스를 통째로 삭제하려면 카드의 ✕ 버튼을 누르세요.</div>
  `;

  wrap.querySelectorAll('.edit-img-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'remove') {
        modal._removedExtras = [...(modal._removedExtras || []), id];
        modal._reorderedImageIds = (modal._reorderedImageIds || []).filter(x => x !== id);
      } else if (action === 'moveUp' || action === 'moveDown') {
        const arr = (modal._reorderedImageIds || (post.imageIds || [post.id])).slice();
        const idx = arr.indexOf(id);
        const target = action === 'moveUp' ? idx - 1 : idx + 1;
        if (target < 0 || target >= arr.length) return;
        if (arr[target] === post.id && action === 'moveUp') return;
        [arr[idx], arr[target]] = [arr[target], arr[idx]];
        modal._reorderedImageIds = arr;
      }
      renderCardsEditImagesList();
    });
  });
}

async function toggleCardPin(id) {
  const all = allDrivePosts || [];
  const post = all.find(p => p.id === id);
  if (!post) return;
  const token = window.Admin?.getToken();
  if (!token) { cardsToast('로그인이 필요합니다.', 'error'); return; }
  try {
    await updateCardMeta(post.id, post.title, post.body, post.category || '', !post.pinned, post.extras || [], token);
    cardsToast(post.pinned ? '고정 해제됨' : '맨 위 고정됨', 'success');
    renderStage();
  } catch (e) {
    cardsToast('실패: ' + e.message, 'error');
  }
}

async function deleteRecentCard(id, label, extrasStr = '') {
  const extras = extrasStr ? extrasStr.split(',').filter(Boolean) : [];
  const total = 1 + extras.length;
  const msg = total > 1
    ? `"${label}" 카드(이미지 ${total}장)를 정말 삭제할까요?\n사진과 글이 영구 삭제됩니다.`
    : `"${label}" 카드를 정말 삭제할까요?\n사진과 글이 영구 삭제됩니다.`;
  if (!confirm(msg)) return;
  const token = window.Admin?.getToken();
  if (!token) { cardsToast('로그인이 필요합니다.', 'error'); return; }
  try {
    // extras 먼저
    for (const exId of extras) {
      await fetch(`https://www.googleapis.com/drive/v3/files/${exId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
    }
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    invalidateDriveCache();
    cardsToast('삭제 완료', 'success');
    renderStage();
  } catch (e) {
    cardsToast('삭제 실패: ' + e.message, 'error');
  }
}

/* ============================================================
   라이트박스 (카드 확대)
   ============================================================ */

const lb = document.getElementById('cards-lightbox');
const lbImg = document.getElementById('cl-img');
const lbCounter = document.getElementById('cl-counter');
const lbPrev = document.getElementById('cl-prev');
const lbNext = document.getElementById('cl-next');
const lbClose = document.getElementById('cl-close');

let lbCards = [];
let lbIndex = -1;

function openLightbox(idx, cards) {
  lbCards = cards;
  lbIndex = idx;
  updateLightbox();
  lb.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lb.classList.remove('is-open');
  document.body.style.overflow = '';
  lbIndex = -1;
  lbCards = [];
}

function updateLightbox() {
  const c = lbCards[lbIndex];
  if (!c) return;
  lbImg.src = c.src;
  lbImg.alt = c.alt || c.label || `카드 ${lbIndex + 1}`;

  let html = `${lbIndex + 1} / ${lbCards.length}`;
  if (c.isDrive && (c.title || c.body)) {
    if (c.title) html += `<br><strong style="display:block; font-size:15px; margin-top:6px; font-weight:800; line-height:1.3;">${escapeHtml(c.title)}</strong>`;
    if (c.body)  html += `<span style="display:block; font-size:13px; opacity:0.88; line-height:1.55; margin-top:6px; max-width:520px; max-height:120px; overflow:auto;">${escapeHtml(c.body).replace(/\n/g, '<br>')}</span>`;
  }
  lbCounter.innerHTML = html;
  lbPrev.disabled = lbIndex === 0;
  lbNext.disabled = lbIndex === lbCards.length - 1;
}

function lbStep(d) {
  const i = lbIndex + d;
  if (i < 0 || i >= lbCards.length) return;
  lbIndex = i;
  updateLightbox();
}

lbClose.addEventListener('click', closeLightbox);
lbPrev.addEventListener('click', () => lbStep(-1));
lbNext.addEventListener('click', () => lbStep(1));
lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });

document.addEventListener('keydown', e => {
  if (!lb.classList.contains('is-open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowRight') { e.preventDefault(); lbStep(1); }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); lbStep(-1); }
});

let lbTouchStart = null;
lb.addEventListener('touchstart', e => { lbTouchStart = e.touches[0].clientX; }, { passive: true });
lb.addEventListener('touchend', e => {
  if (lbTouchStart === null) return;
  const dx = e.changedTouches[0].clientX - lbTouchStart;
  if (Math.abs(dx) > 50) {
    if (dx < 0) lbStep(1);
    else lbStep(-1);
  }
  lbTouchStart = null;
}, { passive: true });
