(function(){
"use strict";
if(document.getElementById("rolyfeArcadeDock"))return;
const style=document.createElement("style");
style.textContent=`
#rolyfeArcadeDock{position:fixed;right:12px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:99999;display:grid;gap:7px;width:62px}
#rolyfeArcadeDock button{min-height:44px;border:1px solid #47718c;border-radius:13px;background:linear-gradient(145deg,#102a40,#071727);color:#eaf8ff;font:800 11px system-ui;box-shadow:0 5px 18px #0008;touch-action:manipulation}
#rolyfeArcadeDock button:active{transform:scale(.96)}
#rolyfeArcadePanel{position:fixed;right:82px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:99999;width:min(290px,calc(100vw - 104px));padding:14px;border:1px solid #4b819b;border-radius:15px;background:linear-gradient(145deg,#102c43,#071523);color:#effaff;box-shadow:0 12px 38px #000b;font:13px/1.5 system-ui}
#rolyfeArcadePanel[hidden]{display:none}
#rolyfeArcadePanel header{display:flex;justify-content:space-between;gap:8px;align-items:center;font-weight:900;color:#74e5ef;margin-bottom:7px}
#rolyfeArcadePanel button{border:0;background:transparent;color:#fff;font-size:18px}
#rolyfeArcadePanel p{margin:0;color:#c1d3e2}
@media(max-height:430px) and (orientation:landscape){#rolyfeArcadeDock{right:8px;bottom:8px;gap:4px;width:54px}#rolyfeArcadeDock button{min-height:34px;font-size:9px}#rolyfeArcadePanel{bottom:8px}}
`;
document.head.appendChild(style);
const dock=document.createElement("nav");dock.id="rolyfeArcadeDock";dock.setAttribute("aria-label","Arcade quick controls");
const top=document.createElement("button");top.type="button";top.textContent="↑ TOP";top.setAttribute("aria-label","Scroll to top");top.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
const mid=document.createElement("button");mid.type="button";mid.textContent="↕ GAME";mid.setAttribute("aria-label","Scroll to game");mid.addEventListener("click",()=>{const target=document.querySelector("canvas")||document.querySelector("#games")||document.querySelector("main")||document.querySelector(".arena-wrap")||document.querySelector(".stage");if(target)target.scrollIntoView({behavior:"smooth",block:"center"})});
const ai=document.createElement("button");ai.type="button";ai.textContent="🧠 AI";ai.setAttribute("aria-label","Open Atlas game guide");
dock.append(top,mid,ai);
const panel=document.createElement("section");panel.id="rolyfeArcadePanel";panel.hidden=true;panel.innerHTML='<header><span>🧠 RO’Lyfe Arcade Guide</span><button type="button" aria-label="Close guide">×</button></header><p></p>';
const close=panel.querySelector("button"),copy=panel.querySelector("p");
function updateHint(){
 const source=document.querySelector("#guideTip,#atlasTip,#aiStatus,.guide,.aihint");
 const hint=source&&source.textContent.trim();
 copy.textContent=hint||"Read the game controls, watch the level pattern, and save special abilities for the toughest waves. Live cross-game Atlas chat is a separate integration.";
}
ai.addEventListener("click",()=>{updateHint();panel.hidden=!panel.hidden});
close.addEventListener("click",()=>panel.hidden=true);
dock.appendChild(panel);
document.body.appendChild(dock);
})();
