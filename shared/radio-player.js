/* RO'Lyfe Gaming Radio — shared background station player */
(() => {
  if (window.__rolyfeRadioMounted) return;
  window.__rolyfeRadioMounted = true;

  const API = "https://nzduinxmsmmdbonefifi.supabase.co/functions/v1/rolyfe-radio-browser";
  const API_KEY = "sb_publishable_lD4rMx8S_OvBRHNWajgQKQ_hYmCjFzY";
  const PREF_KEY = "rolyfeGamingRadioPrefs";
  const genres = [
    { id: "caribbean", label: "Caribbean Island Mix", tags: ["caribbean", "soca", "dancehall", "reggae", "kompa", "zouk", "calypso"] },
    { id: "hip-hop", label: "Hip-Hop · All", tags: ["hip-hop", "hip hop", "rap"] },
    { id: "old-school-hip-hop", label: "Old School / 90s Hip-Hop", tags: ["old school hip hop", "oldschool hip hop", "90s hip hop", "golden age hip hop"] },
    { id: "east-coast-hip-hop", label: "East Coast / Boom Bap", tags: ["east coast hip hop", "boom bap", "east coast rap"] },
    { id: "west-coast-hip-hop", label: "West Coast / G-Funk", tags: ["west coast hip hop", "g-funk", "west coast rap"] },
    { id: "southern-hip-hop", label: "Southern Hip-Hop", tags: ["southern hip hop", "southern rap", "crunk"] },
    { id: "trap", label: "Trap", tags: ["trap", "trap music", "atlanta trap"] },
    { id: "drill", label: "Drill / UK Rap", tags: ["drill", "uk drill", "ny drill", "grime"] },
    { id: "underground-hip-hop", label: "Underground / Alternative Rap", tags: ["underground hip hop", "alternative hip hop", "conscious hip hop"] },
    { id: "rnb", label: "R&B / Soul", tags: ["r&b", "rnb", "rhythm and blues", "soul"] },
    { id: "neo-soul", label: "Neo-Soul", tags: ["neo soul", "neo-soul"] },
    { id: "reggae", label: "Reggae / Roots", tags: ["reggae", "roots reggae"] },
    { id: "dancehall", label: "Dancehall / Bashment", tags: ["dancehall", "bashment"] },
    { id: "soca", label: "Soca & Calypso", tags: ["soca", "calypso"] },
    { id: "kompa-zouk", label: "Kompa / Zouk", tags: ["kompa", "konpa", "compas", "zouk"] },
    { id: "afrobeats", label: "Afrobeats", tags: ["afrobeats", "afrobeat"] },
    { id: "lofi", label: "Lo-Fi / Chill", tags: ["lofi", "lo-fi", "chillout"] },
    { id: "smooth-jazz", label: "Smooth Jazz", tags: ["smooth jazz", "smooth-jazz", "jazz"] },
    { id: "country", label: "Country Music", tags: ["country", "country music", "classic country", "nashville", "bluegrass", "americana"] }
  ];

  const countries = [
    { value: "ALL", label: "All Caribbean Islands" },
    { value: "GLOBAL", label: "Global / Diaspora" },
    { value: "AI", label: "Anguilla" },
    { value: "AG", label: "Antigua & Barbuda" },
    { value: "AW", label: "Aruba" },
    { value: "BS", label: "Bahamas" },
    { value: "BB", label: "Barbados" },
    { value: "BZ", label: "Belize" },
    { value: "BM", label: "Bermuda" },
    { value: "BQ", label: "Bonaire & Caribbean Netherlands" },
    { value: "VG", label: "British Virgin Islands" },
    { value: "KY", label: "Cayman Islands" },
    { value: "CU", label: "Cuba" },
    { value: "CW", label: "Curaçao" },
    { value: "DM", label: "Dominica" },
    { value: "DO", label: "Dominican Republic" },
    { value: "GF", label: "French Guiana" },
    { value: "GD", label: "Grenada" },
    { value: "GP", label: "Guadeloupe" },
    { value: "GY", label: "Guyana" },
    { value: "HT", label: "Haiti" },
    { value: "JM", label: "Jamaica" },
    { value: "MQ", label: "Martinique" },
    { value: "MS", label: "Montserrat" },
    { value: "PR", label: "Puerto Rico" },
    { value: "BL", label: "Saint Barthélemy" },
    { value: "KN", label: "Saint Kitts & Nevis" },
    { value: "LC", label: "Saint Lucia" },
    { value: "MF", label: "Saint Martin" },
    { value: "VC", label: "Saint Vincent & the Grenadines" },
    { value: "SX", label: "Sint Maarten" },
    { value: "SR", label: "Suriname" },
    { value: "TT", label: "Trinidad & Tobago" },
    { value: "TC", label: "Turks & Caicos Islands" },
    { value: "VI", label: "U.S. Virgin Islands" }
  ];

  const CARIBBEAN_CODES = new Set([
    "AI","AG","AW","BS","BB","BZ","BM","BQ","VG","KY","CU","CW","DM","DO","GD",
    "GP","GF","GY","HT","JM","MQ","MS","PR","BL","KN","LC","MF","VC","SX","TT",
    "TC","VI","SR"
  ]);
  const CARIBBEAN_COUNTRIES = new Set([
    "anguilla","antigua and barbuda","aruba","bahamas","barbados","belize","bermuda",
    "bonaire, sint eustatius and saba","british virgin islands","cayman islands","cuba",
    "curaçao","curacao","dominica","dominican republic","french guiana","grenada",
    "guadeloupe","guyana","haiti","jamaica","martinique","montserrat","puerto rico",
    "saint barthélemy","saint barthelemy","saint kitts and nevis","saint lucia","saint martin",
    "saint vincent and the grenadines","sint maarten","suriname","trinidad and tobago",
    "turks and caicos islands","united states virgin islands","u.s. virgin islands"
  ]);

  let prefs = { volume: 0.28, muted: false, genre: "caribbean", country: "ALL", lastStation: null, defaultStationId: null };
  try { prefs = { ...prefs, ...JSON.parse(localStorage.getItem(PREF_KEY) || "{}") }; } catch (_) {}
  if (!Array.isArray(prefs.savedStations)) prefs.savedStations = [];
  let stations = [];
  let currentIndex = -1;
  let busy = false;
  let stationLoadSeq = 0;
  let stationController = null;
  let playSequence = 0;

  const style = document.createElement("style");
  style.textContent = `
    #rolRadioRoot{position:fixed;right:12px;bottom:calc(88px + env(safe-area-inset-bottom,0px));z-index:99990;font:14px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;color:#f4fff8}
    #rolRadioRoot *{box-sizing:border-box}
    #rolRadioLauncher{display:flex;align-items:center;gap:8px;border:1px solid #63dca0aa;border-radius:999px;padding:11px 15px;background:linear-gradient(135deg,#123d31,#142b3e);color:#f4fff8;font-weight:850;box-shadow:0 8px 28px #0008;cursor:pointer}
    #rolRadioLauncher .rol-radio-dot{width:9px;height:9px;border-radius:50%;background:#67efaa;box-shadow:0 0 12px #67efaa}
    #rolRadioPanel{display:none;position:absolute;right:0;bottom:58px;width:min(350px,calc(100vw - 24px));max-height:min(82vh,680px);overflow:auto;border:1px solid #3b725b;border-radius:20px;background:linear-gradient(155deg,#10231b,#0a1317 72%);box-shadow:0 18px 55px #000b;padding:15px}
    #rolRadioPanel.open{display:block}
    .rol-radio-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
    .rol-radio-title{font-size:15px;font-weight:900;letter-spacing:.02em}.rol-radio-sub{font-size:11px;color:#a8c3b4;margin-top:2px}
    .rol-radio-close,.rol-radio-btn{border:1px solid #355947;border-radius:10px;background:#142b20;color:#eafff1;padding:8px 10px;cursor:pointer;font:inherit}
    .rol-radio-close{font-size:17px;line-height:1}
    #rolRadioGenre,#rolRadioCountry{width:100%;min-height:42px;border:1px solid #355947;border-radius:11px;background:#0c1b14;color:#f4fff8;padding:9px;margin:2px 0 10px}
    #rolRadioNow{padding:11px;border:1px solid #315641;border-radius:13px;background:#0c1913;margin-bottom:10px}
    #rolRadioStation{font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #rolRadioStatus{font-size:11px;color:#a7c2b2;margin-top:3px;min-height:16px}
    .rol-radio-controls{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
    .rol-radio-btn.primary{background:#63e49c;color:#07140c;border-color:#63e49c;font-weight:900}
    .rol-radio-btn[aria-pressed="true"]{border-color:#ffb15c;color:#ffca8b}
    .rol-radio-volume{display:grid;grid-template-columns:auto 1fr auto;gap:9px;align-items:center;margin:12px 0 10px;color:#bdd4c5;font-size:12px}
    #rolRadioVolume{width:100%;accent-color:#63e49c}
    #rolRadioSaveStation{display:block;width:100%;margin-top:8px;border:1px solid #4d8d63;border-radius:10px;background:#153522;color:#d9ffe3;padding:9px 12px;font-weight:900;font-size:11px;cursor:pointer}
    #rolRadioSaveStation[aria-pressed="true"]{background:#23452e;color:#9ff4b9;border-color:#86dda0}
    #rolRadioSaveStation:disabled,#rolRadioSetDefault:disabled{opacity:.55;cursor:not-allowed}
    #rolRadioSetDefault{display:block;width:100%;margin-top:6px;border:1px solid #49694f;border-radius:10px;background:#121f17;color:#bfdcc5;padding:8px 12px;font-weight:850;font-size:11px;cursor:pointer}
    #rolRadioSetDefault[aria-pressed="true"]{border-color:#89d99a;background:#183b28;color:#a9f4bb}
    .rol-radio-guest-note{margin:-5px 0 10px;color:#89a895;font-size:9px;line-height:1.45}
    .rol-radio-seek-controls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:7px 0 3px}
    .rol-radio-seek-controls button{border:1px solid #385c45;border-radius:9px;background:#12271a;color:#d9f2df;padding:8px 5px;font-size:10px;font-weight:850}
    .rol-radio-seek-controls button:disabled{opacity:.38;cursor:not-allowed;filter:saturate(.4)}
    .rol-radio-seek-hint{min-height:17px;margin:2px 0 7px;color:#91aa99;font-size:9px;line-height:1.4}
    .rol-radio-default{flex:none;border:1px solid #466b4d;border-radius:8px;background:#12251a;color:#afd9b6;padding:6px 7px;font-size:9px;font-weight:850;white-space:nowrap;cursor:pointer}
    .rol-radio-default[aria-pressed="true"]{border-color:#88d99a;background:#193b27;color:#a6f2b8}
    .rol-radio-saved-section{margin:10px 0 12px;padding:10px;border:1px solid #315641;border-radius:12px;background:#0d1913}
    .rol-radio-saved-title{display:flex;align-items:center;justify-content:space-between}
    #rolRadioSavedCount{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 5px;border-radius:99px;background:#1b3b2a;color:#a7f0bd;font-size:10px;font-weight:900}
    #rolRadioSavedList{display:grid;gap:6px;margin-top:8px;max-height:148px;overflow:auto;overscroll-behavior:contain}
    .rol-radio-saved-row,.rol-radio-station-row{display:flex;align-items:stretch;gap:6px;min-width:0}
    .rol-radio-saved-play{display:flex;flex:1;align-items:center;justify-content:space-between;gap:8px;min-width:0;text-align:left;border:1px solid #284b36;border-radius:9px;background:#10251a;color:#eafff1;padding:8px 9px;cursor:pointer}
    .rol-radio-saved-play span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;font-weight:850}
    .rol-radio-saved-play small{flex:none;color:#9cb7a7;font-size:9px}
    .rol-radio-saved-remove,.rol-radio-fav{flex:none;min-width:38px;border:1px solid #355947;border-radius:9px;background:#142b20;color:#eafff1;padding:7px 9px;cursor:pointer;font:inherit;font-size:14px}
    .rol-radio-saved-remove{color:#d9b5aa}
    .rol-radio-fav[aria-pressed="true"]{border-color:#63e49c;background:#173b28;color:#9ff4b9}
    #rolRadioList{display:grid;gap:6px;margin-top:9px}
    .rol-radio-station{display:flex;flex:1;align-items:center;gap:9px;width:100%;min-width:0;text-align:left;border:1px solid #263f32;border-radius:10px;background:#0d1a14;color:#eaf8ef;padding:9px;cursor:pointer}
    .rol-radio-station[aria-current="true"]{border-color:#63e49c;background:#153322}
    .rol-radio-station span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .rol-radio-station small{margin-left:auto;color:#9cb7a7;white-space:nowrap;font-size:10px}
    #rolRadioRoot button:focus-visible,#rolRadioRoot select:focus-visible,#rolRadioRoot input:focus-visible{outline:2px solid #9affc3;outline-offset:2px}
    @media(max-width:520px){#rolRadioRoot{right:10px;bottom:calc(12px + env(safe-area-inset-bottom,0px))}#rolRadioPanel{width:min(380px,calc(100vw - 20px));max-height:84vh;max-height:84dvh;padding:14px}#rolRadioLauncher{padding:10px 13px}}
    @media(prefers-reduced-motion:reduce){#rolRadioRoot *{scroll-behavior:auto!important;transition:none!important}}
  `;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.id = "rolRadioRoot";
  root.innerHTML = `
    <section id="rolRadioPanel" aria-label="RO'Lyfe Gaming Radio" aria-hidden="true">
      <div class="rol-radio-head">
        <div><div class="rol-radio-title">🎧 RO’Lyfe Music Stations</div><div class="rol-radio-sub">Island stations, Hip-Hop, R&B and more · Save favorites & listen while you play</div></div>
        <button class="rol-radio-close" id="rolRadioClose" type="button" aria-label="Close radio">×</button>
      </div>
      <label class="rol-radio-sub" for="rolRadioGenre">CHOOSE YOUR SOUND</label>
      <select id="rolRadioGenre" aria-label="Radio genre">
        ${genres.map(g => `<option value="${g.id}">${g.label}</option>`).join("")}
      </select>
      <label class="rol-radio-sub" for="rolRadioCountry">EXPLORE BY COUNTRY</label>
      <select id="rolRadioCountry" aria-label="Explore radio stations by country">
        <option value="ALL">All Caribbean Islands</option>
        <option value="GLOBAL">Global / Diaspora</option>
        ${countries.filter(c => !["ALL","GLOBAL"].includes(c.value)).map(c => `<option value="${c.value}">${c.label}</option>`).join("")}
      </select>
      <div class="rol-radio-guest-note">Guest listening · No account required. Your station choices stay on this device. Third-party stations may carry their own advertising.</div>
      <div id="rolRadioNow">
        <div id="rolRadioStation">Choose a station to begin</div>
        <div id="rolRadioStatus" role="status" aria-live="polite">Radio is off until you press Play.</div>
      </div>
      <div class="rol-radio-controls">
        <button class="rol-radio-btn" id="rolRadioPrevious" type="button">⏮ Previous</button>
        <button class="rol-radio-btn primary" id="rolRadioPlay" type="button">▶ Play</button>
        <button class="rol-radio-btn" id="rolRadioNext" type="button">⏭ Next</button>
        <button class="rol-radio-btn" id="rolRadioMute" type="button" aria-pressed="false">🔊 Mute</button>
      </div>
      <div class="rol-radio-seek-controls" aria-label="Live catch-up controls">
        <button id="rolRadioRewind" type="button" disabled>↶ 30s</button>
        <button id="rolRadioForward" type="button" disabled>30s ↷</button>
        <button id="rolRadioGoLive" type="button" disabled>● Go Live</button>
      </div>
      <div id="rolRadioSeekHint" class="rol-radio-seek-hint" aria-live="polite">Rewind and forward work when this station provides a catch-up buffer.</div>
      <button id="rolRadioSaveStation" type="button" aria-pressed="false" disabled>♡ Save current station</button>
      <button id="rolRadioSetDefault" type="button" aria-pressed="false" disabled>☆ Set as Default</button>
      <label class="rol-radio-volume"><span>VOL</span><input id="rolRadioVolume" type="range" min="0" max="1" step=".01" aria-label="Background radio volume"><span id="rolRadioVolumeValue">28%</span></label>
      <div class="rol-radio-saved-section"><div class="rol-radio-sub rol-radio-saved-title">♡ SAVED STATIONS <span id="rolRadioSavedCount">0</span></div><div id="rolRadioSavedList"><div class="rol-radio-sub">Tap ♡ beside a station to keep it here.</div></div></div>
      <div class="rol-radio-sub">AVAILABLE STATIONS</div>
      <div id="rolRadioList"><div class="rol-radio-sub">Open a genre to find stations.</div></div>
      <audio id="rolRadioAudio" preload="none" playsinline></audio>
    </section>
    <button id="rolRadioLauncher" type="button" aria-expanded="false" aria-controls="rolRadioPanel"><span class="rol-radio-dot"></span><span>Radio</span><span aria-hidden="true">♫</span></button>
  `;
  function mountRadioRoot() {
    // Fullscreen APIs only display descendants of the active fullscreen element.
    // Move the radio controls into that element so they remain visible over a game.
    const target = document.fullscreenElement || document.body;
    if (root.parentElement !== target) target.appendChild(root);
  }
  mountRadioRoot();
  document.addEventListener("fullscreenchange", mountRadioRoot);
  document.addEventListener("webkitfullscreenchange", mountRadioRoot);

  const $ = (id) => document.getElementById(id);
  const panel = $("rolRadioPanel");
  const audio = $("rolRadioAudio");
  const status = $("rolRadioStatus");
  const stationTitle = $("rolRadioStation");
  const list = $("rolRadioList");
  const savedList = $("rolRadioSavedList");
  const savedCount = $("rolRadioSavedCount");
  const saveCurrentButton = $("rolRadioSaveStation");
  const setDefaultButton = $("rolRadioSetDefault");
  const rewindButton = $("rolRadioRewind");
  const forwardButton = $("rolRadioForward");
  const goLiveButton = $("rolRadioGoLive");
  const seekHint = $("rolRadioSeekHint");
  const genreSelect = $("rolRadioGenre");
  const countrySelect = $("rolRadioCountry");
  const playButton = $("rolRadioPlay");
  const quickPauseButton = $("quickPauseToggle");
  const muteButton = $("rolRadioMute");
  const volume = $("rolRadioVolume");
  const volumeValue = $("rolRadioVolumeValue");

  function savePrefs() {
    try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (_) {}
  }
  function setStatus(message) { status.textContent = message; }
  function syncQuickPauseButton() {
    if (!quickPauseButton) return;
    const playing = !audio.paused;
    quickPauseButton.textContent = playing ? "Ⅱ Pause" : (prefs.lastStation ? "▶ Resume" : "▶ Play");
    quickPauseButton.setAttribute("aria-pressed", String(playing));
  }
  function getSeekableBounds() {
    try {
      const ranges = audio.seekable;
      if (!ranges || !ranges.length) return null;
      const last = ranges.length - 1;
      const start = ranges.start(last);
      const end = ranges.end(last);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end - start < 2) return null;
      return { start, end };
    } catch (_) { return null; }
  }
  function syncSeekControls() {
    const bounds = getSeekableBounds();
    const current = Number(audio.currentTime);
    const ready = Boolean(bounds && Number.isFinite(current));
    const rewindAvailable = ready && current > bounds.start + 0.75;
    const forwardAvailable = ready && current < bounds.end - 1.5;
    const liveAvailable = ready && bounds.end - current > 2;
    rewindButton.disabled = !rewindAvailable;
    forwardButton.disabled = !forwardAvailable;
    goLiveButton.disabled = !liveAvailable;
    if (!ready) {
      seekHint.textContent = "Live-only stream · this station does not provide a rewind buffer.";
    } else {
      const behind = Math.max(0, Math.round(bounds.end - current));
      const windowSeconds = Math.max(0, Math.round(bounds.end - bounds.start));
      seekHint.textContent = behind > 2
        ? "Catch-up available · " + behind + "s behind live · " + Math.round(windowSeconds / 60) + " min window"
        : "Catch-up buffer available · You are at the live edge.";
    }
  }
  function seekLiveOffset(seconds) {
    const bounds = getSeekableBounds();
    if (!bounds) {
      setStatus("This station is live-only. Its broadcaster has not supplied a catch-up buffer.");
      syncSeekControls();
      return false;
    }
    const current = Number.isFinite(Number(audio.currentTime)) ? Number(audio.currentTime) : bounds.end;
    const target = Math.max(bounds.start, Math.min(bounds.end - 0.5, current + seconds));
    try {
      audio.currentTime = target;
      setStatus(seconds < 0 ? "Rewinding within this station's available catch-up window…" : "Moving forward within this station's catch-up window…");
      syncSeekControls();
      return true;
    } catch (_) {
      setStatus("This station does not allow seeking in its current stream.");
      syncSeekControls();
      return false;
    }
  }
  function goToLiveEdge() {
    const bounds = getSeekableBounds();
    if (!bounds) {
      setStatus("This station is live-only and has no catch-up buffer.");
      syncSeekControls();
      return false;
    }
    try {
      audio.currentTime = Math.max(bounds.start, bounds.end - 0.5);
      setStatus("Back at the live edge.");
      syncSeekControls();
      return true;
    } catch (_) {
      setStatus("This station does not expose a live seek window.");
      syncSeekControls();
      return false;
    }
  }
  function setDefaultStation(station) {
    if (!station?.stationuuid) {
      setStatus("Choose a station first, then set it as your default.");
      return false;
    }
    if (!stationIsSaved(station)) toggleSavedStation(station);
    prefs.defaultStationId = station.stationuuid;
    if (prefs.lastStation?.stationuuid && prefs.lastStation.stationuuid !== station.stationuuid) prefs.lastStation = null;
    savePrefs();
    renderSavedStations();
    renderCurrentSaveButton();
    setStatus((station.name || "Station") + " is now your default station on this device.");
    return true;
  }
  function currentGenre() { return genres.find(g => g.id === prefs.genre) || genres[0]; }
  function openPanel(open) {
    panel.classList.toggle("open", open);
    panel.setAttribute("aria-hidden", String(!open));
    $("rolRadioLauncher").setAttribute("aria-expanded", String(open));
    if (open && !stations.length) loadStations();
  }
  function stationIsSaved(station) {
    return (prefs.savedStations || []).some(item => item.stationuuid === station?.stationuuid);
  }
  function currentStationForSave() {
    if (currentIndex >= 0 && stations[currentIndex]) return stations[currentIndex];
    const last = prefs.lastStation;
    return last?.stationuuid ? { ...last, url_resolved: last.streamUrl || last.url_resolved || "" } : null;
  }
  function renderCurrentSaveButton() {
    if (!saveCurrentButton) return;
    const station = currentStationForSave();
    const exists = stationIsSaved(station);
    const isDefault = Boolean(station && prefs.defaultStationId === station.stationuuid);
    saveCurrentButton.disabled = !station;
    saveCurrentButton.textContent = exists ? "♥ Station saved · Remove" : "♡ Save current station";
    saveCurrentButton.setAttribute("aria-pressed", String(exists));
    setDefaultButton.disabled = !station;
    setDefaultButton.textContent = isDefault ? "★ Default station · This device" : "☆ Set as Default";
    setDefaultButton.setAttribute("aria-pressed", String(isDefault));
  }
  function renderSavedStations() {
    savedList.replaceChildren();
    const favorites = Array.isArray(prefs.savedStations) ? prefs.savedStations : [];
    savedCount.textContent = String(favorites.length);
    if (!favorites.length) {
      const empty = document.createElement("div");
      empty.className = "rol-radio-sub";
      empty.textContent = "Tap ♡ beside any station to save it for next time.";
      savedList.appendChild(empty);
      renderCurrentSaveButton();
      return;
    }
    favorites.forEach(station => {
      const row = document.createElement("div");
      row.className = "rol-radio-saved-row";
      const play = document.createElement("button");
      play.type = "button";
      play.className = "rol-radio-saved-play";
      const name = document.createElement("span");
      name.textContent = "▶ " + (station.name || "Saved station");
      const meta = document.createElement("small");
      meta.textContent = station.country || "Radio";
      play.append(name, meta);
      play.addEventListener("click", () => {
        const index = stations.findIndex(item => item.stationuuid === station.stationuuid);
        playStationRecord(station, index);
      });
      const setDefault = document.createElement("button");
      setDefault.type = "button";
      setDefault.className = "rol-radio-default";
      const isDefault = prefs.defaultStationId === station.stationuuid;
      setDefault.textContent = isDefault ? "★ Default" : "Set default";
      setDefault.setAttribute("aria-pressed", String(isDefault));
      setDefault.addEventListener("click", () => setDefaultStation(station));
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "rol-radio-saved-remove";
      remove.textContent = "×";
      remove.setAttribute("aria-label", "Remove " + (station.name || "station") + " from saved stations");
      remove.addEventListener("click", () => {
        prefs.savedStations = favorites.filter(item => item.stationuuid !== station.stationuuid);
        if (prefs.defaultStationId === station.stationuuid) prefs.defaultStationId = null;
        savePrefs();
        renderSavedStations();
        renderStations();
      });
      row.append(play, setDefault, remove);
      savedList.appendChild(row);
    });
    renderCurrentSaveButton();
  }
  function toggleSavedStation(station) {
    const id = String(station?.stationuuid || "").trim();
    if (!id) {
      setStatus("This directory entry has no stable station ID, so it cannot be saved.");
      return;
    }
    const index = prefs.savedStations.findIndex(item => item.stationuuid === id);
    if (index >= 0) {
      prefs.savedStations.splice(index, 1);
      setStatus((station.name || "Station") + " removed from saved stations.");
    } else {
      const secureUrl = value => {
        try { const parsed = new URL(String(value || "")); return parsed.protocol === "https:" ? parsed.href : ""; }
        catch (_) { return ""; }
      };
      const currentStream = prefs.lastStation?.stationuuid === id ? prefs.lastStation.streamUrl : "";
      prefs.savedStations.unshift({
        stationuuid: id,
        name: station.name || "Radio station",
        country: station.country || "Caribbean",
        countrycode: station.countrycode || "",
        codec: station.codec || "",
        bitrate: station.bitrate || 0,
        url: secureUrl(station.url),
        url_resolved: secureUrl(station.url_resolved) || secureUrl(currentStream),
        savedAt: Date.now()
      });
      prefs.savedStations = prefs.savedStations.slice(0, 50);
      setStatus((station.name || "Station") + " saved. Find it above in Saved Stations.");
    }
    savePrefs();
    renderSavedStations();
    renderStations();
    renderCurrentSaveButton();
  }
  function renderStations() {
    list.replaceChildren();
    if (!stations.length) {
      const empty = document.createElement("div");
      empty.className = "rol-radio-sub";
      empty.textContent = "No stations found for this tag. Try another genre.";
      list.appendChild(empty);
      renderCurrentSaveButton();
      return;
    }
    stations.forEach((station, index) => {
      const row = document.createElement("div");
      row.className = "rol-radio-station-row";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "rol-radio-station";
      button.setAttribute("aria-current", String(index === currentIndex));
      const name = document.createElement("span");
      name.textContent = station.name || "Radio station";
      const meta = document.createElement("small");
      meta.textContent = [station.country, station.bitrate ? station.bitrate + " kbps" : ""].filter(Boolean).join(" · ");
      button.append(name, meta);
      button.addEventListener("click", () => playStation(index));
      const favorite = document.createElement("button");
      favorite.type = "button";
      favorite.className = "rol-radio-fav";
      favorite.textContent = stationIsSaved(station) ? "♥" : "♡";
      favorite.setAttribute("aria-pressed", String(stationIsSaved(station)));
      favorite.setAttribute("aria-label", (stationIsSaved(station) ? "Remove " : "Save ") + (station.name || "station"));
      favorite.addEventListener("click", () => toggleSavedStation(station));
      row.append(button, favorite);
      list.appendChild(row);
    });
    renderCurrentSaveButton();
  }
  async function request(params, signal) {
    const url = API + "?" + new URLSearchParams(params).toString();
    const response = await fetch(url, { headers: { "apikey": API_KEY, "Accept": "application/json" }, cache: "no-store", signal });
    const payload = await response.json();
    if (!response.ok || payload.error) throw new Error(payload.error || "Radio directory unavailable.");
    return payload.data;
  }
  function isCaribbeanStation(station) {
    const code = String(station?.countrycode || "").toUpperCase();
    if (CARIBBEAN_CODES.has(code)) return true;
    const name = String(station?.country || "").trim().toLowerCase();
    return CARIBBEAN_COUNTRIES.has(name);
  }

  let countryOptionsLoaded = false;
  async function loadCountryOptions() {
    if (countryOptionsLoaded) return;
    countryOptionsLoaded = true;
    const selected = prefs.country || countrySelect.value || "ALL";
    const makeOption = (value, label) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      return option;
    };
    countrySelect.replaceChildren(makeOption("ALL", "All Caribbean Islands"), makeOption("GLOBAL", "Global / Diaspora"));
    const caribbeanGroup = document.createElement("optgroup");
    caribbeanGroup.label = "Caribbean islands & territories";
    countries.filter(item => !["ALL","GLOBAL"].includes(item.value)).forEach(item => caribbeanGroup.appendChild(makeOption(item.value, item.label)));
    countrySelect.appendChild(caribbeanGroup);
    try {
      const rows = await request({ action: "countries", limit: "300" });
      const seen = new Set(countries.map(item => item.value));
      const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
      const worldwide = (Array.isArray(rows) ? rows : [])
        .map(item => String(item?.name || "").toUpperCase())
        .filter(code => /^[A-Z]{2}$/.test(code) && !seen.has(code))
        .map(code => ({ value: code, label: displayNames.of(code) || code }))
        .filter(item => item.label && item.label !== item.value)
        .sort((a,b) => a.label.localeCompare(b.label));
      if (worldwide.length) {
        const worldGroup = document.createElement("optgroup");
        worldGroup.label = "Explore stations by country";
        worldwide.forEach(item => worldGroup.appendChild(makeOption(item.value, item.label)));
        countrySelect.appendChild(worldGroup);
      }
      const valid = new Set([...countries.map(item => item.value), ...worldwide.map(item => item.value), "ALL", "GLOBAL"]);
      countrySelect.value = valid.has(selected) ? selected : "ALL";
    } catch (_) {
      countrySelect.value = countries.some(item => item.value === selected) || ["ALL","GLOBAL"].includes(selected) ? selected : "ALL";
      setStatus("Caribbean countries are ready. The worldwide country list could not be refreshed.");
    }
  }

  async function loadStations() {
    const seq = ++stationLoadSeq;
    if (stationController) stationController.abort();
    stationController = new AbortController();
    const signal = stationController.signal;
    setStatus("Finding " + currentGenre().label + " stations…");
    list.innerHTML = '<div class="rol-radio-sub">Searching island and station directories…</div>';
    const genre = currentGenre();
    const country = countrySelect.value || "ALL";
    try {
      const found = [];
      const tagsToTry = genre.id === "caribbean" ? genre.tags : genre.tags.slice(0, country === "ALL" ? 5 : 6);
      for (const tag of tagsToTry) {
        const params = { action: "search", tag, limit: "30", order: "clicktrend" };
        if (country !== "ALL" && country !== "GLOBAL") params.countrycode = country;
        const data = await request(params, signal);
        if (seq !== stationLoadSeq) return;
        if (Array.isArray(data)) {
          const scoped = country === "ALL" ? data.filter(isCaribbeanStation) : data;
          found.push(...scoped);
        }
        const uniqueCount = new Set(found.map(s => s?.stationuuid).filter(Boolean)).size;
        if (uniqueCount >= (country === "ALL" ? 10 : 12)) break;
      }
      if (seq !== stationLoadSeq) return;
      const seen = new Set();
      stations = found.filter(s => {
        if (!s || !s.stationuuid || !(s.url_resolved || s.url)) return false;
        if (country === "ALL" && !isCaribbeanStation(s)) return false;
        if (seen.has(s.stationuuid)) return false;
        seen.add(s.stationuuid);
        return true;
      }).slice(0, 60);
      currentIndex = -1;
      renderStations();
      if (stations.length) {
        const countryLabel = countrySelect.selectedOptions?.[0]?.textContent || country;
        const scope = country === "ALL" ? "across the Caribbean" : country === "GLOBAL" ? "worldwide" : "in " + countryLabel;
        setStatus(stations.length + " stations found " + scope + ". Choose one to play.");
      } else if (country === "ALL") {
        setStatus("No Caribbean stations matched this sound yet. Choose an island or Global / Diaspora.");
      } else {
        setStatus("No stations found for this sound in " + country + ". Try another category.");
      }
      if (prefs.lastStation && audio.paused && currentIndex < 0 && stations.length) {
        stationTitle.textContent = prefs.lastStation.name || "Last station";
        playButton.textContent = "▶ Resume";
      }
    } catch (error) {
      if (seq !== stationLoadSeq || error?.name === "AbortError") return;
      stations = [];
      renderStations();
      setStatus(error.message || "Could not load stations. Check your connection and retry.");
    } finally {
      if (seq === stationLoadSeq) stationController = null;
    }
  }
  async function resolveStationUrl(station) {
    const candidates = [];
    try {
      const clicked = await request({ action: "url", uuid: station.stationuuid });
      if (clicked?.url && /^https:\/\//i.test(clicked.url)) candidates.push(clicked.url);
    } catch (_) {
      // The resolved station URL below remains available as a fallback.
    }
    for (const candidate of [station.url_resolved, station.url]) {
      if (candidate && /^https:\/\//i.test(candidate) && !candidates.includes(candidate)) candidates.push(candidate);
    }
    return candidates;
  }

  async function tryPlayUrl(candidates) {
    let lastError = null;
    for (const candidate of candidates) {
      try {
        audio.pause();
        audio.src = candidate;
        audio.load();
        audio.volume = Number(prefs.volume);
        audio.muted = Boolean(prefs.muted);
        await audio.play();
        return candidate;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("No playable secure stream URL was returned.");
  }

  async function playStationRecord(station, index = -1) {
    if (!station) return;
    const seq = ++playSequence;
    busy = true;
    currentIndex = index;
    stationTitle.textContent = station.name || "Live radio";
    setStatus("Connecting to " + (station.name || "station") + "…");
    renderStations();
    try {
      // Try the resolved HTTPS stream immediately inside the user's tap.
      // Waiting for the separate click-tracking request first can lose mobile
      // browser audio activation, especially on iOS/Safari.
      const directCandidates = [station.url_resolved, station.url]
        .filter((url, candidateIndex, all) => url && /^https:\/\//i.test(url) && all.indexOf(url) === candidateIndex);
      let streamUrl = null;
      let directError = null;
      if (directCandidates.length) {
        try { streamUrl = await tryPlayUrl(directCandidates); }
        catch (error) { directError = error; }
        if (seq !== playSequence) return;
      }
      if (!streamUrl) {
        const resolvedCandidates = await resolveStationUrl(station);
        if (seq !== playSequence) return;
        const fallbackCandidates = resolvedCandidates.filter(url => !directCandidates.includes(url));
        if (!fallbackCandidates.length) throw directError || new Error("No secure stream was returned for this station.");
        streamUrl = await tryPlayUrl(fallbackCandidates);
      }
      if (seq !== playSequence) return;
      prefs.lastStation = {
        stationuuid: station.stationuuid,
        name: station.name || "Live radio",
        country: station.country || "Caribbean",
        codec: station.codec || "",
        bitrate: station.bitrate || 0,
        streamUrl,
        savedAt: Date.now()
      };
      const savedIndex = prefs.savedStations.findIndex(item => item.stationuuid === station.stationuuid);
      if (savedIndex >= 0) {
        prefs.savedStations[savedIndex] = { ...prefs.savedStations[savedIndex], url_resolved: streamUrl };
        renderSavedStations();
      }
      savePrefs();
      renderCurrentSaveButton();
      playButton.textContent = "Ⅱ Pause";
      setStatus("LIVE · " + (station.country || "Caribbean") + (station.codec ? " · " + station.codec : ""));
    } catch (error) {
      playButton.textContent = prefs.lastStation ? "▶ Resume" : "▶ Play";
      const detail = error?.name === "NotAllowedError"
        ? "Tap Play again to allow audio in this browser."
        : "This station's stream could not play in this browser. Try Next or another island station.";
      setStatus(detail);
    } finally { if (seq === playSequence) busy = false; }
  }
  async function playStation(index) {
    if (!stations[index]) return;
    return playStationRecord(stations[index], index);
  }
  async function resumeLastStation() {
    const last = prefs.lastStation;
    if (!last) return false;
    const seq = ++playSequence;
    busy = true;
    stationTitle.textContent = last.name || "Last station";
    setStatus("Reconnecting to " + (last.name || "your last station") + "…");
    try {
      // Resume the saved HTTPS URL first so the user's tap directly starts audio.
      const direct = last.streamUrl && /^https:\/\//i.test(last.streamUrl) ? [last.streamUrl] : [];
      try {
        if (!direct.length) throw new Error("No saved stream URL.");
        await tryPlayUrl(direct);
        if (seq !== playSequence) return false;
      } catch (_) {
        const fallback = [];
        if (last.stationuuid) {
          try {
            const clicked = await request({ action: "url", uuid: last.stationuuid });
            if (seq !== playSequence) return false;
            if (clicked?.url && /^https:\/\//i.test(clicked.url)) fallback.push(clicked.url);
          } catch (_) {}
        }
        if (!fallback.length) throw new Error("The saved station no longer has a secure stream.");
        await tryPlayUrl(fallback);
      }
      if (seq !== playSequence) return false;
      currentIndex = stations.findIndex(item => item.stationuuid === last.stationuuid);
      playButton.textContent = "Ⅱ Pause";
      syncQuickPauseButton();
      setStatus("LIVE · " + (last.country || "Caribbean") + " · resumed on this page");
      return true;
    } catch (_) {
      setStatus("Your last station could not reconnect. Choose a station or press Next.");
      playButton.textContent = "▶ Play";
      return false;
    } finally { if (seq === playSequence) busy = false; }
  }

  $("rolRadioLauncher").addEventListener("click", () => openPanel(!panel.classList.contains("open")));
  $("rolRadioClose").addEventListener("click", () => openPanel(false));
  saveCurrentButton.addEventListener("click", () => {
    const station = currentStationForSave();
    if (!station) {
      setStatus("Choose or play a station first, then save it here.");
      return;
    }
    toggleSavedStation(station);
  });
  setDefaultButton.addEventListener("click", () => setDefaultStation(currentStationForSave()));
  rewindButton.addEventListener("click", () => seekLiveOffset(-30));
  forwardButton.addEventListener("click", () => seekLiveOffset(30));
  goLiveButton.addEventListener("click", goToLiveEdge);
  genreSelect.value = genres.some(g => g.id === prefs.genre) ? prefs.genre : "caribbean";
  countrySelect.value = countries.some(c => c.value === prefs.country) ? prefs.country : (["ALL","GLOBAL"].includes(prefs.country) ? prefs.country : "ALL");
  loadCountryOptions();
  genreSelect.addEventListener("change", () => {
    prefs.genre = genreSelect.value;
    savePrefs();
    stations = [];
    currentIndex = -1;
    loadStations();
  });
  countrySelect.addEventListener("change", () => {
    prefs.country = countrySelect.value;
    savePrefs();
    stations = [];
    currentIndex = -1;
    loadStations();
  });
  playButton.addEventListener("click", async () => {
    if (!audio.paused) {
      audio.pause();
      playButton.textContent = "▶ Play";
      setStatus("Paused.");
      return;
    }
    if (currentIndex >= 0) {
      try { await audio.play(); playButton.textContent = "Ⅱ Pause"; setStatus("LIVE"); }
      catch (_) { setStatus("Tap Play again to resume this stream."); }
      return;
    }
    if (prefs.lastStation && await resumeLastStation()) return;
    if (!stations.length) await loadStations();
    if (prefs.defaultStationId) {
      const preset = prefs.savedStations.find(item => item.stationuuid === prefs.defaultStationId);
      if (preset) {
        const index = stations.findIndex(item => item.stationuuid === preset.stationuuid);
        await playStationRecord(preset, index);
        return;
      }
    }
    if (stations.length) await playStation(0);
  });
  $("rolRadioPrevious").addEventListener("click", async () => {
    if (!stations.length) await loadStations();
    if (!stations.length) return;
    let index = currentIndex;
    if (index < 0 && prefs.lastStation?.stationuuid) {
      index = stations.findIndex(item => item.stationuuid === prefs.lastStation.stationuuid);
    }
    const target = index < 0 ? stations.length - 1 : (index - 1 + stations.length) % stations.length;
    await playStation(target);
  });
  $("rolRadioNext").addEventListener("click", async () => {
    if (!stations.length) await loadStations();
    if (stations.length) await playStation((currentIndex + 1) % stations.length);
  });
  muteButton.addEventListener("click", () => {
    prefs.muted = !prefs.muted;
    audio.muted = prefs.muted;
    muteButton.textContent = prefs.muted ? "🔇 Unmute" : "🔊 Mute";
    muteButton.setAttribute("aria-pressed", String(prefs.muted));
    savePrefs();
  });
  volume.value = String(prefs.volume);
  audio.volume = Number(prefs.volume);
  audio.muted = Boolean(prefs.muted);
  volumeValue.textContent = Math.round(prefs.volume * 100) + "%";
  muteButton.textContent = prefs.muted ? "🔇 Unmute" : "🔊 Mute";
  muteButton.setAttribute("aria-pressed", String(prefs.muted));
  volume.addEventListener("input", () => {
    prefs.volume = Number(volume.value);
    audio.volume = prefs.volume;
    volumeValue.textContent = Math.round(prefs.volume * 100) + "%";
    savePrefs();
  });
  renderSavedStations();
  renderCurrentSaveButton();
  const defaultStation = prefs.savedStations.find(item => item.stationuuid === prefs.defaultStationId);
  if (defaultStation && !prefs.lastStation) {
    stationTitle.textContent = defaultStation.name || "Default station";
    setStatus("Default station · " + (defaultStation.name || "Station") + ". Tap Play to start.");
  } else if (prefs.lastStation && prefs.lastStation.name) {
    stationTitle.textContent = prefs.lastStation.name;
    playButton.textContent = "▶ Resume";
    setStatus("Last station saved. Tap Resume to continue listening on this page.");
  }
  audio.addEventListener("playing", () => {
    playButton.textContent = "Ⅱ Pause";
    syncQuickPauseButton();
    syncSeekControls();
  });
  audio.addEventListener("pause", () => {
    playButton.textContent = prefs.lastStation ? "▶ Resume" : "▶ Play";
    syncQuickPauseButton();
    syncSeekControls();
  });
  ["timeupdate","progress","durationchange","loadedmetadata","seeked","seeking"].forEach(eventName => {
    audio.addEventListener(eventName, syncSeekControls);
  });
  audio.addEventListener("error", () => {
    syncSeekControls();
    const code = audio.error?.code;
    const reason = code === 3 || code === 4 ? "The station's audio format is not supported here." : "The stream was interrupted or blocked.";
    setStatus(reason + " Try Next or select another island station.");
    playButton.textContent = prefs.lastStation ? "▶ Resume" : "▶ Play";
    syncQuickPauseButton();
  });
  syncQuickPauseButton();
  syncSeekControls();
})();
