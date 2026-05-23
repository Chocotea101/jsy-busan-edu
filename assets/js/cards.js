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

let state = { mode: 'policy', group: 1 };

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
    <div class="cards-vertical" id="cards-vertical"></div>
    <div class="cards-bottom-nav" id="cards-bottom-nav"></div>
  `;

  const cards = await detectCards(state.mode, state.group);
  const wrap = document.getElementById('cards-vertical');
  const counter = document.getElementById('cs-counter');
  const bottomNav = document.getElementById('cards-bottom-nav');

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

  counter.textContent = `${cards.length}장 · 아래로 스크롤하며 보세요`;

  wrap.innerHTML = cards.map((c, i) => `
    <figure class="vcard">
      <img src="${c.src}" alt="${cfg.groupLabel(state.group)} 카드 ${c.idx}" loading="${i < 2 ? 'eager' : 'lazy'}">
      <figcaption class="vcard-num">${c.idx} / ${cards.length}</figcaption>
    </figure>
  `).join('');

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
  state.group = Math.min(MODES[state.mode].groups, Math.max(1, h.group));
  renderModeButtons();
  renderTabs();
  renderStage();
  // 그룹 바뀌면 페이지 상단으로 (탭 위치까지)
  if (window.scrollY > 200) {
    const target = document.querySelector('.cards-tabs');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

window.addEventListener('hashchange', syncFromHash);
syncFromHash();
