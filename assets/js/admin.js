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

const GOOGLE_CLIENT_ID = ''; // ← 여기에 OAuth 2.0 클라이언트 ID 입력
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
      slot.innerHTML = `
        <div class="admin-user" tabindex="0">
          ${session.picture
            ? `<img class="admin-avatar" src="${session.picture}" alt="">`
            : `<span class="admin-avatar admin-avatar-letter">${initials}</span>`}
          <span class="admin-name">${escapeHtml(session.name || session.email || '관리자')}</span>
          <span class="admin-caret">▾</span>
          <div class="admin-menu">
            <div class="admin-menu-email">${escapeHtml(session.email || '')}</div>
            <a class="admin-menu-link" href="activities.html">활동사진 관리</a>
            <button class="admin-menu-link" id="admin-logout">로그아웃</button>
          </div>
        </div>
      `;
      document.getElementById('admin-logout').addEventListener('click', logout);
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

/* ===== GIS 스크립트 로드 완료 알림 ===== */
window.addEventListener('load', () => {
  if (typeof google !== 'undefined' && google.accounts) {
    window.dispatchEvent(new Event('gis:loaded'));
  }
});

/* ===== 초기화 ===== */
Admin.init();
window.Admin = Admin;
