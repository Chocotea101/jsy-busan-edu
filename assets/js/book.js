/* ============================================================
   책자(플립북) — StPageFlip
   - 화면 크기에 따라 책 크기 자동 조절 (더 크게)
   - 페이지 확대(🔍) → 풀스크린 라이트박스
   - p2(후보자정보공개자료)는 책자 뷰에서 제외
   ============================================================ */

const PAGE_NUMBERS = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const PAGES = PAGE_NUMBERS.map(n =>
  `assets/img/pages-hd/page-${String(n).padStart(2, '0')}.webp`
);

/* 원본 페이지 비율: 2079×2953 = 1 : 1.42 */
const PAGE_RATIO = 2953 / 2079;

const flipEl     = document.getElementById('flipbook');
const pageInfoEl = document.getElementById('pageinfo');
const prevBtn    = document.getElementById('prev');
const nextBtn    = document.getElementById('next');
const zoomBtn    = document.getElementById('zoom');
const loaderEl   = document.getElementById('book-loader');

let pageFlip = null;

/* ===== 화면 크기에 맞춰 책 크기 계산 (어르신 친화 — 더 크게) ===== */
function calcBookSize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isMobile = vw < 720;

  // 헤더(50px) + 컨트롤(80px) + 약간의 여백 정도만 빼고 최대한 크게
  const usableHeight = Math.max(420, vh - 130);
  const usableWidth = Math.max(280, vw - 32);

  // 양면 펼침 폭 = pageWidth * 2 (모바일 portrait는 1배)
  const spreadFactor = isMobile ? 1 : 2;

  // 1. 높이 기준으로 폭 산출 — 최대 1280까지 키움
  let pageHeight = Math.min(usableHeight, 1280);
  let pageWidth = pageHeight / PAGE_RATIO;
  let spreadWidth = pageWidth * spreadFactor;

  // 2. 가로가 부족하면 폭 기준으로 다시 산출
  if (spreadWidth > usableWidth) {
    spreadWidth = usableWidth;
    pageWidth = spreadWidth / spreadFactor;
    pageHeight = pageWidth * PAGE_RATIO;
  }

  return {
    width: Math.floor(pageWidth),
    height: Math.floor(pageHeight),
    isMobile
  };
}

/* ===== 이미지 사전 로드 + 진행률 ===== */
function preloadImages(urls, onProgress) {
  return Promise.all(urls.map((url, idx) =>
    new Promise(resolve => {
      const img = new Image();
      img.onload = img.onerror = () => {
        onProgress(idx);
        resolve();
      };
      img.src = url;
    })
  ));
}

function setLoadingProgress(loaded, total) {
  if (!loaderEl) return;
  const pct = Math.round((loaded / total) * 100);
  loaderEl.querySelector('.bl-bar-fill').style.width = pct + '%';
  loaderEl.querySelector('.bl-text').textContent = `${loaded} / ${total} 페이지 불러오는 중…`;
}

function hideLoader() {
  if (!loaderEl) return;
  loaderEl.classList.add('is-done');
  setTimeout(() => { loaderEl.style.display = 'none'; }, 400);
}

/* ===== StPageFlip 초기화 ===== */
function createPageFlip() {
  const size = calcBookSize();

  pageFlip = new St.PageFlip(flipEl, {
    width: size.width,
    height: size.height,
    size: 'fixed',
    minWidth: 240,
    maxWidth: 1200,
    minHeight: 340,
    maxHeight: 1600,
    drawShadow: true,
    maxShadowOpacity: 0.5,
    showCover: true,
    usePortrait: true,
    mobileScrollSupport: false,
    swipeDistance: 30,
    flippingTime: 700
  });

  pageFlip.loadFromImages(PAGES);

  pageFlip.on('flip', updateInfo);
  pageFlip.on('init', updateInfo);

  setTimeout(updateInfo, 300);
}

function updateInfo() {
  if (!pageFlip) return;
  const current = pageFlip.getCurrentPageIndex() + 1;
  const total = pageFlip.getPageCount();
  pageInfoEl.textContent = `${current} / ${total}`;
  prevBtn.disabled = current <= 1;
  nextBtn.disabled = current >= total;
}

/* ===== 화면 크기 변경 시 책 재생성 ===== */
let resizeTimer = null;
function onResize() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!pageFlip) return;
    const cur = pageFlip.getCurrentPageIndex();
    try { pageFlip.destroy(); } catch (e) {}
    flipEl.innerHTML = '';
    createPageFlip();
    setTimeout(() => {
      if (pageFlip && cur > 0) {
        try { pageFlip.turnToPage(cur); } catch (e) {}
      }
    }, 100);
  }, 250);
}

window.addEventListener('resize', onResize);
window.addEventListener('orientationchange', onResize);

/* ===== 컨트롤 + 키보드 ===== */
prevBtn.addEventListener('click', () => pageFlip?.flipPrev());
nextBtn.addEventListener('click', () => pageFlip?.flipNext());

document.addEventListener('keydown', e => {
  // 라이트박스 열려 있을 땐 책 키보드 동작 안 함 (라이트박스에서 처리)
  if (lbEl?.classList.contains('is-open')) return;
  if (e.key === 'ArrowLeft') pageFlip?.flipPrev();
  if (e.key === 'ArrowRight') pageFlip?.flipNext();
  if (e.key === '+' || (e.key === '=' && e.shiftKey)) openLightbox();
});

/* ============================================================
   페이지 확대 라이트박스
   ============================================================ */

const lbEl = document.getElementById('book-lightbox');
const lbImg = document.getElementById('bl-img');
const lbCounter = document.getElementById('bl-counter');
const lbPrev = document.getElementById('bl-prev');
const lbNext = document.getElementById('bl-next');
const lbClose = document.getElementById('bl-close');

let lbIndex = 0;

function openLightbox() {
  if (!pageFlip) return;
  lbIndex = pageFlip.getCurrentPageIndex();
  updateLightbox();
  lbEl.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lbEl.classList.remove('is-open');
  document.body.style.overflow = '';
  // 책을 라이트박스에서 본 페이지로 이동시킴
  if (pageFlip && lbIndex !== pageFlip.getCurrentPageIndex()) {
    try { pageFlip.turnToPage(lbIndex); } catch (e) {}
  }
}

function updateLightbox() {
  lbImg.src = PAGES[lbIndex];
  lbImg.alt = `${lbIndex + 1}페이지`;
  lbCounter.textContent = `${lbIndex + 1} / ${PAGES.length}`;
  lbPrev.disabled = lbIndex === 0;
  lbNext.disabled = lbIndex === PAGES.length - 1;
}

function lbStep(d) {
  const i = lbIndex + d;
  if (i < 0 || i >= PAGES.length) return;
  lbIndex = i;
  updateLightbox();
}

zoomBtn?.addEventListener('click', openLightbox);
lbClose?.addEventListener('click', closeLightbox);
lbPrev?.addEventListener('click', () => lbStep(-1));
lbNext?.addEventListener('click', () => lbStep(1));
lbEl?.addEventListener('click', e => { if (e.target === lbEl) closeLightbox(); });

document.addEventListener('keydown', e => {
  if (!lbEl?.classList.contains('is-open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowRight') { e.preventDefault(); lbStep(1); }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); lbStep(-1); }
});

let lbTouchStart = null;
lbEl?.addEventListener('touchstart', e => { lbTouchStart = e.touches[0].clientX; }, { passive: true });
lbEl?.addEventListener('touchend', e => {
  if (lbTouchStart === null) return;
  const dx = e.changedTouches[0].clientX - lbTouchStart;
  if (Math.abs(dx) > 50) { if (dx < 0) lbStep(1); else lbStep(-1); }
  lbTouchStart = null;
}, { passive: true });

/* ===== 시작 — 이미지 preload 후 책 생성 ===== */
async function init() {
  setLoadingProgress(0, PAGES.length);

  let loaded = 0;
  await preloadImages(PAGES, () => {
    loaded++;
    setLoadingProgress(loaded, PAGES.length);
  });

  hideLoader();
  createPageFlip();
}

init();
