/* ============================================================
   영상 — 유세송 / 토론회 / 쇼츠 (유튜브)
   - 코드 기본 영상 + 관리자가 추가한 영상(siteSettings.videos) 병합
   - 관리자 로그인 시 영상 추가/삭제
   - 카드(썸네일+제목+▶) 클릭 → 라이트박스 재생
   - 재생 중 컨트롤(X·화살표) 자동 숨김, 멈추면 다시 표시
   ============================================================ */

/* 코드 기본 영상 (관리자가 추가 안 해도 항상 나옴) */
const DEFAULT_VIDEOS = {
  songs: [
    { type: 'youtube', id: 'sxqW-NjHLak', title: '01. 안전한 등하교길', desc: '정승윤 부산교육감 후보 로고송' },
    { type: 'youtube', id: '392rmOr-w9c', title: '02. 믿고 맡겨줘요', desc: '정승윤 부산교육감 후보 로고송' },
    { type: 'youtube', id: 'jZBrJird11s', title: '03. 바로 정승윤', desc: '정승윤 부산교육감 후보 로고송' }
  ],
  debate: [],
  shorts: [
    { type: 'youtube', id: 'rrCftjxJbGk', title: '삭발 감행 이유', desc: '고성국 TV 출연 | 정승윤 부산교육감 후보' },
    { type: 'youtube', id: 'seZzjM-1m1s', title: '이재명 정부의 탄압', desc: '정승윤의 생각' },
    { type: 'youtube', id: 'dw-dJZRhRjc', title: '부산 시민여러분께 드리는 인사', desc: '부산KNN 생방 TV토론회' },
    { type: 'youtube', id: 'YBg6R9TvjmI', title: '현장 체험학습 정상화 방안', desc: '부산KNN 생방 TV토론회' },
    { type: 'youtube', id: 'tNKZPe5gjDE', title: '211억원이 교육청 예산으로 운영', desc: '부산KNN 생방 TV토론회' },
    { type: 'youtube', id: 'jIt6Ll-GR0g', title: '"저도 마찬가지입니다"', desc: '부산KNN 생방 TV토론회 | 정승윤 부산교육감 후보' }
  ]
};

const CAT_META = {
  songs:  { label: '유세송', vertical: false },
  debate: { label: '토론회', vertical: false },
  shorts: { label: '쇼츠',   vertical: true }
};
const VIDEO_CATS = ['debate', 'songs', 'shorts'];

/* ============================================================ */

const modeWrap = document.getElementById('videos-mode');
const toolbarEl = document.getElementById('videos-toolbar');
const listEl = document.getElementById('songs-list');
const emptyEl = document.getElementById('songs-empty');

let curCat = (location.hash.replace('#', '') in CAT_META) ? location.hash.replace('#', '') : 'debate';

function ytId(input) {
  if (!input) return '';
  const m = input.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : input;
}
function ytThumb(id) { return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`; }

/* "제목 | 부제목" → {title, desc}로 분리 (| 없으면 전체가 제목) */
function splitTitle(raw) {
  if (!raw) return { title: '', desc: '' };
  const idx = raw.indexOf('|');
  if (idx === -1) return { title: raw.trim(), desc: '' };
  return {
    title: raw.slice(0, idx).trim(),
    desc: raw.slice(idx + 1).trim()
  };
}

/* 간단 서식: **굵게**, //빨강//, 줄바꿈(\n 또는 \\n) → HTML
   (먼저 escape 후 안전한 토큰만 태그로 치환) */
function fmt(raw) {
  let s = escapeHtml(raw || '');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');   // **굵게**
  s = s.replace(/\/\/([^/]+)\/\//g, '<span style="color:var(--red)">$1</span>'); // //빨강//
  s = s.replace(/\\n|\n/g, '<br>');                  // 줄바꿈
  return s;
}

/* 기본 + 관리자추가 병합 */
function getItems(cat) {
  const base = DEFAULT_VIDEOS[cat] || [];
  const added = (window.SiteSettings?.get()?.videos?.[cat]) || [];
  return [...base, ...added];
}

function renderModeToggle() {
  if (!modeWrap) return;
  modeWrap.innerHTML = VIDEO_CATS.map(cat =>
    `<button class="cards-mode-btn ${cat === curCat ? 'is-active' : ''}" data-cat="${cat}">${CAT_META[cat].label}</button>`
  ).join('');
  modeWrap.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      curCat = b.dataset.cat;
      location.hash = curCat;
      renderModeToggle();
      renderToolbar();
      render();
    });
  });
}

function renderToolbar() {
  if (!toolbarEl) return;
  const logged = window.Admin?.isLoggedIn();
  if (!logged) { toolbarEl.innerHTML = ''; return; }
  toolbarEl.innerHTML = `
    <div class="activities-admin-bar" style="margin-bottom:20px;">
      <span class="admin-badge">관리자 모드</span>
      <button class="btn btn-primary" id="video-add-btn">+ ${CAT_META[curCat].label} 영상 추가</button>
      <span class="admin-tip">유튜브 링크를 붙여넣으면 됩니다</span>
    </div>
  `;
  document.getElementById('video-add-btn').addEventListener('click', () => openVideoModal(curCat));
}

function render() {
  const items = getItems(curCat);
  const vertical = CAT_META[curCat].vertical;
  listEl.classList.toggle('shorts-grid', vertical);

  if (!items || items.length === 0) {
    const logged = window.Admin?.isLoggedIn();
    emptyEl.style.display = 'block';
    emptyEl.innerHTML = `<strong>🎬 ${CAT_META[curCat].label} 영상이 곧 공개됩니다</strong>
      <p>${logged ? '위 "+ 영상 추가" 버튼으로 유튜브 링크를 등록하세요.' : '영상이 준비되면 이곳에서 바로 보실 수 있습니다.'}</p>`;
    listEl.style.display = 'none';
    return;
  }
  emptyEl.style.display = 'none';
  listEl.style.display = 'grid';
  listEl.classList.toggle('single', items.length === 1 && !vertical);

  const logged = window.Admin?.isLoggedIn();
  const baseCount = (DEFAULT_VIDEOS[curCat] || []).length;

  listEl.innerHTML = items.map((s, i) => {
    const isAdded = i >= baseCount; // 관리자 추가분만 삭제 가능
    const thumb = `<img src="${ytThumb(ytId(s.id))}" alt="${escapeAttr(s.title || '영상')}" loading="lazy">`;
    return `
      <article class="song-card ${vertical ? 'is-short' : ''}" data-idx="${i}" tabindex="0" role="button" aria-label="${escapeAttr(s.title || '영상')} 재생">
        <div class="song-media">
          ${thumb}
          <div class="song-play-btn" aria-hidden="true">▶</div>
        </div>
        <div class="song-info">
          <h3 class="song-title">${fmt(s.title || `영상 ${i + 1}`)}</h3>
          ${s.desc ? `<p class="song-desc">${fmt(s.desc)}</p>` : ''}
        </div>
        ${logged && isAdded ? `
          <div class="video-actions">
            <button class="video-act-btn video-edit-btn" data-idx="${i}" aria-label="수정" title="수정">✏️</button>
            <button class="video-act-btn video-del-btn" data-idx="${i}" aria-label="삭제" title="삭제">✕</button>
          </div>
        ` : ''}
      </article>`;
  }).join('');

  listEl.querySelectorAll('.song-card').forEach(card => {
    const open = () => openSongLightbox(Number(card.dataset.idx));
    card.querySelector('.song-media').addEventListener('click', open);
    card.querySelector('.song-info').addEventListener('click', open);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });
  if (logged) {
    listEl.querySelectorAll('.video-del-btn').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); deleteVideo(curCat, Number(btn.dataset.idx)); });
    });
    listEl.querySelectorAll('.video-edit-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const mergedIdx = Number(btn.dataset.idx);
        const baseCount = (DEFAULT_VIDEOS[curCat] || []).length;
        const item = getItems(curCat)[mergedIdx];
        openVideoModal(curCat, { editAddedIdx: mergedIdx - baseCount, item });
      });
    });
  }
}

/* ===== 관리자: 영상 추가/수정 모달 ===== */
function openVideoModal(cat, edit = null) {
  let modal = document.getElementById('video-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'video-modal';
    modal.className = 'post-modal';
    modal.innerHTML = `
      <div class="post-modal-backdrop"></div>
      <div class="post-modal-body" style="max-width:520px;">
        <button class="post-modal-close" type="button" aria-label="닫기">✕</button>
        <h3 id="video-modal-title">영상 추가</h3>
        <form id="video-form">
          <label class="post-field">
            <span class="post-label">📂 어디에 올릴까요?</span>
            <select id="video-cat" class="post-select">
              ${VIDEO_CATS.map(c => `<option value="${c}">${CAT_META[c].label}</option>`).join('')}
            </select>
          </label>
          <label class="post-field">
            <span class="post-label">유튜브 링크 <small>(필수)</small></span>
            <input type="text" id="video-url" placeholder="https://youtu.be/... 또는 https://youtube.com/shorts/...">
          </label>
          <label class="post-field">
            <span class="post-label">제목 <small>( | 앞=제목, 뒤=부제목 )</small></span>
            <input type="text" id="video-title" maxlength="300" placeholder='예) **211억** 교육청 예산 | 부산KNN TV토론회'>
            <div class="video-fmt-guide">
              ✏️ 서식: <code>**굵게**</code> · <code>//빨강//</code> · 줄바꿈은 <code>\n</code>
            </div>
            <div id="video-title-preview" class="video-title-preview"></div>
          </label>
          <input type="hidden" id="video-desc">
          <div class="post-modal-actions">
            <button type="button" class="btn btn-ghost" id="video-cancel">취소</button>
            <button type="submit" class="btn btn-primary" id="video-submit">추가</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);
    const close = () => { modal.classList.remove('is-open'); document.body.style.overflow = ''; modal._edit = null; modal.querySelector('#video-form').reset(); };
    modal.querySelector('.post-modal-backdrop').addEventListener('click', close);
    modal.querySelector('.post-modal-close').addEventListener('click', close);
    modal.querySelector('#video-cancel').addEventListener('click', close);

    // "제목 | 부제목" + 서식 실시간 미리보기 (실제 보일 모습)
    modal.querySelector('#video-title').addEventListener('input', e => {
      const { title, desc } = splitTitle(e.target.value);
      const pv = modal.querySelector('#video-title-preview');
      if (!title && !desc) { pv.innerHTML = ''; return; }
      pv.innerHTML = `<span class="pv-label">미리보기</span>
        <div class="pv-title">${fmt(title)}</div>
        ${desc ? `<div class="pv-desc">${fmt(desc)}</div>` : ''}`;
    });

    modal.querySelector('#video-form').addEventListener('submit', async e => {
      e.preventDefault();
      const c = modal.querySelector('#video-cat').value;
      const url = modal.querySelector('#video-url').value.trim();
      const { title, desc } = splitTitle(modal.querySelector('#video-title').value);
      const id = ytId(url);
      if (!id) { videoToast('유튜브 링크를 정확히 입력해주세요.', 'error'); return; }
      const edit = modal._edit;

      const submit = modal.querySelector('#video-submit');
      submit.disabled = true; submit.textContent = '저장 중…';
      try {
        const settings = await window.SiteSettings.fetch();
        const videos = { songs: [], debate: [], shorts: [], ...(settings.videos || {}) };
        const entry = { type: 'youtube', id, title, desc };

        if (edit) {
          // 수정 — 원래 카테고리에서 빼고, 선택한 카테고리에 반영
          const oldCat = edit.cat;
          if (oldCat === c) {
            videos[c][edit.addedIdx] = entry;
          } else {
            (videos[oldCat] || []).splice(edit.addedIdx, 1);
            videos[c] = [...(videos[c] || []), entry];
          }
        } else {
          videos[c] = [...(videos[c] || []), entry];
        }

        await window.SiteSettings.save({ videos });
        close();
        videoToast(edit ? '수정되었습니다.' : '영상이 추가되었습니다.', 'success');
        curCat = c; location.hash = c;
        renderModeToggle(); renderToolbar(); render();
      } catch (err) {
        videoToast('실패: ' + err.message, 'error');
      } finally {
        submit.disabled = false; submit.textContent = edit ? '저장' : '추가';
      }
    });
  }

  // 추가/수정 채우기
  modal._edit = edit ? { cat, addedIdx: edit.editAddedIdx } : null;
  modal.querySelector('#video-modal-title').textContent = edit ? '영상 수정' : '영상 추가';
  modal.querySelector('#video-submit').textContent = edit ? '저장' : '추가';
  modal.querySelector('#video-cat').value = cat;
  modal.querySelector('#video-url').value = edit ? `https://youtu.be/${ytId(edit.item.id)}` : '';
  // 수정 시 "제목 | 부제목" 형태로 합쳐서 한 칸에
  const combinedTitle = edit
    ? (edit.item.desc ? `${edit.item.title || ''} | ${edit.item.desc}` : (edit.item.title || ''))
    : '';
  modal.querySelector('#video-title').value = combinedTitle;
  modal.querySelector('#video-title').dispatchEvent(new Event('input'));

  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => modal.querySelector('#video-url').focus(), 50);
}

async function deleteVideo(cat, mergedIdx) {
  const baseCount = (DEFAULT_VIDEOS[cat] || []).length;
  const addedIdx = mergedIdx - baseCount;
  if (addedIdx < 0) { videoToast('기본 영상은 삭제할 수 없습니다.', 'error'); return; }
  if (!confirm('이 영상을 목록에서 삭제할까요?')) return;
  try {
    const settings = await window.SiteSettings.fetch();
    const videos = { songs: [], debate: [], shorts: [], ...(settings.videos || {}) };
    (videos[cat] || []).splice(addedIdx, 1);
    await window.SiteSettings.save({ videos });
    videoToast('삭제되었습니다.', 'success');
    renderToolbar(); render();
  } catch (e) {
    videoToast('삭제 실패: ' + e.message, 'error');
  }
}

function videoToast(msg, type = 'info') {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
  el.className = `toast toast-${type} is-visible`;
  el.textContent = msg;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('is-visible'), 3000);
}

/* ===== 라이트박스 ===== */
function curItems() { return getItems(curCat); }

function openSongLightbox(idx) {
  const s = curItems()[idx];
  if (!s) return;

  let lb = document.getElementById('song-lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'song-lightbox';
    lb.className = 'song-lightbox';
    lb.innerHTML = `
      <button class="song-lb-close" id="song-lb-close" aria-label="닫기">✕</button>
      <button class="song-lb-arrow song-lb-prev" id="song-lb-prev" aria-label="이전">←</button>
      <button class="song-lb-arrow song-lb-next" id="song-lb-next" aria-label="다음">→</button>
      <div class="song-lb-inner">
        <div class="song-lb-media" id="song-lb-media"></div>
        <div class="song-lb-caption" id="song-lb-caption"></div>
      </div>
    `;
    document.body.appendChild(lb);

    lb.querySelector('#song-lb-close').addEventListener('click', closeSongLightbox);
    lb.querySelector('#song-lb-prev').addEventListener('click', () => stepSong(-1));
    lb.querySelector('#song-lb-next').addEventListener('click', () => stepSong(1));
    lb.addEventListener('click', e => { if (e.target === lb) closeSongLightbox(); });
    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeSongLightbox();
      if (e.key === 'ArrowRight') stepSong(1);
      if (e.key === 'ArrowLeft') stepSong(-1);
    });
    // 컨트롤 자동 숨김: 라이트박스에 마우스/터치 움직임 → 잠깐 표시
    ['mousemove', 'touchstart'].forEach(ev =>
      lb.addEventListener(ev, () => showControlsTemporarily(), { passive: true }));
  }

  lb._idx = idx;
  renderSongLightbox();
  lb.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  showControlsTemporarily();
}

let controlsTimer = null;
function showControlsTemporarily() {
  const lb = document.getElementById('song-lightbox');
  if (!lb) return;
  lb.classList.remove('controls-hidden');
  clearTimeout(controlsTimer);
  controlsTimer = setTimeout(() => {
    if (ytPlayerState === 1) lb.classList.add('controls-hidden'); // 재생 중일 때만 숨김
  }, 2800);
}

/* 유튜브 IFrame API — 재생/정지 상태 감지 */
let ytPlayer = null;
let ytPlayerState = -1;
window.onYouTubeIframeAPIReady = function () { /* 준비됨 — openSongLightbox에서 플레이어 생성 */ };

function loadYTApi() {
  if (window.YT && window.YT.Player) return;
  if (document.getElementById('yt-api')) return;
  const tag = document.createElement('script');
  tag.id = 'yt-api';
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
}

function renderSongLightbox() {
  const lb = document.getElementById('song-lightbox');
  const idx = lb._idx;
  const items = curItems();
  const s = items[idx];
  const media = lb.querySelector('#song-lb-media');
  const caption = lb.querySelector('#song-lb-caption');
  const vertical = CAT_META[curCat].vertical;

  lb.classList.toggle('is-vertical', vertical);

  const vid = ytId(s.id);
  media.innerHTML = `<div id="yt-player-mount"></div>`;
  ytPlayerState = -1;

  loadYTApi();
  const mountPlayer = () => {
    if (!(window.YT && window.YT.Player)) { setTimeout(mountPlayer, 200); return; }
    ytPlayer = new YT.Player('yt-player-mount', {
      videoId: vid,
      playerVars: { autoplay: 1, rel: 0, playsinline: 1 },
      events: {
        onStateChange: e => {
          ytPlayerState = e.data; // 1=재생, 2=정지
          const lb2 = document.getElementById('song-lightbox');
          if (!lb2) return;
          if (e.data === 1) showControlsTemporarily();       // 재생 시작 → 잠깐 보였다 숨김
          else lb2.classList.remove('controls-hidden');       // 정지/버퍼링 → 표시
        }
      }
    });
  };
  mountPlayer();

  caption.innerHTML = `
    <div class="song-lb-title">${fmt(s.title || '영상')}</div>
    ${s.desc ? `<div class="song-lb-desc">${fmt(s.desc)}</div>` : ''}
    ${items.length > 1 ? `<div class="song-lb-counter">${idx + 1} / ${items.length}</div>` : ''}
  `;

  const showNav = items.length > 1;
  lb.querySelector('#song-lb-prev').style.display = showNav ? '' : 'none';
  lb.querySelector('#song-lb-next').style.display = showNav ? '' : 'none';
  lb.querySelector('#song-lb-prev').disabled = idx === 0;
  lb.querySelector('#song-lb-next').disabled = idx === items.length - 1;
}

function stepSong(d) {
  const lb = document.getElementById('song-lightbox');
  const next = lb._idx + d;
  if (next < 0 || next >= curItems().length) return;
  lb._idx = next;
  renderSongLightbox();
  showControlsTemporarily();
}

function closeSongLightbox() {
  const lb = document.getElementById('song-lightbox');
  if (!lb) return;
  lb.classList.remove('is-open', 'controls-hidden');
  document.body.style.overflow = '';
  try { ytPlayer && ytPlayer.destroy && ytPlayer.destroy(); } catch {}
  ytPlayer = null; ytPlayerState = -1;
  const media = lb.querySelector('#song-lb-media');
  if (media) media.innerHTML = '';
}

function escapeAttr(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeHtml(s) { return escapeAttr(s); }

/* 로그인/설정 변경 시 다시 그림 */
window.addEventListener('admin:change', () => { renderToolbar(); render(); });
window.addEventListener('settings:change', () => { render(); });

renderModeToggle();
renderToolbar();
render();
