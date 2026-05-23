/* ============================================================
   활동사진 갤러리 — Google Drive 연동 (보기 + 관리자 업로드/삭제)

   ▶ 작동 방식
   - 공개 폴더의 이미지를 자동으로 갤러리 표시 (비로그인도 보기 가능)
   - 관리자(Drive 폴더 편집권 보유자)가 로그인하면 업로드/삭제 UI 활성화

   ▶ 설정 값
   - GDRIVE_FOLDER_ID: Google Drive 폴더의 ID
   - GDRIVE_API_KEY:   비로그인 사용자가 폴더를 읽기 위한 API 키
   - GOOGLE_CLIENT_ID는 admin.js 에 입력
   ============================================================ */

const GDRIVE_FOLDER_ID = ''; // ← 폴더 ID 입력
const GDRIVE_API_KEY   = ''; // ← API 키 입력

/* ============================================================ */

const gridEl = document.getElementById('activities-grid');
const statusEl = document.getElementById('activities-status');
const toolbarEl = document.getElementById('activities-toolbar');
const lightboxEl = document.getElementById('lightbox');
const lightboxImgEl = document.getElementById('lightbox-img');
const lightboxCaptionEl = document.getElementById('lightbox-caption');
const lightboxCounterEl = document.getElementById('lightbox-counter');

let photos = [];
let lightboxIndex = -1;

/* ===== 상태 메시지 ===== */
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
      <p>${window.Admin?.isLoggedIn()
        ? '아래 "+ 사진 추가" 버튼으로 사진을 올려보세요.'
        : '관리자가 사진을 올리면 이곳에 자동으로 표시됩니다.'}</p>
    </div>
  `;
}

function clearStatus() { statusEl.innerHTML = ''; }

/* ===== 토스트 ===== */
function toast(msg, type = 'info') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.className = `toast toast-${type} is-visible`;
  el.textContent = msg;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('is-visible'), 3000);
}

/* ===== Google Drive — 목록 ===== */
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

    renderToolbar();
    if (photos.length === 0) { showEmpty(); gridEl.innerHTML = ''; return; }
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

/* ===== 그리드 + 툴바 ===== */
function renderToolbar() {
  const logged = window.Admin?.isLoggedIn();
  if (!logged) { toolbarEl.innerHTML = ''; return; }
  toolbarEl.innerHTML = `
    <div class="activities-admin-bar">
      <span class="admin-badge">관리자 모드</span>
      <label class="btn btn-primary upload-btn">
        <input type="file" id="upload-input" accept="image/*" multiple hidden>
        <span>+ 사진 추가</span>
      </label>
      <span class="admin-tip">사진을 호버하면 삭제 버튼이 보입니다</span>
    </div>
  `;
  document.getElementById('upload-input').addEventListener('change', onUploadFiles);
}

function renderGrid() {
  const logged = window.Admin?.isLoggedIn();
  gridEl.innerHTML = photos.map((p, i) => `
    <div class="activity-item" data-idx="${i}" data-id="${p.id}">
      <img src="${thumbUrl(p.id, 800)}" alt="${escapeAttr(p.name)}" loading="lazy">
      ${logged ? `<button class="activity-delete" data-id="${p.id}" data-name="${escapeAttr(p.name)}" aria-label="삭제">✕</button>` : ''}
    </div>
  `).join('');

  gridEl.querySelectorAll('.activity-item').forEach(el => {
    el.querySelector('img').addEventListener('click', () => openLightbox(Number(el.dataset.idx)));
  });
  gridEl.querySelectorAll('.activity-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onDelete(btn.dataset.id, btn.dataset.name);
    });
  });
}

function escapeAttr(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* ===== 업로드 ===== */
async function onUploadFiles(e) {
  const files = Array.from(e.target.files || []);
  e.target.value = ''; // reset for next pick
  if (files.length === 0) return;
  const token = window.Admin?.getToken();
  if (!token) { toast('로그인이 필요합니다.', 'error'); return; }

  toast(`${files.length}장 업로드 중…`, 'info');
  let ok = 0, fail = 0;

  for (const file of files) {
    try {
      await uploadOne(file, token);
      ok++;
    } catch (err) {
      fail++;
      console.error('[Upload] failed:', file.name, err);
    }
  }

  if (fail === 0) toast(`${ok}장 업로드 완료`, 'success');
  else if (ok > 0) toast(`${ok}장 성공 · ${fail}장 실패`, 'error');
  else toast(`업로드 실패. 폴더 편집 권한이 있는지 확인해주세요.`, 'error');

  await loadPhotos();
}

async function uploadOne(file, token) {
  const metadata = { name: file.name, parents: [GDRIVE_FOLDER_ID] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
}

/* ===== 삭제 ===== */
async function onDelete(id, name) {
  if (!confirm(`정말로 "${name}" 사진을 삭제할까요?\n삭제하면 Google Drive에서도 영구 제거됩니다.`)) return;
  const token = window.Admin?.getToken();
  if (!token) { toast('로그인이 필요합니다.', 'error'); return; }

  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    toast('삭제 완료', 'success');
    await loadPhotos();
  } catch (e) {
    toast('삭제 실패: ' + e.message, 'error');
  }
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
function nextPhoto() { if (lightboxIndex < photos.length - 1) { lightboxIndex++; updateLightbox(); } }
function prevPhoto() { if (lightboxIndex > 0) { lightboxIndex--; updateLightbox(); } }

document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
document.getElementById('lightbox-prev').addEventListener('click', prevPhoto);
document.getElementById('lightbox-next').addEventListener('click', nextPhoto);
lightboxEl.addEventListener('click', e => { if (e.target === lightboxEl) closeLightbox(); });

document.addEventListener('keydown', e => {
  if (!lightboxEl.classList.contains('is-open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowRight') nextPhoto();
  if (e.key === 'ArrowLeft') prevPhoto();
});

let touchStart = null;
lightboxEl.addEventListener('touchstart', e => { touchStart = e.touches[0].clientX; }, { passive: true });
lightboxEl.addEventListener('touchend', e => {
  if (touchStart === null) return;
  const dx = e.changedTouches[0].clientX - touchStart;
  if (Math.abs(dx) > 50) { if (dx < 0) nextPhoto(); else prevPhoto(); }
  touchStart = null;
}, { passive: true });

/* ===== 로그인 상태 변화 시 UI 갱신 ===== */
window.addEventListener('admin:change', () => {
  renderToolbar();
  if (photos.length > 0) renderGrid();
  else if (statusEl.querySelector('.activities-empty')) showEmpty();
});

/* ===== 초기 로드 ===== */
loadPhotos();
