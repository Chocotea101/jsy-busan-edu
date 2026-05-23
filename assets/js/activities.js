/* ============================================================
   활동사진 갤러리 — Google Drive 연동
   - 게시물 단위: 사진 1장 + 제목 + 본문 (글)
   - 사진은 Drive에 저장, 글은 사진 파일의 description 필드에 JSON으로 저장
   - 사이트는 Drive에서 listing만 — 저장하지 않고 불러올 때만 접근
   - 관리자 로그인 시 글쓰기/삭제 UI 활성화
   ============================================================ */

const GDRIVE_FOLDER_ID = ''; // ← 폴더 ID 입력
const GDRIVE_API_KEY   = ''; // ← API 키 입력

/* ============================================================ */

const gridEl       = document.getElementById('activities-grid');
const statusEl     = document.getElementById('activities-status');
const toolbarEl    = document.getElementById('activities-toolbar');
const lightboxEl   = document.getElementById('lightbox');
const lightboxImgEl     = document.getElementById('lightbox-img');
const lightboxCaptionEl = document.getElementById('lightbox-caption');
const lightboxCounterEl = document.getElementById('lightbox-counter');

let posts = [];          // [{id, title, body, createdTime, name}, ...]
let lightboxIndex = -1;

/* ===== 메타데이터 파싱 ===== */
function parsePost(file) {
  let title = '';
  let body = '';
  if (file.description) {
    try {
      const d = JSON.parse(file.description);
      title = d.title || '';
      body = d.body || '';
    } catch {
      // JSON 아니면 본문으로 취급
      body = file.description;
    }
  }
  return {
    id: file.id,
    name: file.name,
    title,
    body,
    createdTime: file.createdTime
  };
}

function stringifyPost(title, body) {
  return JSON.stringify({ title: title || '', body: body || '' });
}

/* ===== 상태 메시지 ===== */
function showSetupNotice() {
  statusEl.innerHTML = `
    <div class="activities-empty">
      <strong>📷 설정이 필요합니다</strong>
      <p>Google Drive 폴더 ID와 API 키를 <code>assets/js/activities.js</code> 파일 맨 위에 입력하면 자동으로 활동사진이 표시됩니다.</p>
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
      <p>${escapeHtml(msg)}</p>
    </div>
  `;
}
function showEmpty() {
  const logged = window.Admin?.isLoggedIn();
  statusEl.innerHTML = `
    <div class="activities-empty">
      <strong>아직 등록된 게시물이 없습니다</strong>
      <p>${logged ? '아래 "+ 새 글쓰기" 버튼으로 첫 게시물을 작성해보세요.' : '관리자가 글을 올리면 이곳에 자동으로 표시됩니다.'}</p>
    </div>
  `;
}
function clearStatus() { statusEl.innerHTML = ''; }

/* ===== 토스트 ===== */
function toast(msg, type = 'info') {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; document.body.appendChild(el); }
  el.className = `toast toast-${type} is-visible`;
  el.textContent = msg;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('is-visible'), 3000);
}

/* ===== Google Drive — 목록 불러오기 ===== */
async function loadPosts() {
  if (!GDRIVE_FOLDER_ID || !GDRIVE_API_KEY) { showSetupNotice(); return; }
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
    posts = (data.files || []).map(parsePost);

    renderToolbar();
    if (posts.length === 0) { showEmpty(); gridEl.innerHTML = ''; return; }
    clearStatus();
    renderGrid();
  } catch (e) {
    showError(e.message);
    console.error('[Activities] Drive API error:', e);
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
      <button class="btn btn-primary" id="open-post-modal">+ 새 글쓰기</button>
      <span class="admin-tip">사진을 호버하면 삭제 버튼이 보입니다</span>
    </div>
  `;
  document.getElementById('open-post-modal').addEventListener('click', openPostModal);
}

function renderGrid() {
  const logged = window.Admin?.isLoggedIn();
  gridEl.innerHTML = posts.map((p, i) => `
    <div class="activity-item ${p.title ? 'has-title' : ''}" data-idx="${i}">
      <img src="${thumbUrl(p.id, 800)}" alt="${escapeAttr(p.title || p.name)}" loading="lazy">
      ${p.title ? `<div class="activity-title">${escapeHtml(p.title)}</div>` : ''}
      ${logged ? `
        <button class="activity-delete" data-id="${p.id}" data-title="${escapeAttr(p.title || p.name)}" aria-label="삭제">✕</button>
      ` : ''}
    </div>
  `).join('');

  gridEl.querySelectorAll('.activity-item').forEach(el => {
    el.querySelector('img').addEventListener('click', () => openLightbox(Number(el.dataset.idx)));
    const titleEl = el.querySelector('.activity-title');
    if (titleEl) titleEl.addEventListener('click', () => openLightbox(Number(el.dataset.idx)));
  });
  gridEl.querySelectorAll('.activity-delete').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      onDelete(btn.dataset.id, btn.dataset.title);
    });
  });
}

function escapeAttr(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeHtml(s) { return escapeAttr(s); }

/* ============================================================
   글쓰기 모달
   ============================================================ */
function openPostModal() {
  let modal = document.getElementById('post-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'post-modal';
    modal.className = 'post-modal';
    modal.innerHTML = `
      <div class="post-modal-backdrop"></div>
      <div class="post-modal-body">
        <button class="post-modal-close" type="button" aria-label="닫기">✕</button>
        <h3>새 글쓰기</h3>
        <form id="post-form">
          <label class="post-field">
            <span class="post-label">제목 <small>(선택)</small></span>
            <input type="text" id="post-title" maxlength="100" placeholder="제목을 입력하세요">
          </label>
          <label class="post-field">
            <span class="post-label">본문 <small>(선택)</small></span>
            <textarea id="post-body" rows="6" maxlength="2000" placeholder="현장에서 있었던 일, 느낀 점 등을 적어주세요"></textarea>
          </label>
          <label class="post-field">
            <span class="post-label">사진 <small>(필수)</small></span>
            <div class="post-file-drop" id="post-file-drop">
              <input type="file" id="post-file" accept="image/*" required>
              <div class="post-file-placeholder">클릭하거나 사진을 드래그해서 선택하세요</div>
              <img id="post-file-preview" class="post-file-preview" alt="" style="display:none;">
            </div>
          </label>
          <div class="post-modal-actions">
            <button type="button" class="btn btn-ghost" id="post-cancel">취소</button>
            <button type="submit" class="btn btn-primary" id="post-submit">올리기</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.post-modal-backdrop').addEventListener('click', closePostModal);
    modal.querySelector('.post-modal-close').addEventListener('click', closePostModal);
    modal.querySelector('#post-cancel').addEventListener('click', closePostModal);

    const fileInput = modal.querySelector('#post-file');
    const drop = modal.querySelector('#post-file-drop');
    const preview = modal.querySelector('#post-file-preview');
    const placeholder = modal.querySelector('.post-file-placeholder');

    fileInput.addEventListener('change', () => updateFilePreview(fileInput.files[0], preview, placeholder));

    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => {
      e.preventDefault(); drop.classList.add('is-dragover');
    }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => {
      e.preventDefault(); drop.classList.remove('is-dragover');
    }));
    drop.addEventListener('drop', e => {
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith('image/')) {
        const dt = new DataTransfer();
        dt.items.add(f);
        fileInput.files = dt.files;
        updateFilePreview(f, preview, placeholder);
      }
    });

    modal.querySelector('#post-form').addEventListener('submit', onSubmitPost);
  }
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => modal.querySelector('#post-title').focus(), 50);
}

function closePostModal() {
  const modal = document.getElementById('post-modal');
  if (!modal) return;
  modal.classList.remove('is-open');
  document.body.style.overflow = '';
  // reset form
  const form = modal.querySelector('#post-form');
  form.reset();
  const preview = modal.querySelector('#post-file-preview');
  const placeholder = modal.querySelector('.post-file-placeholder');
  preview.style.display = 'none';
  placeholder.style.display = '';
}

function updateFilePreview(file, previewEl, placeholderEl) {
  if (!file) { previewEl.style.display = 'none'; placeholderEl.style.display = ''; return; }
  const url = URL.createObjectURL(file);
  previewEl.src = url;
  previewEl.style.display = 'block';
  placeholderEl.style.display = 'none';
}

async function onSubmitPost(e) {
  e.preventDefault();
  const title = document.getElementById('post-title').value.trim();
  const body = document.getElementById('post-body').value.trim();
  const fileInput = document.getElementById('post-file');
  const file = fileInput.files[0];
  if (!file) { toast('사진을 선택해주세요.', 'error'); return; }

  const token = window.Admin?.getToken();
  if (!token) { toast('로그인이 필요합니다.', 'error'); return; }

  const submitBtn = document.getElementById('post-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = '올리는 중…';

  try {
    await uploadPost(file, title, body, token);
    closePostModal();
    toast('게시물이 등록되었습니다.', 'success');
    await loadPosts();
  } catch (err) {
    toast('업로드 실패: ' + err.message, 'error');
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '올리기';
  }
}

async function uploadPost(file, title, body, token) {
  const metadata = {
    name: file.name,
    parents: [GDRIVE_FOLDER_ID],
    description: stringifyPost(title, body)
  };
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
async function onDelete(id, label) {
  if (!confirm(`"${label}" 게시물을 정말 삭제할까요?\n사진과 글이 영구 삭제됩니다.`)) return;
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
    await loadPosts();
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
  const p = posts[lightboxIndex];
  if (!p) return;
  lightboxImgEl.src = thumbUrl(p.id, 1600);
  lightboxImgEl.alt = p.title || p.name;

  const dateStr = p.createdTime ? new Date(p.createdTime).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  let captionHTML = '';
  if (p.title) captionHTML += `<div class="lb-title">${escapeHtml(p.title)}</div>`;
  if (p.body)  captionHTML += `<div class="lb-body">${escapeHtml(p.body).replace(/\n/g, '<br>')}</div>`;
  if (dateStr) captionHTML += `<div class="lb-date">${dateStr}</div>`;
  if (!captionHTML) captionHTML = `<div class="lb-body">${escapeHtml(p.name.replace(/\.[^.]+$/, ''))}</div>`;
  lightboxCaptionEl.innerHTML = captionHTML;
  lightboxCounterEl.textContent = `${lightboxIndex + 1} / ${posts.length}`;
}
function nextPhoto() { if (lightboxIndex < posts.length - 1) { lightboxIndex++; updateLightbox(); } }
function prevPhoto() { if (lightboxIndex > 0) { lightboxIndex--; updateLightbox(); } }

document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
document.getElementById('lightbox-prev').addEventListener('click', prevPhoto);
document.getElementById('lightbox-next').addEventListener('click', nextPhoto);
lightboxEl.addEventListener('click', e => { if (e.target === lightboxEl) closeLightbox(); });

document.addEventListener('keydown', e => {
  // 모달 열려 있을 땐 라이트박스 키 무시
  if (document.getElementById('post-modal')?.classList.contains('is-open')) {
    if (e.key === 'Escape') closePostModal();
    return;
  }
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
  if (posts.length > 0) renderGrid();
  else if (statusEl.querySelector('.activities-empty')) showEmpty();
});

/* ===== 초기 로드 ===== */
loadPosts();
