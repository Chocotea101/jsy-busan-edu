/* ============================================================
   관리자 로그인 — Google OAuth (Google Identity Services)

   ▶ 작동 방식
   - 헤더의 "관리자 로그인" 버튼 클릭 → 구글 로그인 팝업
   - 로그인 성공 시 액세스 토큰 발급 (Drive API 권한)
   - 로그인된 사용자는 활동사진 페이지에서 업로드/삭제 가능
   - "관리자 권한" = Google Drive 폴더에 편집자로 등록된 사람
     (구글 자체가 권한을 관리. 폴더 편집권 없는 사람이 업로드 시도 → 실패)

   ▶ 정이슬님이 입력해야 할 값
   - GOOGLE_CLIENT_ID: OAuth 2.0 클라이언트 ID
   ============================================================ */

const GOOGLE_CLIENT_ID = '759963004396-058d7i81a9o1cqog9k97lul832i1aovo.apps.googleusercontent.com';
const OAUTH_SCOPE = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';

/* ============================================================ */

const Admin = (function () {
  const STORAGE_KEY = 'jsy_admin_session';
  let tokenClient = null;
  let session = loadSession(); // { token, expiresAt, email, name, picture }

  /* ===== 세션 저장/복원 ===== */
  function loadSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (!s.expiresAt || Date.now() > s.expiresAt) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return s;
    } catch { return null; }
  }

  function saveSession(s) {
    session = s;
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORAGE_KEY);
    renderUI();
    window.dispatchEvent(new CustomEvent('admin:change', { detail: { session: s } }));
  }

  /* ===== Google Identity Services 초기화 ===== */
  function initGIS() {
    if (!GOOGLE_CLIENT_ID) return false;
    if (typeof google === 'undefined' || !google.accounts) return false;

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: OAUTH_SCOPE,
      callback: async (response) => {
        if (response.error) {
          alert('로그인 중 오류가 발생했습니다: ' + response.error);
          return;
        }
        // 사용자 정보 가져오기
        try {
          const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${response.access_token}` }
          });
          const user = await userRes.json();
          saveSession({
            token: response.access_token,
            expiresAt: Date.now() + (response.expires_in - 60) * 1000, // 1분 여유
            email: user.email,
            name: user.name,
            picture: user.picture
          });
        } catch (e) {
          alert('사용자 정보를 가져올 수 없습니다.');
          console.error(e);
        }
      }
    });
    return true;
  }

  /* ===== 로그인/로그아웃 ===== */
  function login() {
    if (!GOOGLE_CLIENT_ID) {
      alert('관리자 로그인은 아직 설정되지 않았습니다.\n사이트 관리자에게 문의해주세요.');
      return;
    }
    if (!tokenClient && !initGIS()) {
      alert('구글 로그인 모듈을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    tokenClient.requestAccessToken({ prompt: session ? '' : 'consent' });
  }

  function logout() {
    if (session?.token && typeof google !== 'undefined') {
      try { google.accounts.oauth2.revoke(session.token, () => {}); } catch {}
    }
    document.body.classList.remove('admin-edit-mode');
    if (typeof detachEditClickHandlers === 'function') detachEditClickHandlers();
    saveSession(null);
  }

  /* ===== UI 렌더링 ===== */
  function renderUI() {
    const slot = document.getElementById('admin-slot');
    if (!slot) return;

    if (session) {
      const initials = session.name ? session.name.charAt(0) : '✓';
      const scale = siteSettings.fontScale || 1;
      slot.innerHTML = `
        <div class="admin-user" tabindex="0">
          ${session.picture
            ? `<img class="admin-avatar" src="${session.picture}" alt="">`
            : `<span class="admin-avatar admin-avatar-letter">${initials}</span>`}
          <span class="admin-name">${escapeHtml(session.name || session.email || '관리자')}</span>
          <span class="admin-caret">▾</span>
          <div class="admin-menu">
            <div class="admin-menu-email">${escapeHtml(session.email || '')}</div>

            <div class="admin-font-control">
              <div class="afc-row">
                <span class="afc-label">사이트 글자 크기</span>
                <div class="afc-buttons">
                  <button class="afc-btn" id="afc-out" aria-label="작게">−</button>
                  <button class="afc-level" id="afc-level" aria-label="기본 크기로">${Math.round(scale * 100)}%</button>
                  <button class="afc-btn" id="afc-in" aria-label="크게">+</button>
                </div>
              </div>
              <div class="afc-hint">모든 방문자에게 적용됩니다</div>
            </div>

            <a class="admin-menu-link admin-menu-primary" href="admin.html">⚙️ 관리자 페이지</a>
            <a class="admin-menu-link" href="activities.html">활동사진 관리</a>
            <a class="admin-menu-link" href="cards.html#recent">카드뉴스 관리</a>
            <button class="admin-menu-link" id="admin-edit-toggle">✏️ 텍스트 편집 모드</button>
            <button class="admin-menu-link" id="admin-logout">로그아웃</button>
          </div>
        </div>
      `;
      document.getElementById('admin-logout').addEventListener('click', logout);
      document.getElementById('afc-in').addEventListener('click', () => changeFontScale(0.1));
      document.getElementById('afc-out').addEventListener('click', () => changeFontScale(-0.1));
      document.getElementById('afc-level').addEventListener('click', () => setFontScale(1));
      document.getElementById('admin-edit-toggle').addEventListener('click', toggleEditMode);
      // 로그인 직후 편집 모드는 꺼진 상태에서 시작 → 텍스트 자연스럽게 보이고 필요 시 토글
      if (document.body.classList.contains('admin-edit-mode')) {
        document.getElementById('admin-edit-toggle').textContent = '✏️ 편집 모드 끄기';
      }
    } else {
      slot.innerHTML = `
        <button class="admin-login-btn" id="admin-login">
          <span class="admin-login-icon" aria-hidden="true">🔒</span>
          관리자
        </button>
      `;
      document.getElementById('admin-login').addEventListener('click', login);
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /* ===== 공개 API ===== */
  return {
    getSession: () => session,
    getToken: () => session?.token,
    isLoggedIn: () => !!session,
    login, logout,

    init() {
      renderUI();
      // GIS 로드되면 초기화 시도
      if (typeof google !== 'undefined' && google.accounts) initGIS();
      else window.addEventListener('gis:loaded', () => initGIS());
    }
  };
})();

/* ============================================================
   사이트 전역 설정 — Drive 폴더 description에 JSON 저장
   - 관리자가 변경 → Drive에 저장 → 모든 방문자에게 즉시 반영
   - 빠른 로딩 위해 sessionStorage 캐시 + 백그라운드 갱신
   ============================================================ */

const SETTINGS_FOLDER_ID = '1nDWyrIFyHFc5l-b5jPPB3cWdszAxbuB9'; // 카드뉴스 폴더 description 활용
const SETTINGS_API_KEY = 'AIzaSyA6GCjF7kj-ClInis5sbjWxKQ7B8RIZfTI';
const SETTINGS_CACHE_KEY = 'jsy_site_settings_v1';
const FONT_SCALE_KEY = 'jsy_font_scale'; // 비로그인 폴백용

const SCALE_MIN = 0.8;
const SCALE_MAX = 1.6;

let siteSettings = {};

function applyFontScale(scale) {
  let s = scale || 1;
  // 모바일은 화면이 좁아 큰 배율이면 레이아웃이 가로로 잘림 → 안전 범위로 완화
  if (window.innerWidth <= 600) s = Math.min(s, 1.15);

  // html에만 적용 (예전엔 html+body 둘 다 적용해 1.2×1.2=1.44로 과확대되던 버그 수정)
  document.body.style.zoom = '';
  if (s === 1) {
    document.documentElement.style.zoom = '';
    return;
  }
  document.documentElement.style.zoom = s;
}

// 화면 회전/크기 변경 시 글자 크기 재적용 (모바일 안전 배율 반영)
let _fontScaleResizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(_fontScaleResizeTimer);
  _fontScaleResizeTimer = setTimeout(() => applyFontScale(siteSettings.fontScale || 1), 200);
});

function applyAllSettings() {
  applyFontScale(siteSettings.fontScale || 1);
  applySiteTexts();
  applySiteImages();
  applyFeaturedVideo();
  // 메뉴 텍스트 갱신
  const lvl = document.getElementById('afc-level');
  if (lvl) lvl.textContent = `${Math.round((siteSettings.fontScale || 1) * 100)}%`;
}

/* 홈 대표 영상 — siteSettings.featuredVideo (유튜브 ID)가 있으면 교체 */
function applyFeaturedVideo() {
  const wrap = document.getElementById('featured-video-frame');
  if (!wrap) return;
  const id = siteSettings.featuredVideo;
  if (!id) return; // 없으면 HTML 기본값 유지
  wrap.src = `https://www.youtube.com/embed/${id}?rel=0`;
}

/* ===== 사이트 이미지 (크기·정렬) 적용 ===== */
function applySiteImages() {
  const images = siteSettings.images || {};
  document.querySelectorAll('[data-edit-img]').forEach(el => {
    const key = el.dataset.editImg;
    const data = images[key];
    if (!data) return;
    if (data.width) el.style.width = data.width + 'px';
    if (data.align) {
      el.classList.remove('img-align-left', 'img-align-center', 'img-align-right');
      el.classList.add('img-align-' + data.align);
    }
  });
}

/* ===== 사이트 텍스트 (요소별 내용 + 크기 + 색 + 형광펜) 적용 ===== */
function applySiteTexts() {
  const texts = siteSettings.texts || {};
  document.querySelectorAll('[data-edit]').forEach(el => {
    const key = el.dataset.edit;
    const data = texts[key];
    if (!data) return;
    if (typeof data.html === 'string' && data.html.length > 0) el.innerHTML = data.html;
    if (data.fontSize) el.style.fontSize = data.fontSize + 'px';
    if (data.color) el.style.color = data.color;
    if (data.highlight) {
      el.style.background = `linear-gradient(180deg, transparent 60%, ${data.highlight} 60%)`;
      el.style.display = 'inline';
      el.style.padding = '0 2px';
    }
    if (data.bold) el.style.fontWeight = '900';
    if (data.italic) el.style.fontStyle = 'italic';
    if (data.underline) el.style.textDecoration = 'underline';
  });
}

async function fetchSiteSettings() {
  if (!SETTINGS_FOLDER_ID || !SETTINGS_API_KEY) return {};
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${SETTINGS_FOLDER_ID}?fields=description&key=${SETTINGS_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return {};
    const data = await res.json();
    if (!data.description) return {};
    return JSON.parse(data.description);
  } catch (e) {
    console.warn('[Settings] fetch failed:', e);
    return {};
  }
}

async function pushSiteSettings(updates) {
  const token = Admin.getToken();
  if (!token) throw new Error('로그인이 필요합니다.');

  // 최신 가져와서 머지 (다른 관리자 변경사항 보존)
  const current = await fetchSiteSettings();
  const merged = { ...current, ...updates };

  const url = `https://www.googleapis.com/drive/v3/files/${SETTINGS_FOLDER_ID}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ description: JSON.stringify(merged) })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  siteSettings = merged;
  sessionStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(merged));
  applyAllSettings();
  window.dispatchEvent(new CustomEvent('settings:change', { detail: { settings: merged } }));
  return merged;
}

// 페이지 진입 즉시 — 캐시에서 빠르게 적용
(function initSettingsFromCache() {
  try {
    const cached = sessionStorage.getItem(SETTINGS_CACHE_KEY);
    if (cached) {
      siteSettings = JSON.parse(cached);
    } else {
      // 캐시 없으면 로컬 폴백 (이전 버전 사용자)
      const localScale = parseFloat(localStorage.getItem(FONT_SCALE_KEY) || '1');
      if (localScale !== 1) siteSettings.fontScale = localScale;
    }
    applyAllSettings();
  } catch (e) {
    console.warn('[Settings] init from cache failed:', e);
  }
})();

// 백그라운드에서 최신 가져오기
(async function refreshSettings() {
  const fresh = await fetchSiteSettings();
  if (fresh && Object.keys(fresh).length > 0) {
    siteSettings = fresh;
    sessionStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(fresh));
    applyAllSettings();
    window.dispatchEvent(new CustomEvent('settings:change', { detail: { settings: fresh } }));
  }
})();

/* ===== 다른 스크립트(songs.js 등)에서 설정 읽기/쓰기 ===== */
window.SiteSettings = {
  get: () => siteSettings,
  fetch: fetchSiteSettings,
  save: (updates) => pushSiteSettings(updates)
};

function setFontScale(scale) {
  scale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, scale));
  scale = Math.round(scale * 10) / 10;

  // UI 즉시 반영 (낙관적 업데이트)
  siteSettings.fontScale = scale;
  applyAllSettings();

  // 로그인 상태면 Drive에 저장 → 모든 방문자에게
  if (Admin.isLoggedIn()) {
    pushSiteSettings({ fontScale: scale })
      .then(() => {
        showFontScaleNote('✓ 모든 사용자에게 적용됨');
      })
      .catch(err => {
        console.error('[Settings] push failed:', err);
        showFontScaleNote('⚠ 저장 실패 — 본인에게만 적용됩니다');
      });
  } else {
    // 비로그인 — 본인 브라우저에만
    localStorage.setItem(FONT_SCALE_KEY, scale);
  }
}

function changeFontScale(delta) {
  const cur = siteSettings.fontScale || 1;
  setFontScale(cur + delta);
}

/* ============================================================
   텍스트 편집 모드 (클릭 → 모달로 내용·크기 수정)
   ============================================================ */

function toggleEditMode() {
  const on = !document.body.classList.contains('admin-edit-mode');
  document.body.classList.toggle('admin-edit-mode', on);
  if (on) attachEditClickHandlers();
  else detachEditClickHandlers();
  const btn = document.getElementById('admin-edit-toggle');
  if (btn) btn.textContent = on ? '✏️ 편집 모드 끄기' : '✏️ 텍스트 편집 모드';
}

function attachEditClickHandlers() {
  // 텍스트
  document.querySelectorAll('[data-edit]').forEach(el => {
    if (el._editHandler) return;
    el._editHandler = e => {
      e.preventDefault();
      e.stopPropagation();
      openTextEditModal(el.dataset.edit, el);
    };
    el.addEventListener('click', el._editHandler);
  });
  // 이미지
  document.querySelectorAll('[data-edit-img]').forEach(el => {
    if (el._editImgHandler) return;
    el._editImgHandler = e => {
      e.preventDefault();
      e.stopPropagation();
      openImageEditModal(el.dataset.editImg, el);
    };
    el.addEventListener('click', el._editImgHandler);
  });
}

function detachEditClickHandlers() {
  document.querySelectorAll('[data-edit]').forEach(el => {
    if (el._editHandler) {
      el.removeEventListener('click', el._editHandler);
      delete el._editHandler;
    }
  });
  document.querySelectorAll('[data-edit-img]').forEach(el => {
    if (el._editImgHandler) {
      el.removeEventListener('click', el._editImgHandler);
      delete el._editImgHandler;
    }
  });
}

/* 미리 정의된 색상 팔레트 */
const TEM_COLORS = [
  '#111111', '#444444', '#888888',
  '#E60012', '#B8000E', '#1E5FB0',
  '#2BAE66', '#F39200', '#7A4FB7',
  '#E83E8C', '#0D9488', '#FACC15'
];
const TEM_HIGHLIGHTS = [
  'transparent',
  '#FFF59D', '#FFEB3B', '#FFD54F',
  '#FFCDD2', '#F8BBD0', '#E1BEE7',
  '#C5E1A5', '#B2EBF2', '#BBDEFB'
];

function openTextEditModal(key, element) {
  // 기존 사이트 설정에서 현재 데이터 가져오기 (없으면 기본 스타일에서)
  const saved = (siteSettings.texts || {})[key] || {};
  const currentHtml = saved.html || element.innerHTML.trim();
  const computedSize = parseFloat(getComputedStyle(element).fontSize);
  const currentSize = saved.fontSize || Math.round(computedSize);
  const currentColor = saved.color || rgbToHex(getComputedStyle(element).color) || '#111111';
  const currentHighlight = saved.highlight || 'transparent';
  const currentBold = saved.bold || false;
  const currentItalic = saved.italic || false;
  const currentUnderline = saved.underline || false;

  let modal = document.getElementById('text-edit-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'text-edit-modal';
    modal.className = 'post-modal';
    modal.innerHTML = `
      <div class="post-modal-backdrop"></div>
      <div class="post-modal-body" style="max-width:580px;">
        <button class="post-modal-close" type="button" aria-label="닫기">✕</button>
        <h3>텍스트 편집</h3>
        <p style="font-size:13px; color:var(--gray-500); margin:0 0 16px; word-break:break-all;">
          <strong id="tem-key" style="color:var(--gray-700);"></strong>
        </p>
        <form id="text-edit-form">
          <label class="post-field">
            <span class="post-label">내용 <small>(줄바꿈은 새 줄)</small></span>
            <textarea id="tem-content" rows="3"></textarea>
          </label>

          <label class="post-field">
            <span class="post-label">글자 크기 <span id="tem-size-label" style="color:var(--red); font-weight:900;">— px</span></span>
            <input type="range" id="tem-size" min="10" max="120" step="1" class="tem-size-slider">
          </label>

          <div class="post-field">
            <span class="post-label">🎨 글자 색</span>
            <div class="tem-color-row" id="tem-color-row">
              ${TEM_COLORS.map(c => `<button type="button" class="tem-swatch" data-color="${c}" style="background:${c};" aria-label="${c}"></button>`).join('')}
              <label class="tem-swatch tem-swatch-custom" title="원하는 색 직접 선택">
                <input type="color" id="tem-color-custom" hidden>
                <span>+</span>
              </label>
            </div>
          </div>

          <div class="post-field">
            <span class="post-label">🖍 형광펜</span>
            <div class="tem-color-row" id="tem-highlight-row">
              ${TEM_HIGHLIGHTS.map(c => `
                <button type="button" class="tem-swatch ${c === 'transparent' ? 'tem-swatch-none' : ''}" data-highlight="${c}" style="background:${c === 'transparent' ? '#fff' : c};" aria-label="${c}">
                  ${c === 'transparent' ? '<span style="font-size:10px; color:#888;">없음</span>' : ''}
                </button>
              `).join('')}
              <label class="tem-swatch tem-swatch-custom" title="원하는 색 직접 선택">
                <input type="color" id="tem-highlight-custom" hidden>
                <span>+</span>
              </label>
            </div>
          </div>

          <div class="post-field">
            <span class="post-label">📝 스타일</span>
            <div class="tem-style-row">
              <label class="tem-style-toggle"><input type="checkbox" id="tem-bold"><span><strong>굵게</strong></span></label>
              <label class="tem-style-toggle"><input type="checkbox" id="tem-italic"><span><em>기울임</em></span></label>
              <label class="tem-style-toggle"><input type="checkbox" id="tem-underline"><span><u>밑줄</u></span></label>
            </div>
          </div>

          <div class="tem-size-preview" id="tem-size-preview">미리보기 텍스트</div>

          <div class="post-modal-actions">
            <button type="button" class="btn btn-ghost" id="tem-reset" style="flex:0;">초기값</button>
            <button type="button" class="btn btn-ghost" id="tem-cancel">취소</button>
            <button type="submit" class="btn btn-primary" id="tem-save">저장</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => {
      modal.classList.remove('is-open');
      document.body.style.overflow = '';
    };
    modal.querySelector('.post-modal-backdrop').addEventListener('click', close);
    modal.querySelector('.post-modal-close').addEventListener('click', close);
    modal.querySelector('#tem-cancel').addEventListener('click', close);

    const sizeInput = modal.querySelector('#tem-size');
    const sizeLabel = modal.querySelector('#tem-size-label');
    const preview = modal.querySelector('#tem-size-preview');
    const contentArea = modal.querySelector('#tem-content');
    const boldChk = modal.querySelector('#tem-bold');
    const italicChk = modal.querySelector('#tem-italic');
    const underlineChk = modal.querySelector('#tem-underline');

    function updatePreview() {
      const v = sizeInput.value;
      sizeLabel.textContent = `${v} px`;
      preview.style.fontSize = v + 'px';
      preview.style.color = modal._currentColor || '#111';
      const hl = modal._currentHighlight || 'transparent';
      if (hl === 'transparent') {
        preview.style.background = '';
      } else {
        preview.style.background = `linear-gradient(180deg, transparent 55%, ${hl} 55%)`;
      }
      preview.style.fontWeight = boldChk.checked ? '900' : '600';
      preview.style.fontStyle = italicChk.checked ? 'italic' : 'normal';
      preview.style.textDecoration = underlineChk.checked ? 'underline' : 'none';
      preview.innerHTML = contentArea.value.replace(/\n/g, '<br>') || '미리보기 텍스트';
    }

    sizeInput.addEventListener('input', updatePreview);
    contentArea.addEventListener('input', updatePreview);
    boldChk.addEventListener('change', updatePreview);
    italicChk.addEventListener('change', updatePreview);
    underlineChk.addEventListener('change', updatePreview);

    // 색상 / 형광펜 선택
    modal.querySelectorAll('[data-color]').forEach(btn => {
      btn.addEventListener('click', () => {
        modal._currentColor = btn.dataset.color;
        modal.querySelectorAll('#tem-color-row .tem-swatch').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        updatePreview();
      });
    });
    modal.querySelectorAll('[data-highlight]').forEach(btn => {
      btn.addEventListener('click', () => {
        modal._currentHighlight = btn.dataset.highlight;
        modal.querySelectorAll('#tem-highlight-row .tem-swatch').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        updatePreview();
      });
    });

    modal.querySelector('#tem-color-custom').addEventListener('change', e => {
      modal._currentColor = e.target.value;
      modal.querySelectorAll('#tem-color-row .tem-swatch').forEach(b => b.classList.remove('is-active'));
      updatePreview();
    });
    modal.querySelector('#tem-highlight-custom').addEventListener('change', e => {
      modal._currentHighlight = e.target.value;
      modal.querySelectorAll('#tem-highlight-row .tem-swatch').forEach(b => b.classList.remove('is-active'));
      updatePreview();
    });

    modal._updatePreview = updatePreview;

    modal.querySelector('#tem-reset').addEventListener('click', async () => {
      if (!confirm('이 텍스트를 원래 사이트 기본값으로 되돌릴까요?')) return;
      try {
        const current = await fetchSiteSettings();
        const texts = { ...(current.texts || {}) };
        delete texts[modal._activeKey];
        await pushSiteSettings({ texts });
        close();
        showFontScaleNote('✓ 초기값으로 복원됨');
        setTimeout(() => location.reload(), 600);
      } catch (err) { alert('복원 실패: ' + err.message); }
    });

    modal.querySelector('#text-edit-form').addEventListener('submit', async e => {
      e.preventDefault();
      const key = modal._activeKey;
      const newHtml = modal.querySelector('#tem-content').value.replace(/\n/g, '<br>');
      const newSize = parseInt(modal.querySelector('#tem-size').value, 10);
      const submit = modal.querySelector('#tem-save');
      submit.disabled = true; submit.textContent = '저장 중…';
      try {
        const current = await fetchSiteSettings();
        const texts = { ...(current.texts || {}) };
        texts[key] = {
          html: newHtml,
          fontSize: newSize,
          color: modal._currentColor || undefined,
          highlight: modal._currentHighlight && modal._currentHighlight !== 'transparent' ? modal._currentHighlight : undefined,
          bold: boldChk.checked || undefined,
          italic: italicChk.checked || undefined,
          underline: underlineChk.checked || undefined
        };
        // undefined 필드 제거
        Object.keys(texts[key]).forEach(k => texts[key][k] === undefined && delete texts[key][k]);
        await pushSiteSettings({ texts });
        close();
        showFontScaleNote('✓ 저장됨 (모든 방문자에게 적용)');
      } catch (err) {
        alert('저장 실패: ' + err.message);
      } finally {
        submit.disabled = false; submit.textContent = '저장';
      }
    });
  }

  // 모달에 현재 값 채우기
  modal._activeKey = key;
  modal._currentColor = currentColor;
  modal._currentHighlight = currentHighlight;
  modal.querySelector('#tem-key').textContent = `편집 위치: ${key}`;
  const contentValue = currentHtml.replace(/<br\s*\/?>/gi, '\n');
  modal.querySelector('#tem-content').value = contentValue;
  modal.querySelector('#tem-size').value = currentSize;
  modal.querySelector('#tem-bold').checked = currentBold;
  modal.querySelector('#tem-italic').checked = currentItalic;
  modal.querySelector('#tem-underline').checked = currentUnderline;

  // 활성 색/형광 표시
  modal.querySelectorAll('#tem-color-row .tem-swatch').forEach(b => {
    b.classList.toggle('is-active', b.dataset.color === currentColor);
  });
  modal.querySelectorAll('#tem-highlight-row .tem-swatch').forEach(b => {
    b.classList.toggle('is-active', b.dataset.highlight === currentHighlight);
  });

  modal._updatePreview();
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => modal.querySelector('#tem-content').focus(), 50);
}

function rgbToHex(rgb) {
  if (!rgb || !rgb.startsWith('rgb')) return null;
  const m = rgb.match(/\d+/g);
  if (!m) return null;
  const [r, g, b] = m.map(Number);
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

/* ===== 이미지 편집 모달 (크기 + 정렬) ===== */
function openImageEditModal(key, element) {
  const currentWidth = Math.round(element.getBoundingClientRect().width);
  const currentAlign =
    element.classList.contains('img-align-left') ? 'left' :
    element.classList.contains('img-align-right') ? 'right' :
    element.classList.contains('img-align-center') ? 'center' : 'left';

  let modal = document.getElementById('image-edit-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'image-edit-modal';
    modal.className = 'post-modal';
    modal.innerHTML = `
      <div class="post-modal-backdrop"></div>
      <div class="post-modal-body" style="max-width:480px;">
        <button class="post-modal-close" type="button" aria-label="닫기">✕</button>
        <h3>이미지 편집</h3>
        <p style="font-size:13px; color:var(--gray-500); margin:0 0 16px; word-break:break-all;">
          <strong id="iem-key" style="color:var(--gray-700);"></strong>
        </p>
        <form id="image-edit-form">
          <label class="post-field">
            <span class="post-label">이미지 크기 <span id="iem-size-label" style="color:var(--red); font-weight:900;">— px</span></span>
            <input type="range" id="iem-size" min="40" max="500" step="2" class="tem-size-slider">
            <div class="iem-preview-wrap">
              <img id="iem-preview" alt="">
            </div>
          </label>
          <label class="post-field">
            <span class="post-label">위치 (가로 정렬)</span>
            <div class="iem-align-row" id="iem-align">
              <label class="iem-align-opt"><input type="radio" name="iem-align" value="left">왼쪽</label>
              <label class="iem-align-opt"><input type="radio" name="iem-align" value="center">가운데</label>
              <label class="iem-align-opt"><input type="radio" name="iem-align" value="right">오른쪽</label>
            </div>
          </label>
          <div class="post-modal-actions">
            <button type="button" class="btn btn-ghost" id="iem-reset" style="flex:0;">초기값</button>
            <button type="button" class="btn btn-ghost" id="iem-cancel">취소</button>
            <button type="submit" class="btn btn-primary" id="iem-save">저장</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    const close = () => {
      modal.classList.remove('is-open');
      document.body.style.overflow = '';
    };
    modal.querySelector('.post-modal-backdrop').addEventListener('click', close);
    modal.querySelector('.post-modal-close').addEventListener('click', close);
    modal.querySelector('#iem-cancel').addEventListener('click', close);

    const sizeInput = modal.querySelector('#iem-size');
    const sizeLabel = modal.querySelector('#iem-size-label');
    const preview = modal.querySelector('#iem-preview');
    const alignWrap = modal.querySelector('#iem-align');

    sizeInput.addEventListener('input', () => {
      sizeLabel.textContent = `${sizeInput.value} px`;
      preview.style.width = sizeInput.value + 'px';
    });

    alignWrap.addEventListener('change', e => {
      const v = e.target.value;
      preview.parentElement.classList.remove('align-left', 'align-center', 'align-right');
      preview.parentElement.classList.add('align-' + v);
    });

    modal.querySelector('#iem-reset').addEventListener('click', async () => {
      if (!confirm('이 이미지를 원래 기본 크기·위치로 되돌릴까요?')) return;
      try {
        const current = await fetchSiteSettings();
        const images = { ...(current.images || {}) };
        delete images[modal._activeKey];
        await pushSiteSettings({ images });
        close();
        showFontScaleNote('✓ 초기값으로 복원됨');
        setTimeout(() => location.reload(), 600);
      } catch (err) { alert('복원 실패: ' + err.message); }
    });

    modal.querySelector('#image-edit-form').addEventListener('submit', async e => {
      e.preventDefault();
      const key = modal._activeKey;
      const width = parseInt(modal.querySelector('#iem-size').value, 10);
      const align = modal.querySelector('input[name="iem-align"]:checked')?.value || 'left';
      const submit = modal.querySelector('#iem-save');
      submit.disabled = true; submit.textContent = '저장 중…';
      try {
        const current = await fetchSiteSettings();
        const images = { ...(current.images || {}) };
        images[key] = { width, align };
        await pushSiteSettings({ images });
        close();
        showFontScaleNote('✓ 저장됨 (모든 방문자에게 적용)');
      } catch (err) {
        alert('저장 실패: ' + err.message);
      } finally {
        submit.disabled = false; submit.textContent = '저장';
      }
    });
  }

  // 현재 값 채우기
  modal._activeKey = key;
  modal.querySelector('#iem-key').textContent = `편집 위치: ${key}`;
  const sizeInput = modal.querySelector('#iem-size');
  sizeInput.value = currentWidth;
  modal.querySelector('#iem-size-label').textContent = `${currentWidth} px`;
  const preview = modal.querySelector('#iem-preview');
  preview.src = element.src;
  preview.style.width = currentWidth + 'px';
  // 정렬 라디오 선택
  modal.querySelectorAll('input[name="iem-align"]').forEach(r => {
    r.checked = r.value === currentAlign;
  });
  // 미리보기 정렬
  preview.parentElement.classList.remove('align-left', 'align-center', 'align-right');
  preview.parentElement.classList.add('align-' + currentAlign);

  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function showFontScaleNote(msg) {
  let note = document.getElementById('afc-note');
  if (!note) {
    const ctrl = document.querySelector('.admin-font-control');
    if (!ctrl) return;
    note = document.createElement('div');
    note.id = 'afc-note';
    note.className = 'afc-note';
    ctrl.appendChild(note);
  }
  note.textContent = msg;
  note.style.opacity = '1';
  clearTimeout(note._timer);
  note._timer = setTimeout(() => { note.style.opacity = '0'; }, 2500);
}

/* ===== GIS 스크립트 로드 완료 알림 ===== */
window.addEventListener('load', () => {
  if (typeof google !== 'undefined' && google.accounts) {
    window.dispatchEvent(new Event('gis:loaded'));
  }
});

/* ===== 초기화 ===== */
Admin.init();
window.Admin = Admin;
