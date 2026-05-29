/* ============================================================
   유세송 — 유튜브 임베드 + mp4 영상
   ▶ 콘텐츠는 아래 SONGS 배열에 직접 추가 (코드 고정)
   ============================================================ */

const SONGS = [
  {
    type: 'youtube',
    id: 'sxqW-NjHLak',
    title: '01. 안전한 등하교길',
    desc: '정승윤 부산교육감 후보 로고송'
  },

  /* ===== 추가 형식 참고 =====
  // 유튜브:  { type: 'youtube', id: '유튜브주소 또는 ID', title: '...', desc: '...' }
  // mp4영상: { type: 'mp4', src: 'assets/songs/파일.mp4', title: '...', desc: '...' }
  ===== */
];

/* ============================================================ */

const listEl = document.getElementById('songs-list');
const emptyEl = document.getElementById('songs-empty');

function ytId(input) {
  // 전체 URL이 들어와도 ID만 뽑기
  if (!input) return '';
  const m = input.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : input;
}

function render() {
  if (!SONGS || SONGS.length === 0) {
    emptyEl.style.display = 'block';
    listEl.style.display = 'none';
    return;
  }
  emptyEl.style.display = 'none';
  listEl.style.display = 'grid';

  listEl.innerHTML = SONGS.map((s, i) => {
    let media = '';
    if (s.type === 'youtube') {
      const id = ytId(s.id);
      media = `
        <div class="song-media">
          <iframe
            src="https://www.youtube.com/embed/${id}"
            title="${escapeAttr(s.title || '유세송')}"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            loading="lazy"></iframe>
        </div>`;
    } else if (s.type === 'mp4') {
      media = `
        <div class="song-media">
          <video controls preload="metadata" ${s.poster ? `poster="${escapeAttr(s.poster)}"` : ''} playsinline>
            <source src="${escapeAttr(s.src)}" type="video/mp4">
            영상을 재생할 수 없습니다.
          </video>
        </div>`;
    }
    return `
      <article class="song-card">
        ${media}
        <div class="song-info">
          <h3 class="song-title">${escapeHtml(s.title || `유세송 ${i + 1}`)}</h3>
          ${s.desc ? `<p class="song-desc">${escapeHtml(s.desc)}</p>` : ''}
        </div>
      </article>`;
  }).join('');
}

function escapeAttr(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeHtml(s) { return escapeAttr(s); }

render();
