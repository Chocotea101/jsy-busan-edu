/* ============================================================
   활동사진 갤러리 — Google Drive 연동

   ▶ 작동 방식
   - 공유된 Google Drive 폴더의 이미지를 자동으로 불러와 갤러리로 표시
   - 관리자는 Google Drive에 사진 업로드/삭제만 하면 사이트에 반영됨
   - 폴더에 사진을 새로 올리면 1분 정도 후 사이트 새로고침으로 반영

   ▶ 설정해야 할 값 (정이슬님이 입력)
   - GDRIVE_FOLDER_ID: Google Drive 폴더의 ID
   - GDRIVE_API_KEY: Google Cloud Console에서 발급한 API 키
   ============================================================ */

const GDRIVE_FOLDER_ID = ''; // ← 여기에 폴더 ID 입력
const GDRIVE_API_KEY   = ''; // ← 여기에 API 키 입력

/* ============================================================ */

const gridEl = document.getElementById('activities-grid');
const statusEl = document.getElementById('activities-status');
const lightboxEl = document.getElementById('lightbox');
const lightboxImgEl = document.getElementById('lightbox-img');
const lightboxCaptionEl = document.getElementById('lightbox-caption');
const lightboxCounterEl = document.getElementById('lightbox-counter');

let photos = [];
let lightboxIndex = -1;

function showSetupNotice() {
  statusEl.innerHTML = `
    <div class="activities-empty">
      <strong>📷 설정이 필요합니다</strong>
      <p>Google Drive 폴더 ID와 API 키를 <code>assets/js/activities.js</code> 파일 맨 위에 입력하면 자동으로 활동사진이 표시됩니다.</p>
      <p style="margin-top:12px; font-size:14px; color:var(--gray-500);">설정 방법은 정이슬님에게 전달된 가이드를 참고해주세요.</p>
    </div>
  `;
}

function showLoading() {
  statusEl.innerHTML = `<div class="activities-loading">활동사진을 불러오는 중…</div>`;
}

function showError(msg) {
  statusEl.innerHTML = `
    <div class="activities-empty">
      <strong>불러올 수 없습니다</strong>
      <p>${msg}</p>
    </div>
  `;
}

function showEmpty() {
  statusEl.innerHTML = `
    <div class="activities-empty">
      <strong>아직 등록된 사진이 없습니다</strong>
      <p>관리자가 Google Drive 폴더에 사진을 올리면 이곳에 자동으로 표시됩니다.</p>
    </div>
  `;
}

function clearStatus() {
  statusEl.innerHTML = '';
}

async function loadPhotos() {
  if (!GDRIVE_FOLDER_ID || !GDRIVE_API_KEY) {
    showSetupNotice();
    return;
  }

  showLoading();

  const url = new URL('https://www.googleapis.com/drive/v3/files');
  url.searchParams.set('q', `'${GDRIVE_FOLDER_ID}' in parents and mimeType contains 'image/' and trashed=false`);
  url.searchParams.set('fields', 'files(id,name,createdTime,modifiedTime,description)');
  url.searchParams.set('orderBy', 'createdTime desc');
  url.searchParams.set('pageSize', '200');
  url.searchParams.set('key', GDRIVE_API_KEY);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    photos = data.files || [];

    if (photos.length === 0) {
      showEmpty();
      return;
    }

    clearStatus();
    renderGrid();
  } catch (e) {
    showError(e.message);
    console.error('[Activities] Google Drive API error:', e);
  }
}

function thumbUrl(id, size = 800) {
  return `https://lh3.googleusercontent.com/d/${id}=w${size}`;
}

function renderGrid() {
  gridEl.innerHTML = photos.map((p, i) => `
    <button class="activity-item" data-idx="${i}" aria-label="${escapeAttr(p.name)} 크게 보기">
      <img src="${thumbUrl(p.id, 800)}" alt="${escapeAttr(p.name)}" loading="lazy">
    </button>
  `).join('');

  gridEl.querySelectorAll('.activity-item').forEach(el => {
    el.addEventListener('click', () => openLightbox(Number(el.dataset.idx)));
  });
}

function escapeAttr(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* ===== 라이트박스 ===== */

function openLightbox(idx) {
  lightboxIndex = idx;
  updateLightbox();
  lightboxEl.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightboxEl.classList.remove('is-open');
  document.body.style.overflow = '';
  lightboxIndex = -1;
}

function updateLightbox() {
  const p = photos[lightboxIndex];
  if (!p) return;
  lightboxImgEl.src = thumbUrl(p.id, 1600);
  lightboxImgEl.alt = p.name;
  lightboxCaptionEl.textContent = p.description || p.name.replace(/\.[^.]+$/, '');
  lightboxCounterEl.textContent = `${lightboxIndex + 1} / ${photos.length}`;
}

function nextPhoto() {
  if (lightboxIndex < photos.length - 1) {
    lightboxIndex++;
    updateLightbox();
  }
}

function prevPhoto() {
  if (lightboxIndex > 0) {
    lightboxIndex--;
    updateLightbox();
  }
}

document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
document.getElementById('lightbox-prev').addEventListener('click', prevPhoto);
document.getElementById('lightbox-next').addEventListener('click', nextPhoto);
lightboxEl.addEventListener('click', e => {
  if (e.target === lightboxEl) closeLightbox();
});

document.addEventListener('keydown', e => {
  if (!lightboxEl.classList.contains('is-open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowRight') nextPhoto();
  if (e.key === 'ArrowLeft') prevPhoto();
});

/* 모바일 스와이프 */
let touchStart = null;
lightboxEl.addEventListener('touchstart', e => {
  touchStart = e.touches[0].clientX;
}, { passive: true });
lightboxEl.addEventListener('touchend', e => {
  if (touchStart === null) return;
  const dx = e.changedTouches[0].clientX - touchStart;
  if (Math.abs(dx) > 50) {
    if (dx < 0) nextPhoto();
    else prevPhoto();
  }
  touchStart = null;
}, { passive: true });

/* 초기 로드 */
loadPhotos();
