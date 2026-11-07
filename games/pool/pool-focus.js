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
  const backdropSelect = document.getElementById("focusBackdrop");
  if (!stage || !table || !zoomOut || !zoomIn || !zoomFit || !focusBtn) return;

  let zoom = 1;
  let savedScrollY = 0;
  let locked = false;
  let focused = false;
  let raf = 0;

  function applyZoom() {
    table.style.transform = "none";
    table.style.width = zoom === 1
      ? ""
      : (zoom * 100).toFixed(0) + "%";
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
    document.documentElement.style.touchAction = focused ? "pan-y" : "none";
    document.body.style.touchAction = focused ? "pan-y" : "none";
    document.body.style.top = "-" + savedScrollY + "px";
    locked = true;
  }
  function unlockPage() {
    if (!locked) return;
    document.documentElement.classList.remove("pool-scroll-locked");
    document.body.classList.remove("pool-scroll-locked");
    document.body.style.top = "";
    document.body.style.touchAction = "";
    document.documentElement.style.touchAction = "";
    locked = false;
    window.scrollTo(0, savedScrollY);
  }
  function syncLock() {
    const state = window.ROLYFE_POOL && window.ROLYFE_POOL.state;
    const shotInMotion = !!(state && state.shooting && !state.paused && !state.gameOver);
    if (focused || shotInMotion) lockPage();
    else unlockPage();
  }
  function setBackdrop(value) {
    const allowed = ["midnight", "ocean", "slate", "plum", "forest"];
    const chosen = allowed.includes(value) ? value : "midnight";
    stage.dataset.backdrop = chosen;
    if (backdropSelect && backdropSelect.value !== chosen) backdropSelect.value = chosen;
  }
  const focusDock = document.createElement("div");
  focusDock.className = "pool-focus-dock";
  focusDock.setAttribute("aria-label", "Pool shooting controls");
  focusDock.hidden = true;
  stage.appendChild(focusDock);

  const dockTargets = ["pool-power-panel", "pool-actions", "pool-controls"]
    .map(className => document.querySelector("." + className))
    .filter(Boolean);
  const dockPlaceholders = dockTargets.map(node => {
    const marker = document.createComment("ROLYFE_POOL_DOCK_HOME");
    node.parentNode.insertBefore(marker, node);
    return marker;
  });
  function moveControlsIntoFocus() {
    dockTargets.forEach(node => focusDock.appendChild(node));
    focusDock.hidden = false;
  }
  function restoreControlsToPage() {
    dockTargets.forEach((node, index) => {
      const marker = dockPlaceholders[index];
      if (marker && marker.parentNode) marker.parentNode.insertBefore(node, marker);
    });
    focusDock.hidden = true;
  }

  function setFocus(value) {
    focused = !!value;
    if (focused) moveControlsIntoFocus();
    stage.classList.toggle("is-focused", focused);
    if (!focused) restoreControlsToPage();
    focusBtn.setAttribute("aria-pressed", String(focused));
    focusBtn.textContent = focused ? "✕ EXIT FOCUS" : "⛶ FOCUS TABLE";
    syncLock();
    if (focused) setTimeout(() => focusBtn.focus({preventScroll:true}), 0);
  }

  setBackdrop(backdropSelect ? backdropSelect.value : "midnight");
  backdropSelect?.addEventListener("change", () => setBackdrop(backdropSelect.value));
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
    const gameState = window.ROLYFE_POOL && window.ROLYFE_POOL.state;
    const aim = document.getElementById("aimLine");
    if (aim && gameState) {
      const power = Math.max(0, Math.min(1, Number(gameState.power) || 0));
      aim.style.setProperty("--cue-stick-length", (48 + power * 56) + "px");
    }
    raf = window.requestAnimationFrame(monitor);
  }
  applyZoom();
  monitor();
  window.addEventListener("pagehide", () => {
    if (raf) cancelAnimationFrame(raf);
    unlockPage();
  });
})();
