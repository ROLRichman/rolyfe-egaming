/* RO'Lyfe Gaming Radio — shared background station player */
(() => {
  if (window.__rolyfeRadioMounted) return;
  window.__rolyfeRadioMounted = true;

  const API = "https://nzduinxmsmmdbonefifi.supabase.co/functions/v1/rolyfe-radio-browser";
  const API_KEY = "sb_publishable_lD4rMx8S_OvBRHNWajgQKQ_hYmCjFzY";
  const PREF_KEY = "rolyfeGamingRadioPrefs";
  const genres = [
    { id: "smooth-jazz", label: "Smooth Jazz", tags: ["smooth jazz", "smooth-jazz", "jazz"] },
    { id: "rnb", label: "R&B / Soul", tags: ["rnb", "r&b", "rhythm and blues", "soul"] },
    { id: "hip-hop", label: "Hip-Hop", tags: ["hip hop", "hip-hop", "rap"] },
    { id: "lofi", label: "Lo-Fi / Chill", tags: ["lofi", "lo-fi", "chillout"] },
    { id: "reggae", label: "Reggae", tags: ["reggae", "dancehall"] }
  ];

  let prefs = { volume: 0.28, muted: false, genre: "smooth-jazz" };
  try { prefs = { ...prefs, ...JSON.parse(localStorage.getItem(PREF_KEY) || "{}") }; } catch (_) {}
  let stations = [];
  let currentIndex = -1;
  let busy = false;

  const style = document.createElement("style");
  style.textContent = `
    #rolRadioRoot{position:fixed;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:99990;font:14px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;color:#f4fff8}
    #rolRadioRoot *{box-sizing:border-box}
    #rolRadioLauncher{display:flex;align-items:center;gap:8px;border:1px solid #63dca0aa;border-radius:999px;padding:11px 15px;background:linear-gradient(135deg,#123d31,#142b3e);color:#f4fff8;font-weight:850;box-shadow:0 8px 28px #0008;cursor:pointer}
    #rolRadioLauncher .rol-radio-dot{width:9px;height:9px;border-radius:50%;background:#67efaa;box-shadow:0 0 12px #67efaa}
    #rolRadioPanel{display:none;position:absolute;right:0;bottom:58px;width:min(350px,calc(100vw - 24px));max-height:min(72vh,560px);overflow:auto;border:1px solid #3b725b;border-radius:20px;background:linear-gradient(155deg,#10231b,#0a1317 72%);box-shadow:0 18px 55px #000b;padding:15px}
    #rolRadioPanel.open{display:block}
    .rol-radio-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
    .rol-radio-title{font-size:15px;font-weight:900;letter-spacing:.02em}.rol-radio-sub{font-size:11px;color:#a8c3b4;margin-top:2px}
    .rol-radio-close,.rol-radio-btn{border:1px solid #355947;border-radius:10px;background:#142b20;color:#eafff1;padding:8px 10px;cursor:pointer;font:inherit}
    .rol-radio-close{font-size:17px;line-height:1}
    #rolRadioGenre{width:100%;min-height:42px;border:1px solid #355947;border-radius:11px;background:#0c1b14;color:#f4fff8;padding:9px;margin:2px 0 10px}
    #rolRadioNow{padding:11px;border:1px solid #315641;border-radius:13px;background:#0c1913;margin-bottom:10px}
    #rolRadioStation{font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #rolRadioStatus{font-size:11px;color:#a7c2b2;margin-top:3px;min-height:16px}
    .rol-radio-controls{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
    .rol-radio-btn.primary{background:#63e49c;color:#07140c;border-color:#63e49c;font-weight:900}
    .rol-radio-btn[aria-pressed="true"]{border-color:#ffb15c;color:#ffca8b}
    .rol-radio-volume{display:grid;grid-template-columns:auto 1fr auto;gap:9px;align-items:center;margin:12px 0 10px;color:#bdd4c5;font-size:12px}
    #rolRadioVolume{width:100%;accent-color:#63e49c}
    #rolRadioList{display:grid;gap:6px;margin-top:9px}
    .rol-radio-station{display:flex;align-items:center;gap:9px;width:100%;text-align:left;border:1px solid #263f32;border-radius:10px;background:#0d1a14;color:#eaf8ef;padding:9px;cursor:pointer;min-width:0}
    .rol-radio-station[aria-current="true"]{border-color:#63e49c;background:#153322}
    .rol-radio-station span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .rol-radio-station small{margin-left:auto;color:#9cb7a7;white-space:nowrap;font-size:10px}
    #rolRadioRoot button:focus-visible,#rolRadioRoot select:focus-visible,#rolRadioRoot input:focus-visible{outline:2px solid #9affc3;outline-offset:2px}
    @media(max-width:520px){#rolRadioRoot{right:10px;bottom:calc(10px + env(safe-area-inset-bottom,0px))}#rolRadioPanel{width:min(340px,calc(100vw - 20px));max-height:68vh;padding:13px}#rolRadioLauncher{padding:10px 13px}}
    @media(prefers-reduced-motion:reduce){#rolRadioRoot *{scroll-behavior:auto!important;transition:none!important}}
  `;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.id = "rolRadioRoot";
  root.innerHTML = `
    <section id="rolRadioPanel" aria-label="RO'Lyfe Gaming Radio" aria-hidden="true">
      <div class="rol-radio-head">
        <div><div class="rol-radio-title">🎧 RO’Lyfe Gaming Radio</div><div class="rol-radio-sub">Live background stations · Your game, your volume</div></div>
        <button class="rol-radio-close" id="rolRadioClose" type="button" aria-label="Close radio">×</button>
      </div>
      <label class="rol-radio-sub" for="rolRadioGenre">CHOOSE YOUR SOUND</label>
      <select id="rolRadioGenre" aria-label="Radio genre">
        ${genres.map(g => `<option value="${g.id}">${g.label}</option>`).join("")}
      </select>
      <div id="rolRadioNow">
        <div id="rolRadioStation">Choose a station to begin</div>
        <div id="rolRadioStatus" role="status" aria-live="polite">Radio is off until you press Play.</div>
      </div>
      <div class="rol-radio-controls">
        <button class="rol-radio-btn primary" id="rolRadioPlay" type="button">▶ Play</button>
        <button class="rol-radio-btn" id="rolRadioNext" type="button">⏭ Next</button>
        <button class="rol-radio-btn" id="rolRadioMute" type="button" aria-pressed="false">🔊 Mute</button>
      </div>
      <label class="rol-radio-volume"><span>VOL</span><input id="rolRadioVolume" type="range" min="0" max="1" step=".01" aria-label="Background radio volume"><span id="rolRadioVolumeValue">28%</span></label>
      <div class="rol-radio-sub">AVAILABLE STATIONS</div>
      <div id="rolRadioList"><div class="rol-radio-sub">Open a genre to find stations.</div></div>
      <audio id="rolRadioAudio" preload="none" playsinline></audio>
    </section>
    <button id="rolRadioLauncher" type="button" aria-expanded="false" aria-controls="rolRadioPanel"><span class="rol-radio-dot"></span><span>Radio</span><span aria-hidden="true">♫</span></button>
  `;
  document.body.appendChild(root);

  const $ = (id) => document.getElementById(id);
  const panel = $("rolRadioPanel");
  const audio = $("rolRadioAudio");
  const status = $("rolRadioStatus");
  const stationTitle = $("rolRadioStation");
  const list = $("rolRadioList");
  const genreSelect = $("rolRadioGenre");
  const playButton = $("rolRadioPlay");
  const muteButton = $("rolRadioMute");
  const volume = $("rolRadioVolume");
  const volumeValue = $("rolRadioVolumeValue");

  function savePrefs() {
    try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (_) {}
  }
  function setStatus(message) { status.textContent = message; }
  function currentGenre() { return genres.find(g => g.id === prefs.genre) || genres[0]; }
  function openPanel(open) {
    panel.classList.toggle("open", open);
    panel.setAttribute("aria-hidden", String(!open));
    $("rolRadioLauncher").setAttribute("aria-expanded", String(open));
    if (open && !stations.length) loadStations();
  }
  function renderStations() {
    list.replaceChildren();
    if (!stations.length) {
      const empty = document.createElement("div");
      empty.className = "rol-radio-sub";
      empty.textContent = "No stations found for this tag. Try another genre.";
      list.appendChild(empty);
      return;
    }
    stations.forEach((station, index) => {
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
      list.appendChild(button);
    });
  }
  async function request(params) {
    const url = API + "?" + new URLSearchParams(params).toString();
    const response = await fetch(url, { headers: { "apikey": API_KEY, "Accept": "application/json" } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Radio directory unavailable.");
    return payload.data;
  }
  async function loadStations() {
    if (busy) return;
    busy = true;
    setStatus("Finding live " + currentGenre().label + " stations…");
    list.innerHTML = '<div class="rol-radio-sub">Searching the station directory…</div>';
    const genre = currentGenre();
    try {
      let found = [];
      for (const tag of genre.tags) {
        const data = await request({ action: "search", tag, limit: "18", order: "clicktrend" });
        if (Array.isArray(data) && data.length) { found = data; break; }
      }
      stations = found.filter(s => s && s.stationuuid && (s.url_resolved || s.url));
      currentIndex = -1;
      renderStations();
      setStatus(stations.length ? stations.length + " stations found. Choose one to play." : "No matching stations were returned.");
    } catch (error) {
      stations = [];
      renderStations();
      setStatus(error.message || "Could not load stations.");
    } finally { busy = false; }
  }
  async function playStation(index) {
    if (!stations[index] || busy) return;
    const station = stations[index];
    busy = true;
    currentIndex = index;
    stationTitle.textContent = station.name || "Live radio";
    setStatus("Connecting to " + (station.name || "station") + "…");
    renderStations();
    try {
      let streamUrl = station.url_resolved || station.url;
      try {
        const clicked = await request({ action: "url", uuid: station.stationuuid });
        if (clicked && clicked.url) streamUrl = clicked.url;
      } catch (_) {
        // Fall back to the resolved station URL when the click endpoint is unavailable.
      }
      if (!/^https:\/\//i.test(streamUrl || "")) {
        throw new Error("This station does not offer a secure HTTPS stream for this game page.");
      }
      audio.pause();
      audio.src = streamUrl;
      audio.volume = Number(prefs.volume);
      audio.muted = Boolean(prefs.muted);
      await audio.play();
      playButton.textContent = "Ⅱ Pause";
      setStatus("LIVE · " + (station.country || "Global") + (station.codec ? " · " + station.codec : ""));
    } catch (error) {
      playButton.textContent = "▶ Play";
      setStatus(error.message || "This stream could not start. Try another station.");
    } finally { busy = false; }
  }

  $("rolRadioLauncher").addEventListener("click", () => openPanel(!panel.classList.contains("open")));
  $("rolRadioClose").addEventListener("click", () => openPanel(false));
  genreSelect.value = prefs.genre;
  genreSelect.addEventListener("change", () => {
    prefs.genre = genreSelect.value;
    savePrefs();
    stations = [];
    currentIndex = -1;
    if (!audio.paused) audio.pause();
    playButton.textContent = "▶ Play";
    stationTitle.textContent = "Choose a station to begin";
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
      catch (_) { setStatus("Tap a station to start playback."); }
      return;
    }
    if (!stations.length) await loadStations();
    if (stations.length) await playStation(0);
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
  audio.addEventListener("playing", () => { playButton.textContent = "Ⅱ Pause"; });
  audio.addEventListener("pause", () => { playButton.textContent = "▶ Play"; });
  audio.addEventListener("error", () => { setStatus("Stream interrupted or unsupported. Try another station."); playButton.textContent = "▶ Play"; });
})();
