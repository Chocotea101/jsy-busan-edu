/* ============================================================
   유세송 — 유튜브 임베드 + mp4 영상
   - 카드엔 썸네일+제목+▶, 클릭하면 라이트박스로 크게 재생
   ▶ 콘텐츠는 아래 SONGS 배열에 직접 추가 (코드 고정)
   ============================================================ */

const SONGS = [
  {
    type: 'youtube',
    id: 'sxqW-NjHLak',
    title: '01. 안전한 등하교길',
    desc: '정승윤 부산교육감 후보 로고송'
  },
  {
    type: 'youtube',
    id: '392rmOr-w9c',
    title: '02. 믿고 맡겨줘요',
    desc: '정승윤 부산교육감 후보 로고송'
  },

  /* ===== 추가 형식 참고 =====
  // 유튜브:  { type: 'youtube', id: '유튜브주소 또는 ID', title: '...', desc: '...' }
  // mp4영상: { type: 'mp4', src: 'assets/songs/파일.mp4', poster: '썸네일(선택)', title: '...', desc: '...' }
  ===== */
];

/* ============================================================ */

const listEl = document.getElementById('songs-list');
const emptyEl = document.getElementById('songs-empty');

function ytId(input) {
  if (!input) return '';
  const m = input.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : input;
}

function ytThumb(id) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

function render() {
  if (!SONGS || SONGS.length === 0) {
    emptyEl.style.display = 'block';
    listEl.style.display = 'none';
    return;
  }
  emptyEl.style.display = 'none';
  listEl.style.display = 'grid';
  listEl.classList.toggle('single', SONGS.length === 1);

  listEl.innerHTML = SONGS.map((s, i) => {
    let thumb = '';
    if (s.type === 'youtube') {
      thumb = `<img src="${ytThumb(ytId(s.id))}" alt="${escapeAttr(s.title || '유세송')}" loading="lazy">`;
    } else if (s.type === 'mp4') {
      thumb = s.poster
        ? `<img src="${escapeAttr(s.poster)}" alt="${escapeAttr(s.title || '유세송')}" loading="lazy">`
        : `<div class="song-thumb-fallback">🎬</div>`;
    }
    return `
      <article class="song-card" data-idx="${i}" tabindex="0" role="button" aria-label="${escapeAttr(s.title || '유세송')} 재생">
        <div class="song-media">
          ${thumb}
          <div class="song-play-btn" aria-hidden="true">▶</div>
        </div>
        <div class="song-info">
          <h3 class="song-title">${escapeHtml(s.title || `유세송 ${i + 1}`)}</h3>
          ${s.desc ? `<p class="song-desc">${escapeHtml(s.desc)}</p>` : ''}
        </div>
      </article>`;
  }).join('');

  listEl.querySelectorAll('.song-card').forEach(card => {
    const open = () => openSongLightbox(Number(card.dataset.idx));
    card.addEventListener('click', open);
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });
}

/* ===== 라이트박스 ===== */
function openSongLightbox(idx) {
  const s = SONGS[idx];
  if (!s) return;

  let lb = document.getElementById('song-lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'song-lightbox';
    lb.className = 'song-lightbox';
    lb.innerHTML = `
      <button class="song-lb-close" id="song-lb-close" aria-label="닫기">✕</button>
      <button class="song-lb-arrow song-lb-prev" id="song-lb-prev" aria-label="이전 곡">←</button>
      <button class="song-lb-arrow song-lb-next" id="song-lb-next" aria-label="다음 곡">→</button>
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
  }

  lb._idx = idx;
  renderSongLightbox();
  lb.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function renderSongLightbox() {
  const lb = document.getElementById('song-lightbox');
  const idx = lb._idx;
  const s = SONGS[idx];
  const media = lb.querySelector('#song-lb-media');
  const caption = lb.querySelector('#song-lb-caption');

  if (s.type === 'youtube') {
    media.innerHTML = `
      <iframe
        src="https://www.youtube.com/embed/${ytId(s.id)}?autoplay=1&rel=0"
        title="${escapeAttr(s.title || '유세송')}"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen></iframe>`;
  } else if (s.type === 'mp4') {
    media.innerHTML = `
      <video controls autoplay playsinline ${s.poster ? `poster="${escapeAttr(s.poster)}"` : ''}>
        <source src="${escapeAttr(s.src)}" type="video/mp4">
      </video>`;
  }

  caption.innerHTML = `
    <div class="song-lb-title">${escapeHtml(s.title || '유세송')}</div>
    ${s.desc ? `<div class="song-lb-desc">${escapeHtml(s.desc)}</div>` : ''}
    ${SONGS.length > 1 ? `<div class="song-lb-counter">${idx + 1} / ${SONGS.length}</div>` : ''}
  `;

  lb.querySelector('#song-lb-prev').style.display = (SONGS.length > 1) ? '' : 'none';
  lb.querySelector('#song-lb-next').style.display = (SONGS.length > 1) ? '' : 'none';
  lb.querySelector('#song-lb-prev').disabled = idx === 0;
  lb.querySelector('#song-lb-next').disabled = idx === SONGS.length - 1;
}

function stepSong(d) {
  const lb = document.getElementById('song-lightbox');
  const next = lb._idx + d;
  if (next < 0 || next >= SONGS.length) return;
  lb._idx = next;
  renderSongLightbox();
}

function closeSongLightbox() {
  const lb = document.getElementById('song-lightbox');
  if (!lb) return;
  lb.classList.remove('is-open');
  document.body.style.overflow = '';
  // 영상 정지 — iframe/video 제거
  const media = lb.querySelector('#song-lb-media');
  if (media) media.innerHTML = '';
}

function escapeAttr(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeHtml(s) { return escapeAttr(s); }

render();
