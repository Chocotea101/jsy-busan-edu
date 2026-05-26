/* ============================================================
   활동사진 갤러리 — Google Drive 연동
   - 게시물 단위: 사진 1장 + 제목 + 본문 (글)
   - 사진은 Drive에 저장, 글은 사진 파일의 description 필드에 JSON으로 저장
   - 사이트는 Drive에서 listing만 — 저장하지 않고 불러올 때만 접근
   - 관리자 로그인 시 글쓰기/삭제 UI 활성화
   ============================================================ */

const GDRIVE_FOLDER_ID = '1puev3p72soyTCByHDKXmcary41Kni4lb';
const GDRIVE_API_KEY   = 'AIzaSyA6GCjF7kj-ClInis5sbjWxKQ7B8RIZfTI';

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
  let title = '', body = '', pinned = false;
  if (file.description) {
    try {
      const d = JSON.parse(file.description);
      title = d.title || '';
      body = d.body || '';
      pinned = !!d.pinned;
    } catch {
      body = file.description;
    }
  }
  return {
    id: file.id,
    name: file.name,
    title, body, pinned,
    createdTime: file.createdTime
  };
}

function stringifyPost(title, body, pinned = false) {
  return JSON.stringify({ title: title || '', body: body || '', pinned: !!pinned });
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

    // 핀 게시물 먼저, 그 다음 최신순
    posts.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.createdTime) - new Date(a.createdTime);
    });

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
    <div class="activity-item ${p.title ? 'has-title' : ''} ${p.pinned ? 'is-pinned' : ''}" data-idx="${i}">
      <img src="${thumbUrl(p.id, 800)}" alt="${escapeAttr(p.title || p.name)}" loading="lazy">
      ${p.pinned ? `<div class="pin-badge" title="고정됨">📌</div>` : ''}
      ${p.title ? `<div class="activity-title">${escapeHtml(p.title)}</div>` : ''}
      ${logged ? `
        <div class="post-actions">
          <button class="post-action-btn pin-btn" data-idx="${i}" data-id="${p.id}" aria-label="${p.pinned ? '고정 해제' : '고정'}" title="${p.pinned ? '고정 해제' : '맨 위 고정'}">${p.pinned ? '📌' : '📍'}</button>
          <button class="post-action-btn edit-btn" data-idx="${i}" aria-label="수정" title="수정">✏️</button>
          <button class="post-action-btn delete-btn" data-id="${p.id}" data-title="${escapeAttr(p.title || p.name)}" aria-label="삭제" title="삭제">✕</button>
        </div>
      ` : ''}
    </div>
  `).join('');

  gridEl.querySelectorAll('.activity-item').forEach(el => {
    el.querySelector('img').addEventListener('click', () => openLightbox(Number(el.dataset.idx)));
    const titleEl = el.querySelector('.activity-title');
    if (titleEl) titleEl.addEventListener('click', () => openLightbox(Number(el.dataset.idx)));
  });
  gridEl.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      onDelete(btn.dataset.id, btn.dataset.title);
    });
  });
  gridEl.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const post = posts[Number(btn.dataset.idx)];
      openPostModal({ editId: post.id, title: post.title, body: post.body, pinned: post.pinned });
    });
  });
  gridEl.querySelectorAll('.pin-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      await onTogglePin(Number(btn.dataset.idx));
    });
  });
}

async function onTogglePin(idx) {
  const post = posts[idx];
  if (!post) return;
  const token = window.Admin?.getToken();
  if (!token) { toast('로그인이 필요합니다.', 'error'); return; }
  try {
    await updatePostMeta(post.id, post.title, post.body, !post.pinned, token);
    toast(post.pinned ? '고정 해제됨' : '맨 위에 고정됨', 'success');
    await loadPosts();
  } catch (e) {
    toast('실패: ' + e.message, 'error');
  }
}

async function updatePostMeta(id, title, body, pinned, token) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: stringifyPost(title, body, pinned) })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
}

function escapeAttr(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function escapeHtml(s) { return escapeAttr(s); }

/* ============================================================
   글쓰기 모달
   ============================================================ */
function openPostModal(init = {}) {
  let modal = document.getElementById('post-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'post-modal';
    modal.className = 'post-modal';
    modal.innerHTML = `
      <div class="post-modal-backdrop"></div>
      <div class="post-modal-body">
        <button class="post-modal-close" type="button" aria-label="닫기">✕</button>
        <h3 id="post-modal-title">새 글쓰기</h3>
        <form id="post-form">
          <label class="post-field">
            <span class="post-label">제목 <small>(선택)</small></span>
            <input type="text" id="post-title" maxlength="100" placeholder="제목을 입력하세요">
          </label>
          <label class="post-field">
            <span class="post-label">본문 <small>(선택)</small></span>
            <textarea id="post-body" rows="6" maxlength="2000" placeholder="현장에서 있었던 일, 느낀 점 등을 적어주세요"></textarea>
          </label>
          <label class="post-field" id="post-file-field">
            <span class="post-label">사진 <small id="post-file-hint">(필수 · 여러 장 선택 가능)</small></span>
            <div class="post-file-drop" id="post-file-drop">
              <input type="file" id="post-file" accept="image/*" multiple required>
              <div class="post-file-placeholder">클릭하거나 사진을 드래그해서 선택하세요<br><small>여러 장 선택하면 각각 별도 게시물로 올라갑니다</small></div>
              <div id="post-file-list" class="post-file-list" style="display:none;"></div>
            </div>
          </label>
          <label class="post-field" style="display:flex; align-items:center; gap:10px;">
            <input type="checkbox" id="post-pinned" style="width:18px; height:18px; cursor:pointer;">
            <span style="font-size:14px; font-weight:700; color:var(--gray-700);">📌 맨 위에 고정</span>
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

    fileInput.addEventListener('change', () => updateFileList(fileInput.files));

    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => {
      e.preventDefault(); drop.classList.add('is-dragover');
    }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => {
      e.preventDefault(); drop.classList.remove('is-dragover');
    }));
    drop.addEventListener('drop', e => {
      const dt = new DataTransfer();
      Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')).forEach(f => dt.items.add(f));
      if (dt.files.length > 0) {
        fileInput.files = dt.files;
        updateFileList(fileInput.files);
      }
    });

    modal.querySelector('#post-form').addEventListener('submit', onSubmitPost);
  }
  // 수정/새 작성 분기
  const isEdit = !!init.editId;
  modal._editId = init.editId || null;
  modal.querySelector('#post-modal-title').textContent = isEdit ? '글 수정' : '새 글쓰기';
  modal.querySelector('#post-title').value = init.title || '';
  modal.querySelector('#post-body').value = init.body || '';
  modal.querySelector('#post-pinned').checked = !!init.pinned;
  modal.querySelector('#post-file-field').style.display = isEdit ? 'none' : 'block';
  modal.querySelector('#post-submit').textContent = isEdit ? '저장' : '올리기';
  // 파일 입력 초기화
  modal.querySelector('#post-file').value = '';
  updateFileList(null);

  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => modal.querySelector('#post-title').focus(), 50);
}

function closePostModal() {
  const modal = document.getElementById('post-modal');
  if (!modal) return;
  modal.classList.remove('is-open');
  document.body.style.overflow = '';
  modal._editId = null;
  modal.querySelector('#post-form').reset();
  updateFileList(null);
}

function updateFileList(files) {
  const list = document.getElementById('post-file-list');
  const placeholder = document.querySelector('#post-modal .post-file-placeholder');
  if (!files || files.length === 0) {
    list.style.display = 'none';
    placeholder.style.display = '';
    list.innerHTML = '';
    return;
  }
  list.style.display = 'block';
  placeholder.style.display = 'none';
  list.innerHTML = Array.from(files).map((f, i) => `
    <div class="post-file-item">
      <img src="${URL.createObjectURL(f)}" alt="${escapeAttr(f.name)}">
      <div class="post-file-info">
        <div class="post-file-name">${escapeHtml(f.name)}</div>
        <div class="post-file-size">${(f.size / 1024).toFixed(0)} KB</div>
      </div>
    </div>
  `).join('') + `<div class="post-file-summary">총 <strong>${files.length}장</strong> 선택됨${files.length > 1 ? ' · 각각 별도 게시물' : ''}</div>`;
}

async function onSubmitPost(e) {
  e.preventDefault();
  const modal = document.getElementById('post-modal');
  const title = document.getElementById('post-title').value.trim();
  const body = document.getElementById('post-body').value.trim();
  const pinned = document.getElementById('post-pinned').checked;
  const editId = modal._editId;
  const token = window.Admin?.getToken();
  if (!token) { toast('로그인이 필요합니다.', 'error'); return; }

  const submitBtn = document.getElementById('post-submit');
  submitBtn.disabled = true;

  try {
    if (editId) {
      // 수정 모드 — 메타데이터만 PATCH
      submitBtn.textContent = '저장 중…';
      await updatePostMeta(editId, title, body, pinned, token);
      closePostModal();
      toast('수정되었습니다.', 'success');
      await loadPosts();
    } else {
      // 새 글 — 다중 파일 업로드
      const files = Array.from(document.getElementById('post-file').files);
      if (files.length === 0) { toast('사진을 선택해주세요.', 'error'); return; }

      let ok = 0, fail = 0;
      for (let i = 0; i < files.length; i++) {
        submitBtn.textContent = `올리는 중… (${i + 1}/${files.length})`;
        try {
          await uploadPost(files[i], title, body, pinned, token);
          ok++;
        } catch (err) {
          fail++;
          console.error('Upload failed:', files[i].name, err);
        }
      }
      closePostModal();
      if (fail === 0) toast(`${ok}장 모두 등록됨`, 'success');
      else if (ok > 0) toast(`${ok}장 성공 · ${fail}장 실패`, 'error');
      else toast('업로드 실패 — 폴더 권한을 확인해주세요', 'error');
      await loadPosts();
    }
  } catch (err) {
    toast('실패: ' + err.message, 'error');
    console.error(err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = editId ? '저장' : '올리기';
  }
}

async function uploadPost(file, title, body, pinned, token) {
  const metadata = {
    name: file.name,
    parents: [GDRIVE_FOLDER_ID],
    description: stringifyPost(title, body, pinned)
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
