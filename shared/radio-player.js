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
    { id: "southern-hip-hop", label: "Southern Hip-Hop / Trap", tags: ["southern hip hop", "southern rap", "trap", "crunk"] },
    { id: "underground-hip-hop", label: "Underground / Alternative Rap", tags: ["underground hip hop", "alternative hip hop", "conscious hip hop"] },
    { id: "rnb", label: "R&B / Soul", tags: ["r&b", "rnb", "rhythm and blues", "soul"] },
    { id: "neo-soul", label: "Neo-Soul", tags: ["neo soul", "neo-soul"] },
    { id: "reggae", label: "Reggae / Roots", tags: ["reggae", "roots reggae"] },
    { id: "dancehall", label: "Dancehall / Bashment", tags: ["dancehall", "bashment"] },
    { id: "soca", label: "Soca & Calypso", tags: ["soca", "calypso"] },
    { id: "kompa-zouk", label: "Kompa / Zouk", tags: ["kompa", "konpa", "compas", "zouk"] },
    { id: "afrobeats", label: "Afrobeats", tags: ["afrobeats", "afrobeat"] },
    { id: "lofi", label: "Lo-Fi / Chill", tags: ["lofi", "lo-fi", "chillout"] },
    { id: "smooth-jazz", label: "Smooth Jazz", tags: ["smooth jazz", "smooth-jazz", "jazz"] }
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

  let prefs = { volume: 0.28, muted: false, genre: "caribbean", country: "ALL", lastStation: null };
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
    #rolRadioGenre,#rolRadioCountry{width:100%;min-height:42px;border:1px solid #355947;border-radius:11px;background:#0c1b14;color:#f4fff8;padding:9px;margin:2px 0 10px}
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
        <div><div class="rol-radio-title">🎧 RO’Lyfe Radio</div><div class="rol-radio-sub">Island stations, Hip-Hop and more · Play while you play</div></div>
        <button class="rol-radio-close" id="rolRadioClose" type="button" aria-label="Close radio">×</button>
      </div>
      <label class="rol-radio-sub" for="rolRadioGenre">CHOOSE YOUR SOUND</label>
      <select id="rolRadioGenre" aria-label="Radio genre">
        ${genres.map(g => `<option value="${g.id}">${g.label}</option>`).join("")}
      </select>
      <label class="rol-radio-sub" for="rolRadioCountry">CHOOSE ISLAND / REGION</label>
      <select id="rolRadioCountry" aria-label="Caribbean island or radio region">
        ${countries.map(c => `<option value="${c.value}">${c.label}</option>`).join("")}
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
  const genreSelect = $("rolRadioGenre");
  const countrySelect = $("rolRadioCountry");
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
    const response = await fetch(url, { headers: { "apikey": API_KEY, "Accept": "application/json" }, cache: "no-store" });
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

  async function loadStations() {
    if (busy) return;
    busy = true;
    setStatus("Finding " + currentGenre().label + " stations…");
    list.innerHTML = '<div class="rol-radio-sub">Searching island and station directories…</div>';
    const genre = currentGenre();
    const country = countrySelect.value || "ALL";
    try {
      const found = [];
      const tagsToTry = genre.id === "caribbean" ? genre.tags : genre.tags.slice(0, country === "ALL" ? 5 : 4);
      for (const tag of tagsToTry) {
        const params = { action: "search", tag, limit: "30", order: "clicktrend" };
        if (country !== "ALL" && country !== "GLOBAL") params.countrycode = country;
        const data = await request(params);
        if (Array.isArray(data)) {
          const scoped = country === "ALL" ? data.filter(isCaribbeanStation) : data;
          found.push(...scoped);
        }
        const uniqueCount = new Set(found.map(s => s?.stationuuid).filter(Boolean)).size;
        if (uniqueCount >= (country === "ALL" ? 10 : 12)) break;
      }
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
        const scope = country === "ALL" ? "across the Caribbean" : country === "GLOBAL" ? "worldwide" : "in " + country;
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
      stations = [];
      renderStations();
      setStatus(error.message || "Could not load stations. Check your connection and retry.");
    } finally { busy = false; }
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

  async function playStation(index) {
    if (!stations[index] || busy) return;
    const station = stations[index];
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
        .filter((url, index, all) => url && /^https:\/\//i.test(url) && all.indexOf(url) === index);
      let streamUrl = null;
      let directError = null;
      if (directCandidates.length) {
        try { streamUrl = await tryPlayUrl(directCandidates); }
        catch (error) { directError = error; }
      }
      if (!streamUrl) {
        const resolvedCandidates = await resolveStationUrl(station);
        const fallbackCandidates = resolvedCandidates.filter(url => !directCandidates.includes(url));
        if (!fallbackCandidates.length) throw directError || new Error("No secure stream was returned for this station.");
        streamUrl = await tryPlayUrl(fallbackCandidates);
      }
      prefs.lastStation = {
        stationuuid: station.stationuuid,
        name: station.name || "Live radio",
        country: station.country || "Caribbean",
        codec: station.codec || "",
        bitrate: station.bitrate || 0,
        streamUrl,
        savedAt: Date.now()
      };
      savePrefs();
      playButton.textContent = "Ⅱ Pause";
      setStatus("LIVE · " + (station.country || "Caribbean") + (station.codec ? " · " + station.codec : ""));
    } catch (error) {
      playButton.textContent = prefs.lastStation ? "▶ Resume" : "▶ Play";
      const detail = error?.name === "NotAllowedError"
        ? "Tap Play again to allow audio in this browser."
        : "This station's stream could not play in this browser. Try Next or another island station.";
      setStatus(detail);
    } finally { busy = false; }
  }

  async function resumeLastStation() {
    const last = prefs.lastStation;
    if (!last || busy) return false;
    busy = true;
    stationTitle.textContent = last.name || "Last station";
    setStatus("Reconnecting to " + (last.name || "your last station") + "…");
    try {
      // Resume the saved HTTPS URL first so the user's tap directly starts audio.
      const direct = last.streamUrl && /^https:\/\//i.test(last.streamUrl) ? [last.streamUrl] : [];
      try {
        if (!direct.length) throw new Error("No saved stream URL.");
        await tryPlayUrl(direct);
      } catch (_) {
        const fallback = [];
        if (last.stationuuid) {
          try {
            const clicked = await request({ action: "url", uuid: last.stationuuid });
            if (clicked?.url && /^https:\/\//i.test(clicked.url)) fallback.push(clicked.url);
          } catch (_) {}
        }
        if (!fallback.length) throw new Error("The saved station no longer has a secure stream.");
        await tryPlayUrl(fallback);
      }
      playButton.textContent = "Ⅱ Pause";
      setStatus("LIVE · " + (last.country || "Caribbean") + " · resumed on this page");
      return true;
    } catch (_) {
      setStatus("Your last station could not reconnect. Choose a station or press Next.");
      playButton.textContent = "▶ Play";
      return false;
    } finally { busy = false; }
  }

  $("rolRadioLauncher").addEventListener("click", () => openPanel(!panel.classList.contains("open")));
  $("rolRadioClose").addEventListener("click", () => openPanel(false));
  genreSelect.value = genres.some(g => g.id === prefs.genre) ? prefs.genre : "caribbean";
  countrySelect.value = countries.some(c => c.value === prefs.country) ? prefs.country : "ALL";
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
  if (prefs.lastStation && prefs.lastStation.name) {
    stationTitle.textContent = prefs.lastStation.name;
    playButton.textContent = "▶ Resume";
    setStatus("Last station saved. Tap Resume to continue listening on this page.");
  }
  audio.addEventListener("playing", () => { playButton.textContent = "Ⅱ Pause"; });
  audio.addEventListener("pause", () => { playButton.textContent = prefs.lastStation ? "▶ Resume" : "▶ Play"; });
  audio.addEventListener("error", () => {
    const code = audio.error?.code;
    const reason = code === 3 || code === 4 ? "The station's audio format is not supported here." : "The stream was interrupted or blocked.";
    setStatus(reason + " Try Next or select another island station.");
    playButton.textContent = prefs.lastStation ? "▶ Resume" : "▶ Play";
  });
})();
