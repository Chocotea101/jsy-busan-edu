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

/* ===== 메타데이터 파싱 =====
   - parent 있는 파일 = 추가 이미지 (마스터에 묶임)
   - 마스터 파일 = description에 글 + extras 배열
*/
function parseRaw(file) {
  let title = '', body = '', pinned = false, parent = null, extras = [];
  if (file.description) {
    try {
      const d = JSON.parse(file.description);
      title = d.title || '';
      body = d.body || '';
      pinned = !!d.pinned;
      parent = d.parent || null;
      extras = Array.isArray(d.extras) ? d.extras : [];
    } catch {
      body = file.description;
    }
  }
  return {
    id: file.id,
    name: file.name,
    title, body, pinned, parent, extras,
    createdTime: file.createdTime
  };
}

function stringifyMaster(title, body, pinned, extras) {
  return JSON.stringify({
    title: title || '',
    body: body || '',
    pinned: !!pinned,
    extras: Array.isArray(extras) ? extras : []
  });
}

function stringifyExtra(parentId) {
  return JSON.stringify({ parent: parentId });
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
    const all = (data.files || []).map(parseRaw);
    // 마스터 파일만 표시, 추가 파일은 마스터의 extras로 합침
    const idMap = new Map(all.map(f => [f.id, f]));
    posts = all
      .filter(f => !f.parent)
      .map(master => {
        const extraFiles = (master.extras || [])
          .map(id => idMap.get(id))
          .filter(Boolean);
        const imageIds = [master.id, ...extraFiles.map(f => f.id)];
        return { ...master, imageIds };
      });

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
  gridEl.innerHTML = posts.map((p, i) => {
    const imgCount = (p.imageIds || [p.id]).length;
    return `
    <div class="activity-item ${p.title ? 'has-title' : ''} ${p.pinned ? 'is-pinned' : ''}" data-idx="${i}">
      <img src="${thumbUrl(p.id, 800)}" alt="${escapeAttr(p.title || p.name)}" loading="lazy">
      ${imgCount > 1 ? `<div class="multi-badge" title="${imgCount}장">📷 ${imgCount}</div>` : ''}
      ${p.pinned ? `<div class="pin-badge" title="고정됨">📌</div>` : ''}
      ${p.title ? `<div class="activity-title">${escapeHtml(p.title)}</div>` : ''}
      ${logged ? `
        <div class="post-actions">
          <button class="post-action-btn pin-btn" data-idx="${i}" data-id="${p.id}" aria-label="${p.pinned ? '고정 해제' : '고정'}" title="${p.pinned ? '고정 해제' : '맨 위 고정'}">${p.pinned ? '📌' : '📍'}</button>
          <button class="post-action-btn edit-btn" data-idx="${i}" aria-label="수정" title="수정">✏️</button>
          <button class="post-action-btn delete-btn" data-id="${p.id}" data-extras="${escapeAttr((p.extras || []).join(','))}" data-title="${escapeAttr(p.title || p.name)}" aria-label="삭제" title="삭제">✕</button>
        </div>
      ` : ''}
    </div>
    `;
  }).join('');

  gridEl.querySelectorAll('.activity-item').forEach(el => {
    el.querySelector('img').addEventListener('click', () => openLightbox(Number(el.dataset.idx)));
    const titleEl = el.querySelector('.activity-title');
    if (titleEl) titleEl.addEventListener('click', () => openLightbox(Number(el.dataset.idx)));
  });
  gridEl.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      onDelete(btn.dataset.id, btn.dataset.title, btn.dataset.extras || '');
    });
  });
  gridEl.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const post = posts[Number(btn.dataset.idx)];
      openPostModal({ editId: post.id, editPost: post, title: post.title, body: post.body, pinned: post.pinned });
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
    await updatePostMeta(post.id, post.title, post.body, !post.pinned, post.extras || [], token);
    toast(post.pinned ? '고정 해제됨' : '맨 위에 고정됨', 'success');
    await loadPosts();
  } catch (e) {
    toast('실패: ' + e.message, 'error');
  }
}

async function updatePostMeta(id, title, body, pinned, extras, token) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: stringifyMaster(title, body, pinned, extras || []) })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
}

/* 수정 모달의 현재 이미지 리스트 렌더링 */
function renderEditImagesList() {
  const modal = document.getElementById('post-modal');
  const wrap = modal?.querySelector('#post-edit-images');
  if (!wrap || !modal._editPost) return;
  const post = modal._editPost;
  const removed = modal._removedExtras || [];
  const order = modal._reorderedImageIds || (post.imageIds || [post.id]).slice();
  const remaining = order.filter(id => !removed.includes(id));

  wrap.innerHTML = `
    <div class="edit-images-label">현재 이미지 (${remaining.length}장) · 순서 변경: ← → 버튼</div>
    <div class="edit-images-grid">
      ${remaining.map((id, i) => `
        <div class="edit-image-item ${id === post.id ? 'is-master' : ''}" data-id="${id}">
          <img src="${thumbUrl(id, 400)}" alt="이미지 ${i + 1}">
          <div class="edit-image-num">${i + 1}${id === post.id ? ' · 대표' : ''}</div>
          <div class="edit-image-actions">
            ${i > 0 ? `<button type="button" class="edit-img-btn" data-action="moveUp" data-id="${id}" title="앞으로">◀</button>` : ''}
            ${i < remaining.length - 1 ? `<button type="button" class="edit-img-btn" data-action="moveDown" data-id="${id}" title="뒤로">▶</button>` : ''}
            ${id !== post.id ? `<button type="button" class="edit-img-btn edit-img-remove" data-action="remove" data-id="${id}" title="제거">✕</button>` : `<span style="font-size:10px; color:var(--gray-500); padding:0 8px;">대표 사진</span>`}
          </div>
        </div>
      `).join('')}
    </div>
    <div class="edit-images-hint">💡 대표 사진(첫 이미지)은 제거할 수 없습니다. 게시물을 통째로 삭제하려면 카드의 ✕ 버튼을 누르세요.</div>
  `;

  wrap.querySelectorAll('.edit-img-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'remove') {
        modal._removedExtras = [...(modal._removedExtras || []), id];
        modal._reorderedImageIds = (modal._reorderedImageIds || []).filter(x => x !== id);
      } else if (action === 'moveUp' || action === 'moveDown') {
        const arr = (modal._reorderedImageIds || (post.imageIds || [post.id])).slice();
        const idx = arr.indexOf(id);
        const target = action === 'moveUp' ? idx - 1 : idx + 1;
        if (target < 0 || target >= arr.length) return;
        // 대표 사진은 항상 첫 자리 유지
        if (arr[target] === post.id && action === 'moveUp') return;
        [arr[idx], arr[target]] = [arr[target], arr[idx]];
        modal._reorderedImageIds = arr;
      }
      renderEditImagesList();
    });
  });
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
            <span class="post-label">사진 <small id="post-file-hint">(1장만 올려도 되고, 여러 장도 가능)</small></span>
            <div class="post-file-drop" id="post-file-drop">
              <input type="file" id="post-file" accept="image/*" multiple>
              <div class="post-file-placeholder">클릭하거나 사진을 드래그해서 선택하세요<br><small>사진 1장이면 그대로, 여러 장이면 묶거나 각각 올릴 수 있어요</small></div>
              <div id="post-file-list" class="post-file-list" style="display:none;"></div>
            </div>
            <label class="post-auto-sort-row" id="post-auto-sort-row" style="display:none;">
              <input type="checkbox" id="post-auto-sort" checked>
              <span>📋 파일명 숫자로 자동 정렬 (1, 2, 3 순서대로)</span>
            </label>
          </label>
          <label class="post-field" id="post-group-field" style="display:none; align-items:center; gap:10px;">
            <input type="checkbox" id="post-group" style="width:18px; height:18px; cursor:pointer;" checked>
            <span style="font-size:14px; font-weight:700; color:var(--gray-700);">🎴 여러 사진을 한 게시물(카루셀)로 묶기</span>
          </label>
          <div id="post-edit-images" class="edit-images-wrap" style="display:none;"></div>
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

    fileInput.addEventListener('change', () => addFilesToList(fileInput.files));

    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => {
      e.preventDefault(); drop.classList.add('is-dragover');
    }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => {
      e.preventDefault(); drop.classList.remove('is-dragover');
    }));
    drop.addEventListener('drop', e => {
      const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      if (dropped.length > 0) addFilesToList(dropped);
    });

    modal.querySelector('#post-form').addEventListener('submit', onSubmitPost);
  }
  // 수정/새 작성 분기
  const isEdit = !!init.editId;
  modal._editId = init.editId || null;
  modal._editPost = init.editPost || null;
  modal._removedExtras = []; // 수정 시 제거할 추가 이미지 ID
  modal._reorderedImageIds = init.editPost ? (init.editPost.imageIds || []).slice() : null;
  modal.querySelector('#post-modal-title').textContent = isEdit ? '글 수정' : '새 글쓰기';
  modal.querySelector('#post-title').value = init.title || '';
  modal.querySelector('#post-body').value = init.body || '';
  modal.querySelector('#post-pinned').checked = !!init.pinned;
  modal.querySelector('#post-file-field').style.display = 'block';
  modal.querySelector('#post-group-field').style.display = isEdit ? 'none' : 'flex';
  modal.querySelector('#post-edit-images').style.display = isEdit ? 'block' : 'none';
  modal.querySelector('#post-submit').textContent = isEdit ? '저장' : '올리기';
  // 새로 열 때마다 파일 배열 초기화
  modal._selectedFiles = [];
  // 수정 모드: 파일 input은 추가 이미지용
  const fileInputEl = modal.querySelector('#post-file');
  fileInputEl.value = '';
  fileInputEl.required = !isEdit;
  if (isEdit) {
    modal.querySelector('#post-file-hint').textContent = '(선택 · 새로 추가할 이미지)';
    modal.querySelector('.post-file-placeholder').innerHTML = '추가로 올릴 이미지를 선택하세요<br><small>여러 장 선택 가능</small>';
    renderEditImagesList();
  } else {
    modal.querySelector('#post-file-hint').textContent = '(필수 · 여러 장 선택 가능)';
    modal.querySelector('.post-file-placeholder').innerHTML = '클릭하거나 사진을 드래그해서 선택하세요';
  }
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
  modal._selectedFiles = [];
  modal.querySelector('#post-form').reset();
  updateFileList(null);
}

/* 파일명에서 첫 숫자 추출 → 자동 정렬 (1, 2, 10이 1, 2, 10 순) */
function extractNumber(filename) {
  const m = filename.match(/\d+/);
  return m ? parseInt(m[0], 10) : Infinity;
}

function sortByFilename(files) {
  return files.slice().sort((a, b) => {
    const na = extractNumber(a.name);
    const nb = extractNumber(b.name);
    if (na !== nb) return na - nb;
    return a.name.localeCompare(b.name);
  });
}

function addFilesToList(filesOrList) {
  const modal = document.getElementById('post-modal');
  if (!modal) return;
  if (!modal._selectedFiles) modal._selectedFiles = [];
  const newFiles = Array.from(filesOrList).filter(f => f.type.startsWith('image/'));

  // 자동 정렬 옵션 (디폴트 ON)
  const autoSort = modal.querySelector('#post-auto-sort')?.checked !== false;
  let toAdd = newFiles;
  if (autoSort) toAdd = sortByFilename(newFiles);

  // 누적 (한 번에 여러 장 추가)
  modal._selectedFiles = [...modal._selectedFiles, ...toAdd];
  // 자동 정렬이 켜져 있으면 전체 재정렬
  if (autoSort) modal._selectedFiles = sortByFilename(modal._selectedFiles);

  updateFileList(modal._selectedFiles);
}

function updateFileList(files) {
  const list = document.getElementById('post-file-list');
  const placeholder = document.querySelector('#post-modal .post-file-placeholder');
  if (!list || !placeholder) return;

  const modal = document.getElementById('post-modal');
  const isEdit = !!modal?._editId;
  const count = files ? files.length : 0;
  // 묶기/정렬 옵션은 2장 이상 + 새 글일 때만 노출 (1장이면 불필요 → 오해 방지)
  const groupField = document.getElementById('post-group-field');
  const sortRow = document.getElementById('post-auto-sort-row');
  if (groupField) groupField.style.display = (!isEdit && count >= 2) ? 'flex' : 'none';
  if (sortRow) sortRow.style.display = (count >= 2) ? 'flex' : 'none';

  if (!files || files.length === 0) {
    list.style.display = 'none';
    placeholder.style.display = '';
    list.innerHTML = '';
    return;
  }
  list.style.display = 'block';
  placeholder.style.display = 'none';
  list.innerHTML = files.map((f, i) => `
    <div class="post-file-item" data-idx="${i}">
      <img src="${URL.createObjectURL(f)}" alt="${escapeAttr(f.name)}">
      <div class="post-file-info">
        <div class="post-file-name">${i + 1}. ${escapeHtml(f.name)}</div>
        <div class="post-file-size">${(f.size / 1024).toFixed(0)} KB</div>
      </div>
      <div class="post-file-actions">
        ${i > 0 ? `<button type="button" class="pfile-btn" data-action="up" data-idx="${i}" title="앞으로">▲</button>` : ''}
        ${i < files.length - 1 ? `<button type="button" class="pfile-btn" data-action="down" data-idx="${i}" title="뒤로">▼</button>` : ''}
        <button type="button" class="pfile-btn pfile-remove" data-action="remove" data-idx="${i}" title="제거">✕</button>
      </div>
    </div>
  `).join('') + `<div class="post-file-summary">총 <strong>${files.length}장</strong> 선택됨${files.length > 1 ? ' · 위 순서대로 등록' : ''}</div>`;

  // 순서 변경 / 제거 핸들러
  list.querySelectorAll('.pfile-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const modal = document.getElementById('post-modal');
      const arr = modal._selectedFiles || [];
      const idx = Number(btn.dataset.idx);
      const action = btn.dataset.action;
      if (action === 'remove') arr.splice(idx, 1);
      else if (action === 'up' && idx > 0) [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      else if (action === 'down' && idx < arr.length - 1) [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
      updateFileList(arr);
    });
  });
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
      // 수정 모드
      const post = modal._editPost;
      const removed = modal._removedExtras || [];
      const newFiles = (modal._selectedFiles || []).slice();
      let currentImageIds = (modal._reorderedImageIds || post.imageIds || [post.id]).slice();

      // 1. 제거할 추가 이미지 삭제
      for (let i = 0; i < removed.length; i++) {
        submitBtn.textContent = `이미지 제거 중… (${i + 1}/${removed.length})`;
        try {
          await fetch(`https://www.googleapis.com/drive/v3/files/${removed[i]}`, {
            method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
          });
        } catch (err) { console.error('Delete failed:', removed[i], err); }
        currentImageIds = currentImageIds.filter(id => id !== removed[i]);
      }

      // 2. 새 이미지 업로드 (extras로 추가)
      for (let i = 0; i < newFiles.length; i++) {
        submitBtn.textContent = `새 이미지 올리는 중… (${i + 1}/${newFiles.length})`;
        try {
          const newId = await uploadExtraFile(newFiles[i], editId, token);
          currentImageIds.push(newId);
        } catch (err) { console.error('Upload failed:', newFiles[i].name, err); }
      }

      // 3. 마스터 메타데이터 업데이트 (extras = currentImageIds 중 마스터 제외)
      const extras = currentImageIds.filter(id => id !== editId);
      submitBtn.textContent = '저장 중…';
      await updatePostMeta(editId, title, body, pinned, extras, token);
      closePostModal();
      toast('수정되었습니다.', 'success');
      await loadPosts();
    } else {
      // 새 글 — 다중 파일 업로드
      const files = (modal._selectedFiles || []).slice();
      if (files.length === 0) { toast('사진을 선택해주세요.', 'error'); return; }
      const groupMode = document.getElementById('post-group').checked && files.length > 1;

      if (groupMode) {
        // 묶음 모드: 첫 파일 = 마스터, 나머지는 extras
        submitBtn.textContent = `올리는 중… (1/${files.length})`;
        const masterId = await uploadMasterFile(files[0], title, body, pinned, [], token);
        const extras = [];
        for (let i = 1; i < files.length; i++) {
          submitBtn.textContent = `올리는 중… (${i + 1}/${files.length})`;
          try {
            const exId = await uploadExtraFile(files[i], masterId, token);
            extras.push(exId);
          } catch (err) { console.error('Extra upload failed:', files[i].name, err); }
        }
        // 마스터에 extras 기록
        await updatePostMeta(masterId, title, body, pinned, extras, token);
        closePostModal();
        toast(`1개 게시물(이미지 ${files.length}장) 등록됨`, 'success');
      } else {
        // 별도 모드: 각 파일 = 별도 게시물
        let ok = 0, fail = 0;
        for (let i = 0; i < files.length; i++) {
          submitBtn.textContent = `올리는 중… (${i + 1}/${files.length})`;
          try { await uploadMasterFile(files[i], title, body, pinned, [], token); ok++; }
          catch (err) { fail++; console.error('Upload failed:', files[i].name, err); }
        }
        closePostModal();
        if (fail === 0) toast(`${ok}개 게시물 등록됨`, 'success');
        else if (ok > 0) toast(`${ok}개 성공 · ${fail}개 실패`, 'error');
        else toast('업로드 실패 — 폴더 권한 확인', 'error');
      }
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

async function uploadMasterFile(file, title, body, pinned, extras, token) {
  const metadata = {
    name: file.name,
    parents: [GDRIVE_FOLDER_ID],
    description: stringifyMaster(title, body, pinned, extras)
  };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.id;
}

async function uploadExtraFile(file, parentId, token) {
  const metadata = {
    name: file.name,
    parents: [GDRIVE_FOLDER_ID],
    description: stringifyExtra(parentId)
  };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.id;
}

/* ===== 삭제 (마스터 + extras 함께) ===== */
async function onDelete(id, label, extrasStr = '') {
  const extras = extrasStr ? extrasStr.split(',').filter(Boolean) : [];
  const total = 1 + extras.length;
  const msg = total > 1
    ? `"${label}" 게시물(이미지 ${total}장)을 정말 삭제할까요?\n사진과 글이 영구 삭제됩니다.`
    : `"${label}" 게시물을 정말 삭제할까요?\n사진과 글이 영구 삭제됩니다.`;
  if (!confirm(msg)) return;
  const token = window.Admin?.getToken();
  if (!token) { toast('로그인이 필요합니다.', 'error'); return; }

  try {
    // extras 먼저 삭제 → 마지막에 마스터
    for (const exId of extras) {
      await fetch(`https://www.googleapis.com/drive/v3/files/${exId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
    }
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

/* ===== 라이트박스 — 게시물 + 게시물 안 다중 이미지 ===== */
let lbImgIndex = 0; // 같은 게시물 안의 이미지 인덱스

function currentPostImages() {
  const p = posts[lightboxIndex];
  if (!p) return [];
  return (p.imageIds && p.imageIds.length > 0) ? p.imageIds : [p.id];
}

function openLightbox(idx) {
  lightboxIndex = idx;
  lbImgIndex = 0;
  updateLightbox();
  lightboxEl.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  lightboxEl.classList.remove('is-open');
  document.body.style.overflow = '';
  lightboxIndex = -1;
  lbImgIndex = 0;
}
function updateLightbox() {
  const p = posts[lightboxIndex];
  if (!p) return;
  const imgs = currentPostImages();
  const curImgId = imgs[lbImgIndex] || p.id;
  lightboxImgEl.src = thumbUrl(curImgId, 1600);
  lightboxImgEl.alt = p.title || p.name;

  const dateStr = p.createdTime ? new Date(p.createdTime).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
  let captionHTML = '';
  if (p.title) captionHTML += `<div class="lb-title">${escapeHtml(p.title)}</div>`;
  if (p.body)  captionHTML += `<div class="lb-body">${escapeHtml(p.body).replace(/\n/g, '<br>')}</div>`;
  if (dateStr) captionHTML += `<div class="lb-date">${dateStr}</div>`;
  if (!captionHTML) captionHTML = `<div class="lb-body">${escapeHtml(p.name.replace(/\.[^.]+$/, ''))}</div>`;
  lightboxCaptionEl.innerHTML = captionHTML;

  // 카운터: 다중 이미지면 "게시물X/Y · 이미지A/B"
  if (imgs.length > 1) {
    lightboxCounterEl.textContent = `게시물 ${lightboxIndex + 1}/${posts.length} · 이미지 ${lbImgIndex + 1}/${imgs.length}`;
  } else {
    lightboxCounterEl.textContent = `${lightboxIndex + 1} / ${posts.length}`;
  }
}
// 우→: 같은 게시물 안 다음 이미지 → 끝나면 다음 게시물
function nextPhoto() {
  const imgs = currentPostImages();
  if (lbImgIndex < imgs.length - 1) { lbImgIndex++; updateLightbox(); return; }
  if (lightboxIndex < posts.length - 1) { lightboxIndex++; lbImgIndex = 0; updateLightbox(); }
}
function prevPhoto() {
  if (lbImgIndex > 0) { lbImgIndex--; updateLightbox(); return; }
  if (lightboxIndex > 0) {
    lightboxIndex--;
    const imgs = currentPostImages();
    lbImgIndex = imgs.length - 1;
    updateLightbox();
  }
}

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
