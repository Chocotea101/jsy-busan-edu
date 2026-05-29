/* ============================================================
   관리자 전용 페이지 — 대표 영상 선택 / 글자 크기 / 바로가기
   (영상 목록은 songs.js의 DEFAULT_VIDEOS와 동일 구조를 여기서 재사용)
   ============================================================ */

/* 코드 기본 영상 (songs.js와 동일하게 유지) */
const ADMIN_DEFAULT_VIDEOS = {
  songs: [
    { id: 'sxqW-NjHLak', title: '01. 안전한 등하교길' },
    { id: '392rmOr-w9c', title: '02. 믿고 맡겨줘요' },
    { id: 'jZBrJird11s', title: '03. 바로 정승윤' }
  ],
  shorts: [
    { id: 'rrCftjxJbGk', title: '삭발 감행 이유' },
    { id: 'seZzjM-1m1s', title: '이재명 정부의 탄압' },
    { id: 'dw-dJZRhRjc', title: '부산 시민여러분께 드리는 인사' },
    { id: 'YBg6R9TvjmI', title: '현장 체험학습 정상화 방안' },
    { id: 'tNKZPe5gjDE', title: '211억원이 교육청 예산으로 운영' },
    { id: 'jIt6Ll-GR0g', title: '"저도 마찬가지입니다"' }
  ],
  debate: []
};
const ADMIN_CAT_LABEL = { songs: '유세송', debate: '토론회', shorts: '쇼츠' };

const gateEl = document.getElementById('admin-gate');
const panelEl = document.getElementById('admin-panel');

function adminToast(msg, type = 'info') {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
  el.className = `toast toast-${type} is-visible`;
  el.textContent = msg;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('is-visible'), 3000);
}

function ytThumb(id) { return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`; }

/* 모든 영상 (기본 + 관리자추가) 목록 */
function allVideos() {
  const added = window.SiteSettings?.get()?.videos || {};
  const out = [];
  ['debate', 'songs', 'shorts'].forEach(cat => {
    [...(ADMIN_DEFAULT_VIDEOS[cat] || []), ...((added[cat]) || [])].forEach(v => {
      out.push({ id: v.id, title: v.title || v.id, cat });
    });
  });
  return out;
}

/* ===== 로그인 게이트 ===== */
function syncGate() {
  const logged = window.Admin?.isLoggedIn();
  gateEl.style.display = logged ? 'none' : 'block';
  panelEl.style.display = logged ? 'block' : 'none';
  if (logged) {
    renderFeatured();
    renderFontLevel();
  }
}

document.getElementById('admin-gate-login').addEventListener('click', () => window.Admin?.login());
window.addEventListener('admin:change', syncGate);
window.addEventListener('settings:change', () => { if (window.Admin?.isLoggedIn()) renderFeatured(); });

/* ===== 대표 영상 ===== */
function renderFeatured() {
  const cur = window.SiteSettings?.get()?.featuredVideo || 'jZBrJird11s';
  const curEl = document.getElementById('featured-current');
  const vids = allVideos();
  const curVid = vids.find(v => v.id === cur);
  curEl.innerHTML = `
    <div class="featured-current-label">현재 대표 영상</div>
    <div class="featured-current-card">
      <img src="${ytThumb(cur)}" alt="현재 대표 영상">
      <div class="fc-title">${curVid ? escapeAdminHtml(curVid.title) : '(직접 지정된 영상)'}</div>
    </div>
  `;

  const picker = document.getElementById('featured-picker');
  picker.innerHTML = `<div class="featured-current-label" style="margin-top:18px;">목록에서 선택</div>` +
    `<div class="featured-grid">` +
    vids.map(v => `
      <button class="featured-pick ${v.id === cur ? 'is-current' : ''}" data-id="${v.id}">
        <img src="${ytThumb(v.id)}" alt="${escapeAdminAttr(v.title)}">
        <span class="fp-cat">${ADMIN_CAT_LABEL[v.cat]}</span>
        <span class="fp-title">${escapeAdminHtml(v.title)}</span>
      </button>
    `).join('') + `</div>`;

  picker.querySelectorAll('.featured-pick').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await window.SiteSettings.save({ featuredVideo: btn.dataset.id });
        adminToast('대표 영상이 변경되었습니다.', 'success');
        renderFeatured();
      } catch (e) {
        adminToast('변경 실패: ' + e.message, 'error');
      }
    });
  });
}

/* ===== 글자 크기 ===== */
function renderFontLevel() {
  const scale = window.SiteSettings?.get()?.fontScale || 1;
  const el = document.getElementById('ap-font-level');
  if (el) el.textContent = `${Math.round(scale * 100)}%`;
}

async function changeFont(delta) {
  const cur = window.SiteSettings?.get()?.fontScale || 1;
  let next = Math.round((cur + delta) * 10) / 10;
  next = Math.max(0.8, Math.min(1.6, next));
  try {
    await window.SiteSettings.save({ fontScale: next });
    renderFontLevel();
    adminToast('글자 크기 적용됨 (모든 방문자)', 'success');
  } catch (e) { adminToast('실패: ' + e.message, 'error'); }
}

document.getElementById('ap-font-in').addEventListener('click', () => changeFont(0.1));
document.getElementById('ap-font-out').addEventListener('click', () => changeFont(-0.1));
document.getElementById('ap-font-reset').addEventListener('click', async () => {
  try { await window.SiteSettings.save({ fontScale: 1 }); renderFontLevel(); adminToast('기본 크기로 복원', 'success'); }
  catch (e) { adminToast('실패: ' + e.message, 'error'); }
});

function escapeAdminAttr(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeAdminHtml(s) { return escapeAdminAttr(s); }

/* 초기 */
syncGate();
