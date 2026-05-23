/* ============================================================
   공통 — 위로 가기 버튼
   ============================================================ */

(function () {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;

  const THRESHOLD = 360;
  let ticking = false;

  function update() {
    btn.classList.toggle('is-visible', window.scrollY > THRESHOLD);
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  update();
})();
