/* ============================================================
   책자 페이지
   - 데스크탑: heyzine iframe (책 펼침 효과)
   - 모바일: 인스타 카루셀 (좌우 슬라이드, 자체 이미지)
   ============================================================ */

const PAGES = Array.from({ length: 11 }, (_, i) =>
  `assets/img/pages-hd/page-${String(i + 1).padStart(2, '0')}.jpg`
);

/* ============================================================
   1. 데스크탑 iframe 자동 포커스 (방향키 즉시 동작)
   ============================================================ */
window.addEventListener('load', () => {
  const iframe = document.getElementById('book-iframe');
  if (!iframe) return;
  const focusIt = () => { try { iframe.focus(); } catch (e) {} };
  iframe.addEventListener('load', () => setTimeout(focusIt, 300));
  setTimeout(focusIt, 800);

  // 페이지 어디든 키를 누르면 iframe에 포커스 — heyzine이 키를 받게
  document.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (document.activeElement !== iframe && !mblOpen) {
      focusIt();
    }
  });
});

/* ============================================================
   2. 모바일 인스타 카루셀
   ============================================================ */

const mcarousel = document.getElementById('mbook-carousel');
const mcounter = document.getElementById('mbook-counter');
const mprevBtn = document.getElementById('mbook-prev');
const mnextBtn = document.getElementById('mbook-next');

let mCurrent = 0;

if (mcarousel) {
  // 슬라이드 빌드
  mcarousel.innerHTML = PAGES.map((src, i) => `
    <div class="mbook-slide" data-idx="${i}">
      <img src="${src}" alt="${i + 1}페이지" loading="${i < 2 ? 'eager' : 'lazy'}" draggable="false">
      <div class="mbook-page-num">${i + 1} / ${PAGES.length}</div>
    </div>
  `).join('');

  // 카드 탭 → 라이트박스 확대
  mcarousel.querySelectorAll('.mbook-slide').forEach(slide => {
    slide.querySelector('img').addEventListener('click', () => openMblLightbox(Number(slide.dataset.idx)));
  });

  // 스크롤로 현재 인덱스 갱신
  let scrollTimer = null;
  mcarousel.addEventListener('scroll', () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(updateCarouselIndex, 80);
  }, { passive: true });

  function updateCarouselIndex() {
    const w = mcarousel.clientWidth;
    if (w === 0) return;
    mCurrent = Math.round(mcarousel.scrollLeft / w);
    mCurrent = Math.max(0, Math.min(PAGES.length - 1, mCurrent));
    mcounter.textContent = `${mCurrent + 1} / ${PAGES.length}`;
    mprevBtn.disabled = mCurrent === 0;
    mnextBtn.disabled = mCurrent === PAGES.length - 1;
  }

  function mScroll(d) {
    const w = mcarousel.clientWidth;
    mcarousel.scrollBy({ left: d * w, behavior: 'smooth' });
  }

  mprevBtn.addEventListener('click', () => mScroll(-1));
  mnextBtn.addEventListener('click', () => mScroll(1));

  // 키보드 (모바일에서도 외부 키보드 연결 시 동작)
  document.addEventListener('keydown', e => {
    if (mblOpen) return;
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (e.key === 'ArrowLeft')  { e.preventDefault(); mScroll(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); mScroll(1); }
  });

  updateCarouselIndex();
}

/* ============================================================
   3. 모바일 라이트박스 — 탭 시 페이지 크게 + 줌
   ============================================================ */

const mbl = document.getElementById('mbook-lightbox');
const mblImg = document.getElementById('mbl-img');
const mblStage = document.getElementById('mbl-stage');
const mblCounter = document.getElementById('mbl-counter');
const mblPrev = document.getElementById('mbl-prev');
const mblNext = document.getElementById('mbl-next');
const mblClose = document.getElementById('mbl-close');
const mblZoomIn = document.getElementById('mbl-zoom-in');
const mblZoomOut = document.getElementById('mbl-zoom-out');
const mblZoomLevel = document.getElementById('mbl-zoom-level');

const MBL_ZOOMS = [1, 1.25, 1.5, 2, 2.5, 3];

let mblIndex = 0;
let mblOpen = false;
let mblZoom = 1;

function openMblLightbox(i) {
  if (!mbl) return;
  mblIndex = i;
  mblZoom = 1;
  updateMbl();
  mbl.classList.add('is-open');
  mblOpen = true;
  document.body.style.overflow = 'hidden';
}

function closeMbl() {
  mbl.classList.remove('is-open');
  mblOpen = false;
  document.body.style.overflow = '';
  mblZoom = 1;
  applyMblZoom();
}

function updateMbl() {
  if (!mblImg) return;
  mblImg.src = PAGES[mblIndex];
  mblImg.alt = `${mblIndex + 1}페이지`;
  mblCounter.textContent = `${mblIndex + 1} / ${PAGES.length}`;
  mblPrev.disabled = mblIndex === 0;
  mblNext.disabled = mblIndex === PAGES.length - 1;
  applyMblZoom();
}

function mblStep(d) {
  const i = mblIndex + d;
  if (i < 0 || i >= PAGES.length) return;
  mblIndex = i;
  mblZoom = 1;
  updateMbl();
}

function applyMblZoom() {
  if (!mblImg) return;
  mblImg.style.transform = `scale(${mblZoom})`;
  if (mblZoom > 1) {
    mblStage.classList.add('is-zoomed');
  } else {
    mblStage.classList.remove('is-zoomed');
    mblStage.scrollLeft = 0;
    mblStage.scrollTop = 0;
  }
  mblZoomLevel.textContent = `${Math.round(mblZoom * 100)}%`;
  mblZoomIn.disabled = mblZoom >= MBL_ZOOMS[MBL_ZOOMS.length - 1];
  mblZoomOut.disabled = mblZoom <= 1;
}

function mblZoomStep(d) {
  const i = MBL_ZOOMS.indexOf(mblZoom);
  if (d > 0 && i < MBL_ZOOMS.length - 1) mblZoom = MBL_ZOOMS[i + 1];
  else if (d < 0 && i > 0) mblZoom = MBL_ZOOMS[i - 1];
  applyMblZoom();
}

mblClose?.addEventListener('click', closeMbl);
mblPrev?.addEventListener('click', () => mblStep(-1));
mblNext?.addEventListener('click', () => mblStep(1));
mblZoomIn?.addEventListener('click', () => mblZoomStep(1));
mblZoomOut?.addEventListener('click', () => mblZoomStep(-1));
mblZoomLevel?.addEventListener('click', () => { mblZoom = 1; applyMblZoom(); });

mbl?.addEventListener('click', e => { if (e.target === mbl) closeMbl(); });

document.addEventListener('keydown', e => {
  if (!mblOpen) return;
  if (e.key === 'Escape') closeMbl();
  if (e.key === 'ArrowRight') { e.preventDefault(); mblStep(1); }
  if (e.key === 'ArrowLeft')  { e.preventDefault(); mblStep(-1); }
  if (e.key === '+' || e.key === '=') { e.preventDefault(); mblZoomStep(1); }
  if (e.key === '-' || e.key === '_') { e.preventDefault(); mblZoomStep(-1); }
  if (e.key === '0') { e.preventDefault(); mblZoom = 1; applyMblZoom(); }
});

let mblTouchStart = null;
mbl?.addEventListener('touchstart', e => {
  if (mblZoom > 1) return;
  mblTouchStart = e.touches[0].clientX;
}, { passive: true });
mbl?.addEventListener('touchend', e => {
  if (mblTouchStart === null) return;
  const dx = e.changedTouches[0].clientX - mblTouchStart;
  if (Math.abs(dx) > 50) { if (dx < 0) mblStep(1); else mblStep(-1); }
  mblTouchStart = null;
}, { passive: true });
