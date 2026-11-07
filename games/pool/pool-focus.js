/* RO'Lyfe Pool — table focus, zoom and shot scroll lock */
(() => {
  "use strict";
  const stage = document.getElementById("poolStage");
  const table = document.getElementById("poolTable");
  const zoomOut = document.getElementById("tableZoomOut");
  const zoomIn = document.getElementById("tableZoomIn");
  const zoomFit = document.getElementById("tableZoomFit");
  const zoomValue = document.getElementById("tableZoomValue");
  const focusBtn = document.getElementById("tableFocusBtn");
  if (!stage || !table || !zoomOut || !zoomIn || !zoomFit || !focusBtn) return;

  let zoom = 1;
  let savedScrollY = 0;
  let locked = false;
  let focused = false;
  let raf = 0;

  function applyZoom() {
    table.style.transform = "scale(" + zoom.toFixed(2) + ")";
    if (zoomValue) zoomValue.textContent = Math.round(zoom * 100) + "%";
    zoomOut.disabled = zoom <= 0.8;
    zoomIn.disabled = zoom >= 1.5;
  }
  function setZoom(next) {
    zoom = Math.max(0.8, Math.min(1.5, Math.round(next * 10) / 10));
    applyZoom();
  }
  function lockPage() {
    if (locked) return;
    savedScrollY = window.scrollY || window.pageYOffset || 0;
    document.documentElement.classList.add("pool-scroll-locked");
    document.body.classList.add("pool-scroll-locked");
    document.body.style.top = "-" + savedScrollY + "px";
    locked = true;
  }
  function unlockPage() {
    if (!locked) return;
    document.documentElement.classList.remove("pool-scroll-locked");
    document.body.classList.remove("pool-scroll-locked");
    document.body.style.top = "";
    locked = false;
    window.scrollTo(0, savedScrollY);
  }
  function syncLock() {
    const state = window.ROLYFE_POOL && window.ROLYFE_POOL.state;
    const shotInMotion = !!(state && state.shooting && !state.paused && !state.gameOver);
    if (focused || shotInMotion) lockPage();
    else unlockPage();
  }
  function setFocus(value) {
    focused = !!value;
    stage.classList.toggle("is-focused", focused);
    focusBtn.setAttribute("aria-pressed", String(focused));
    focusBtn.textContent = focused ? "✕ EXIT FOCUS" : "⛶ FOCUS TABLE";
    syncLock();
    if (focused) setTimeout(() => focusBtn.focus({preventScroll:true}), 0);
  }

  zoomOut.addEventListener("click", () => setZoom(zoom - 0.1));
  zoomIn.addEventListener("click", () => setZoom(zoom + 0.1));
  zoomFit.addEventListener("click", () => setZoom(1));
  focusBtn.addEventListener("click", () => setFocus(!focused));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && focused) {
      event.preventDefault();
      setFocus(false);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && !focused) unlockPage();
  });

  function monitor() {
    syncLock();
    raf = window.requestAnimationFrame(monitor);
  }
  applyZoom();
  monitor();
  window.addEventListener("pagehide", () => {
    if (raf) cancelAnimationFrame(raf);
    unlockPage();
  });
})();
