/* ============================================================
   카드뉴스 페이지 — 정책카드 + 시리즈 통합
   - 정책카드: 공약 1~6, 각 8장
   - 시리즈: 시리즈 1~2, 각 8장
   - 파일 규칙: assets/img/policy-cards/{n}/01.jpg~08.jpg
                assets/img/series-cards/{n}/01.jpg~08.jpg
   ============================================================ */

const MODES = {
  policy: {
    label: '정책 카드',
    folder: 'assets/img/policy-cards',
    groups: 6,
    groupLabel: n => `공약 0${n}`,
    groupTitle: n => POLICY_TITLES[n - 1] || `공약 0${n}`
  },
  series: {
    label: '시리즈 카드',
    folder: 'assets/img/series-cards',
    groups: 2,
    groupLabel: n => `시리즈 ${n}`,
    groupTitle: n => `시리즈 ${n}`
  }
};

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

let state = { mode: 'policy', group: 1, index: 0, cards: [] };

/* ===== 라우팅 — #policy-1, #series-2 ===== */
function readHash() {
  const m = /(policy|series)-(\d+)/.exec(location.hash);
  if (!m) return { mode: 'policy', group: 1 };
  return { mode: m[1], group: Number(m[2]) };
}

function setHash(mode, group) {
  location.hash = `${mode}-${group}`;
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
  for (let n = 1; n <= cfg.groups; n++) {
    const btn = document.createElement('button');
    btn.className = 'cards-tab' + (n === state.group ? ' is-active' : '');
    btn.textContent = cfg.groupLabel(n);
    btn.dataset.group = n;
    btn.addEventListener('click', () => setHash(state.mode, n));
    tabsEl.appendChild(btn);
  }
}

async function renderStage() {
  const cfg = MODES[state.mode];
  stageEl.innerHTML = `
    <div class="cards-stage-head">
      <span class="section-eyebrow">${cfg.label}</span>
      <h3>${cfg.groupTitle(state.group)}</h3>
      <div class="cs-counter" id="cs-counter">불러오는 중…</div>
    </div>
    <div class="cards-track-wrap">
      <div class="cards-track" id="cards-track"></div>
    </div>
    <div class="cards-controls">
      <button class="cards-arrow" id="cards-prev" aria-label="이전 카드">←</button>
      <div class="cards-dots" id="cards-dots"></div>
      <button class="cards-arrow" id="cards-next" aria-label="다음 카드">→</button>
    </div>
  `;

  const cards = await detectCards(state.mode, state.group);
  state.cards = cards;
  state.index = 0;

  const track = document.getElementById('cards-track');
  const dots = document.getElementById('cards-dots');
  const counter = document.getElementById('cs-counter');

  if (cards.length === 0) {
    stageEl.innerHTML = `
      <div class="cards-stage-head">
        <span class="section-eyebrow">${cfg.label}</span>
        <h3>${cfg.groupTitle(state.group)}</h3>
      </div>
      <div class="cards-empty">
        <strong>아직 카드가 준비되지 않았습니다</strong>
        디자이너가 작업을 마치면 이 영역에 ${CARDS_PER_GROUP}장의 카드뉴스가 자동으로 나타납니다.
      </div>
    `;
    return;
  }

  cards.forEach(c => {
    const img = document.createElement('img');
    img.src = c.src;
    img.alt = `${cfg.groupLabel(state.group)} 카드 ${c.idx}`;
    img.loading = 'lazy';
    track.appendChild(img);
  });

  cards.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'cards-dot' + (i === 0 ? ' is-active' : '');
    dot.setAttribute('aria-label', `${i + 1}번 카드로 이동`);
    dot.addEventListener('click', () => goToIndex(i));
    dots.appendChild(dot);
  });

  counter.textContent = `1 / ${cards.length}`;

  document.getElementById('cards-prev').addEventListener('click', () => goToIndex(state.index - 1));
  document.getElementById('cards-next').addEventListener('click', () => goToIndex(state.index + 1));

  attachSwipe(track);
  updateUI();
}

function goToIndex(i) {
  if (i < 0 || i >= state.cards.length) return;
  state.index = i;
  updateUI();
}

function updateUI() {
  const track = document.getElementById('cards-track');
  const counter = document.getElementById('cs-counter');
  const prev = document.getElementById('cards-prev');
  const next = document.getElementById('cards-next');
  const dots = document.querySelectorAll('.cards-dot');

  if (!track) return;
  track.style.transform = `translateX(-${state.index * 100}%)`;
  counter.textContent = `${state.index + 1} / ${state.cards.length}`;
  prev.disabled = state.index === 0;
  next.disabled = state.index === state.cards.length - 1;
  dots.forEach((d, i) => d.classList.toggle('is-active', i === state.index));
}

/* ===== 스와이프 ===== */
function attachSwipe(el) {
  let startX = null;
  el.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', e => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) {
      if (dx < 0) goToIndex(state.index + 1);
      else goToIndex(state.index - 1);
    }
    startX = null;
  }, { passive: true });
}

/* ===== 키보드 ===== */
document.addEventListener('keydown', e => {
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
  if (e.key === 'ArrowLeft') goToIndex(state.index - 1);
  if (e.key === 'ArrowRight') goToIndex(state.index + 1);
});

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
  state.group = Math.min(MODES[state.mode].groups, Math.max(1, h.group));
  renderModeButtons();
  renderTabs();
  renderStage();
}

window.addEventListener('hashchange', syncFromHash);
syncFromHash();
