/* RO'Lyfe shared remembered-device preview gateway.
   Convenience entry only — NOT authentication or access control.
   The same origin (rolrichman.github.io) shares this key across project paths.
*/
(() => {
  "use strict";
  const ACCESS_KEY = "rolyfe.shared.preview.access.v1";
  const EMBED_MODE = new URLSearchParams(window.location.search).get("embed");
  if (EMBED_MODE) return;

  const hasAccess = () => {
    try { return localStorage.getItem(ACCESS_KEY) === "entered"; }
    catch (_) { return false; }
  };

  const addStyles = () => {
    if (document.getElementById("rol-access-gateway-style")) return;
    const style = document.createElement("style");
    style.id = "rol-access-gateway-style";
    style.textContent = [
      "#rolAccessGate{position:fixed;inset:0;z-index:1000000;display:grid;place-items:center;padding:22px;overflow:auto;background:radial-gradient(ellipse at 18% 18%,rgba(65,225,184,.19),transparent 34%),radial-gradient(ellipse at 82% 78%,rgba(255,139,61,.18),transparent 35%),linear-gradient(145deg,#050a11 0%,#091a22 48%,#100e18 100%);color:#f4fbff;font-family:system-ui,-apple-system,Segoe UI,sans-serif}",
      "#rolAccessGate:before,#rolAccessGate:after{content:'';position:absolute;border:1px solid rgba(130,230,210,.13);border-radius:50%;width:min(72vw,650px);aspect-ratio:1;pointer-events:none}",
      "#rolAccessGate:before{transform:translate(-34%,-22%);box-shadow:0 0 100px rgba(60,210,180,.08),inset 0 0 80px rgba(60,210,180,.05)}",
      "#rolAccessGate:after{width:min(48vw,420px);transform:translate(70%,45%);border-color:rgba(255,160,100,.14)}",
      "#rolAccessGate .rol-gate-card{position:relative;z-index:1;width:min(560px,100%);padding:clamp(25px,5vw,46px);border:1px solid rgba(160,224,215,.25);border-radius:28px;background:linear-gradient(145deg,rgba(18,38,43,.94),rgba(12,19,30,.96));box-shadow:0 30px 100px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.06);backdrop-filter:blur(20px)}",
      "#rolAccessGate .rol-gate-brand{font-size:19px;font-weight:950;letter-spacing:.045em}",
      "#rolAccessGate .rol-gate-brand span{color:#8cffb2}",
      "#rolAccessGate .rol-gate-eyebrow{margin-top:34px;color:#8cffb2;font-size:11px;font-weight:900;letter-spacing:.2em;text-transform:uppercase}",
      "#rolAccessGate h1{margin:12px 0 14px;font-size:clamp(36px,7vw,58px);line-height:.99;letter-spacing:-.055em}",
      "#rolAccessGate h1 em{font-style:normal;color:#ffad74}",
      "#rolAccessGate .rol-gate-copy{margin:0;color:#c1d0d2;font-size:15px;line-height:1.65}",
      "#rolAccessGate .rol-gate-offer{display:inline-flex;align-items:center;gap:8px;margin:22px 0 18px;padding:9px 12px;border:1px solid rgba(255,173,116,.35);border-radius:999px;background:rgba(255,139,61,.09);color:#ffd0ad;font-size:11px;font-weight:900;letter-spacing:.09em}",
      "#rolAccessGate .rol-gate-offer:before{content:'✦';color:#8cffb2}",
      "#rolAccessGate button{display:block;width:100%;min-height:54px;border:0;border-radius:14px;background:linear-gradient(110deg,#8cffb2,#b9ffd8);color:#092016;font-size:14px;font-weight:950;letter-spacing:.07em;cursor:pointer;box-shadow:0 12px 30px rgba(80,220,150,.17)}",
      "#rolAccessGate button:hover{filter:brightness(1.05);transform:translateY(-1px)}",
      "#rolAccessGate button:focus-visible{outline:3px solid #fff;outline-offset:4px}",
      "#rolAccessGate .rol-gate-note{display:block;margin-top:15px;color:#91a7aa;font-size:11px;line-height:1.55}",
      "#rolAccessGate .rol-gate-footer{position:relative;z-index:1;margin-top:24px;color:#6f8c90;font-size:10px;font-weight:800;letter-spacing:.2em;text-align:center}",
      ".rol-access-exit{display:inline-flex;align-items:center;gap:6px;margin-left:10px;padding:6px 9px;border:1px solid rgba(124,245,178,.35);border-radius:999px;background:rgba(10,35,28,.75);color:#a7ffcd;font:800 10px/1.2 system-ui,sans-serif;letter-spacing:.04em;cursor:pointer;white-space:nowrap}",
      ".rol-access-exit:hover{border-color:#8cffb2;background:rgba(10,50,36,.9)}",
      "@media(max-width:650px){#rolAccessGate{padding:14px}#rolAccessGate .rol-gate-card{border-radius:22px;padding:25px 21px}#rolAccessGate .rol-gate-eyebrow{margin-top:27px}#rolAccessGate h1{font-size:39px}#rolAccessGate .rol-gate-copy{font-size:14px}.rol-access-exit{margin:8px 0 0 0}}",
      "@media(prefers-reduced-motion:reduce){#rolAccessGate button{transition:none}}"
    ].join("");
    document.head.appendChild(style);
  };

  const mountExit = () => {
    if (document.querySelector(".rol-access-exit")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rol-access-exit";
    button.textContent = "SIGN OUT";
    button.setAttribute("aria-label", "Sign out of remembered preview access");
    button.title = "Preview access is remembered on this device";
    button.addEventListener("click", () => {
      try { localStorage.removeItem(ACCESS_KEY); } catch (_) {}
      window.location.reload();
    });
    const actions = document.querySelector(".nav-actions");
    const nav = document.querySelector("header .nav");
    if (actions) actions.appendChild(button);
    else if (nav) nav.appendChild(button);
    else {
      button.style.position = "fixed";
      button.style.top = "12px";
      button.style.right = "12px";
      button.style.zIndex = "100";
      document.body.appendChild(button);
    }
  };

  const removeGate = () => {
    const gate = document.getElementById("rolAccessGate");
    if (gate) gate.remove();
    document.documentElement.style.overflow = "";
    mountExit();
  };

  const showGate = () => {
    addStyles();
    document.documentElement.style.overflow = "hidden";
    const gate = document.createElement("div");
    gate.id = "rolAccessGate";
    gate.setAttribute("role", "dialog");
    gate.setAttribute("aria-modal", "true");
    gate.setAttribute("aria-labelledby", "rolAccessTitle");
    gate.innerHTML =
      "<section class=\"rol-gate-card\">" +
        "<div class=\"rol-gate-brand\">RO’LYFE <span>NETWORK</span></div>" +
        "<div class=\"rol-gate-eyebrow\">Your next destination starts here</div>" +
        "<h1 id=\"rolAccessTitle\">One entry.<br><em>Every destination.</em></h1>" +
        "<p class=\"rol-gate-copy\">Welcome to the connected RO’Lyfe experience — Sports, Entertainment, Music, Gaming and more. Enter once on this device, then move between connected front doors without another preview prompt.</p>" +
        "<div class=\"rol-gate-offer\">COMING SOON · FIRST 3 MONTHS FREE</div>" +
        "<button type=\"button\" id=\"rolAccessEnter\">ENTER THE NETWORK</button>" +
        "<small class=\"rol-gate-note\">Preview access remembers this browser. This is not an account login or security barrier; secure account sign-in and cross-project authentication will arrive in a later phase. No password or payment details are collected here.</small>" +
      "</section>" +
      "<div class=\"rol-gate-footer\">ROOTED IN ACCESS · BUILT FOR GROWTH</div>";
    document.body.appendChild(gate);
    const enter = gate.querySelector("#rolAccessEnter");
    enter.addEventListener("click", () => {
      let saved = false;
      try {
        localStorage.setItem(ACCESS_KEY, "entered");
        saved = localStorage.getItem(ACCESS_KEY) === "entered";
      } catch (_) {}
      if (!saved) {
        const note = gate.querySelector(".rol-gate-note");
        note.textContent = "Your browser blocked saved access. You can continue on this page, but other project pages may show this welcome screen again.";
      }
      removeGate();
    });
    enter.focus({ preventScroll: true });
  };

  if (hasAccess()) mountExit();
  else showGate();
})();