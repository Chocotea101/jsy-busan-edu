/* ============================================================
   책자(플립북) — StPageFlip
   - 화면 크기에 따라 책 크기 자동 조절 (더 크게)
   - 페이지 확대(🔍) → 풀스크린 라이트박스
   - p2(후보자정보공개자료)는 책자 뷰에서 제외
   ============================================================ */

/* 새 책자 이미지(공보물 11장) — 1~11번 순차 */
const PAGES = Array.from({ length: 11 }, (_, i) =>
  `assets/img/pages-hd/page-${String(i + 1).padStart(2, '0')}.jpg`
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
   페이지 확대 라이트박스 (카루셀 + 줌 컨트롤)
   ============================================================ */

const lbEl = document.getElementById('book-lightbox');
const lbCarousel = document.getElementById('bl-carousel');
const lbCounter = document.getElementById('bl-counter');
const lbPrev = document.getElementById('bl-prev');
const lbNext = document.getElementById('bl-next');
const lbClose = document.getElementById('bl-close');
const lbZoomIn = document.getElementById('bl-zoom-in');
const lbZoomOut = document.getElementById('bl-zoom-out');
const lbZoomLevel = document.getElementById('bl-zoom-level');

const ZOOM_LEVELS = [1, 1.25, 1.5, 2, 2.5, 3];

let lbIndex = 0;
let lbBuilt = false;
let currentZoom = 1;

function buildLightboxSlides() {
  if (lbBuilt || !lbCarousel) return;
  lbCarousel.innerHTML = PAGES.map((src, i) => `
    <div class="bl-slide" data-idx="${i}">
      <img src="${src}" alt="${i + 1}페이지" loading="lazy" draggable="false">
    </div>
  `).join('');
  lbBuilt = true;

  // 스크롤로 현재 슬라이드 인덱스 업데이트 (줌 100%일 때만)
  let scrollTimer = null;
  lbCarousel.addEventListener('scroll', () => {
    if (currentZoom > 1) return;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(updateIndexFromScroll, 80);
  }, { passive: true });
}

function updateIndexFromScroll() {
  if (!lbCarousel) return;
  const w = lbCarousel.clientWidth;
  if (w === 0) return;
  const newIdx = Math.round(lbCarousel.scrollLeft / w);
  lbIndex = Math.max(0, Math.min(PAGES.length - 1, newIdx));
  updateLightboxUI();
}

function updateLightboxUI() {
  lbCounter.textContent = `${lbIndex + 1} / ${PAGES.length}`;
  lbPrev.disabled = lbIndex === 0;
  lbNext.disabled = lbIndex === PAGES.length - 1;
}

function scrollToSlide(idx, behavior = 'smooth') {
  if (!lbCarousel) return;
  const w = lbCarousel.clientWidth;
  lbCarousel.scrollTo({ left: idx * w, behavior });
}

/* ===== 줌 ===== */
function applyZoom() {
  const isZoomed = currentZoom > 1;
  const slides = lbCarousel.querySelectorAll('.bl-slide');

  slides.forEach(slide => {
    slide.classList.toggle('is-zoomed', isZoomed);
    slide.style.setProperty('--zoom-scale', currentZoom);
  });

  // 줌 인 시 카루셀 snap 해제 (슬라이드 안에서 자유 패닝)
  lbCarousel.classList.toggle('is-zoom-mode', isZoomed);

  // UI 갱신
  lbZoomLevel.textContent = `${Math.round(currentZoom * 100)}%`;
  lbZoomIn.disabled = currentZoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
  lbZoomOut.disabled = currentZoom <= 1;

  // 줌 적용 후 현재 슬라이드를 다시 화면 중앙으로
  if (!isZoomed) {
    requestAnimationFrame(() => scrollToSlide(lbIndex, 'instant'));
  } else {
    // 줌 모드: 현재 슬라이드의 가운데로 스크롤
    requestAnimationFrame(() => {
      const slide = lbCarousel.querySelector(`.bl-slide[data-idx="${lbIndex}"]`);
      if (slide) {
        const img = slide.querySelector('img');
        if (img) {
          slide.scrollLeft = (img.offsetWidth - slide.clientWidth) / 2;
          slide.scrollTop = (img.offsetHeight - slide.clientHeight) / 2;
        }
      }
    });
  }
}

function zoomIn() {
  const i = ZOOM_LEVELS.indexOf(currentZoom);
  if (i < 0) {
    // 비표준 값 → 가장 가까운 다음 단계
    currentZoom = ZOOM_LEVELS.find(z => z > currentZoom) || ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
  } else if (i < ZOOM_LEVELS.length - 1) {
    currentZoom = ZOOM_LEVELS[i + 1];
  }
  applyZoom();
}

function zoomOut() {
  const i = ZOOM_LEVELS.indexOf(currentZoom);
  if (i < 0) {
    currentZoom = [...ZOOM_LEVELS].reverse().find(z => z < currentZoom) || 1;
  } else if (i > 0) {
    currentZoom = ZOOM_LEVELS[i - 1];
  }
  applyZoom();
}

function zoomReset() {
  currentZoom = 1;
  applyZoom();
}

/* ===== 라이트박스 열고 닫기 ===== */
function openLightbox() {
  if (!pageFlip) return;
  buildLightboxSlides();
  lbIndex = pageFlip.getCurrentPageIndex();
  currentZoom = 1;
  applyZoom();
  lbEl.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    scrollToSlide(lbIndex, 'instant');
    updateLightboxUI();
  });
}

function closeLightbox() {
  lbEl.classList.remove('is-open');
  document.body.style.overflow = '';
  currentZoom = 1;
  if (pageFlip && lbIndex !== pageFlip.getCurrentPageIndex()) {
    try { pageFlip.turnToPage(lbIndex); } catch (e) {}
  }
}

function lbStep(d) {
  const i = lbIndex + d;
  if (i < 0 || i >= PAGES.length) return;
  lbIndex = i;
  if (currentZoom > 1) {
    // 줌 모드에서는 줌을 유지하면서 페이지 변경
    requestAnimationFrame(() => {
      scrollToSlide(lbIndex, 'instant');
      // 새 슬라이드도 가운데로
      const slide = lbCarousel.querySelector(`.bl-slide[data-idx="${lbIndex}"]`);
      if (slide) {
        const img = slide.querySelector('img');
        if (img) {
          slide.scrollLeft = (img.offsetWidth - slide.clientWidth) / 2;
          slide.scrollTop = (img.offsetHeight - slide.clientHeight) / 2;
        }
      }
    });
  } else {
    scrollToSlide(lbIndex);
  }
  updateLightboxUI();
}

/* ===== 이벤트 ===== */
zoomBtn?.addEventListener('click', openLightbox);
lbClose?.addEventListener('click', closeLightbox);
lbPrev?.addEventListener('click', () => lbStep(-1));
lbNext?.addEventListener('click', () => lbStep(1));
lbZoomIn?.addEventListener('click', zoomIn);
lbZoomOut?.addEventListener('click', zoomOut);
lbZoomLevel?.addEventListener('click', zoomReset);

lbEl?.addEventListener('click', e => {
  if (e.target === lbEl) closeLightbox();
});

document.addEventListener('keydown', e => {
  if (!lbEl?.classList.contains('is-open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowRight') { e.preventDefault(); lbStep(1); }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); lbStep(-1); }
  if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomIn(); }
  if (e.key === '-' || e.key === '_') { e.preventDefault(); zoomOut(); }
  if (e.key === '0') { e.preventDefault(); zoomReset(); }
});

// 리사이즈 시 현재 슬라이드 위치 보정
window.addEventListener('resize', () => {
  if (lbEl?.classList.contains('is-open')) {
    setTimeout(() => {
      if (currentZoom === 1) scrollToSlide(lbIndex, 'instant');
    }, 100);
  }
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
