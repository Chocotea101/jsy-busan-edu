/* ============================================================
   책자(플립북) — StPageFlip
   ============================================================ */

/* 책자 뷰는 고화질(300dpi PNG, 2079×2953) 사용.
   교육정책팀 요청으로 p2(후보자정보공개자료)는 책자 뷰에서 제외. */
const PAGE_NUMBERS = [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const PAGES = PAGE_NUMBERS.map(n =>
  `assets/img/pages-hd/page-${String(n).padStart(2, '0')}.png`
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
