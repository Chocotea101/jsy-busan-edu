/* ============================================================
   책자(플립북) — StPageFlip
   ============================================================ */

const PAGE_COUNT = 12;
/* 책자 뷰는 고화질(2000px, 원본 PDF 기반) 사용. 메인/공개자료는 가벼운 pages/ 폴더 유지 */
const PAGES = Array.from({ length: PAGE_COUNT }, (_, i) =>
  `assets/img/pages-hd/page-${String(i + 1).padStart(2, '0')}.jpg`
);

const flipEl = document.getElementById('flipbook');
const pageInfoEl = document.getElementById('pageinfo');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');

const pageFlip = new St.PageFlip(flipEl, {
  width: 550,
  height: 781,        // 1200 × 1705 비율 ≈ 1:1.42
  size: 'stretch',
  minWidth: 280,
  maxWidth: 700,
  minHeight: 400,
  maxHeight: 994,
  drawShadow: true,
  maxShadowOpacity: 0.5,
  showCover: true,
  usePortrait: true,
  mobileScrollSupport: false,
  swipeDistance: 30,
  flippingTime: 700
});

pageFlip.loadFromImages(PAGES);

function updateInfo() {
  const current = pageFlip.getCurrentPageIndex() + 1;
  const total = pageFlip.getPageCount();
  pageInfoEl.textContent = `${current} / ${total}`;
  prevBtn.disabled = current <= 1;
  nextBtn.disabled = current >= total;
}

pageFlip.on('flip', updateInfo);
pageFlip.on('init', updateInfo);

prevBtn.addEventListener('click', () => pageFlip.flipPrev());
nextBtn.addEventListener('click', () => pageFlip.flipNext());

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft') pageFlip.flipPrev();
  if (e.key === 'ArrowRight') pageFlip.flipNext();
});

// 초기 한 번 호출 (init 이벤트가 누락되는 경우 대비)
setTimeout(updateInfo, 300);
