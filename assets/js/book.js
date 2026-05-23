/* ============================================================
   책자(플립북) — StPageFlip
   - 화면 크기에 따라 책 크기 자동 조절 (반응형)
   - 이미지 사전 로드 + 진행률 표시
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
const loaderEl   = document.getElementById('book-loader');
const stageEl    = document.querySelector('.book-stage');

let pageFlip = null;

/* ===== 화면 크기에 맞춰 책 크기 계산 ===== */
function calcBookSize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isMobile = vw < 720;

  // 헤더(약 50px) + 컨트롤(약 100px) + 여백 = ~200px 제외
  const usableHeight = Math.max(360, vh - 200);
  // 좌우 padding 24px씩 제외
  const usableWidth = Math.max(280, vw - 48);

  // 양면 펼침 폭 = pageWidth * 2  (모바일 portrait는 1배)
  const spreadFactor = isMobile ? 1 : 2;

  // 1. 높이 기준으로 폭 산출
  let pageHeight = Math.min(usableHeight, 1080);
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
    maxWidth: 900,
    minHeight: 340,
    maxHeight: 1280,
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
    // 페이지 복원
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
  if (e.key === 'ArrowLeft') pageFlip?.flipPrev();
  if (e.key === 'ArrowRight') pageFlip?.flipNext();
});

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
