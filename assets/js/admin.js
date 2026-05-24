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

            <a class="admin-menu-link" href="activities.html">활동사진 관리</a>
            <a class="admin-menu-link" href="cards.html#recent">카드뉴스 관리</a>
            <button class="admin-menu-link" id="admin-logout">로그아웃</button>
          </div>
        </div>
      `;
      document.getElementById('admin-logout').addEventListener('click', logout);
      document.getElementById('afc-in').addEventListener('click', () => changeFontScale(0.1));
      document.getElementById('afc-out').addEventListener('click', () => changeFontScale(-0.1));
      document.getElementById('afc-level').addEventListener('click', () => setFontScale(1));
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
  if (!scale || scale === 1) {
    document.body.style.zoom = '';
    document.documentElement.style.zoom = '';
    return;
  }
  document.body.style.zoom = scale;
  if (CSS.supports && CSS.supports('zoom: 1')) {
    document.documentElement.style.zoom = scale;
  }
}

function applyAllSettings() {
  applyFontScale(siteSettings.fontScale || 1);
  // 메뉴 텍스트 갱신
  const lvl = document.getElementById('afc-level');
  if (lvl) lvl.textContent = `${Math.round((siteSettings.fontScale || 1) * 100)}%`;
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
  }
})();

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
