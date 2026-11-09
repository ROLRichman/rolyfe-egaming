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
#rolyfeArcadeSizePanel{position:fixed;right:82px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:99999;width:min(270px,calc(100vw - 104px));padding:14px;border:1px solid #4b819b;border-radius:15px;background:linear-gradient(145deg,#102c43,#071523);color:#effaff;box-shadow:0 12px 38px #000b;font:12px/1.5 system-ui}
#rolyfeArcadeSizePanel[hidden]{display:none}
#rolyfeArcadeSizePanel label{display:flex;justify-content:space-between;font-weight:900;color:#74e5ef}
#rolyfeArcadeSizePanel input{width:100%;accent-color:#5de6f4}
#rolyfeArcadeSizePanel small{color:#c1d3e2}
@media(max-height:430px) and (orientation:landscape){#rolyfeArcadeDock{right:8px;bottom:8px;gap:4px;width:54px}#rolyfeArcadeDock button{min-height:34px;font-size:9px}#rolyfeArcadePanel{bottom:8px}}
`;
document.head.appendChild(style);
const dock=document.createElement("nav");dock.id="rolyfeArcadeDock";dock.setAttribute("aria-label","Arcade quick controls");
const top=document.createElement("button");top.type="button";top.textContent="↑ TOP";top.setAttribute("aria-label","Scroll to top");top.addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
const mid=document.createElement("button");mid.type="button";mid.textContent="↕ GAME";mid.setAttribute("aria-label","Scroll to game");mid.addEventListener("click",()=>{const target=document.querySelector("canvas")||document.querySelector("#games")||document.querySelector("main")||document.querySelector(".arena-wrap")||document.querySelector(".stage");if(target)target.scrollIntoView({behavior:"smooth",block:"center"})});
const ai=document.createElement("button");ai.type="button";ai.textContent="🧠 AI";ai.setAttribute("aria-label","Open Atlas game guide");
const trophy=document.createElement("button");trophy.type="button";trophy.textContent="🏆";trophy.setAttribute("aria-label","Open RO’Lyfe trophy case");
const size=document.createElement("button");size.type="button";size.textContent="↕ SIZE";size.setAttribute("aria-label","Adjust game screen height");
dock.append(top,mid,ai,trophy,size);
const panel=document.createElement("section");panel.id="rolyfeArcadePanel";panel.hidden=true;panel.innerHTML='<header><span>🧠 RO’Lyfe Arcade Guide</span><button type="button" aria-label="Close guide">×</button></header><p></p>';
const close=panel.querySelector("button"),copy=panel.querySelector("p");
const sizePanel=document.createElement("section");sizePanel.id="rolyfeArcadeSizePanel";sizePanel.hidden=true;sizePanel.innerHTML='<label for="rolyfeArcadeHeight"><span>GAME SCREEN HEIGHT</span><b id="rolyfeArcadeHeightValue">—</b></label><input id="rolyfeArcadeHeight" type="range" min="300" max="820" step="20" value="520"><small>Adjust the playfield height. Scroll the page as needed.</small>';
document.body.appendChild(sizePanel);
const heightInput=sizePanel.querySelector("input"),heightValue=sizePanel.querySelector("b");
function gameSurface(){return document.querySelector("#poolTable")||document.querySelector("canvas")||document.querySelector(".stage")||document.querySelector(".arena-wrap")}
if(!gameSurface())size.hidden=true;
function applyHeight(value,save){const target=gameSurface();if(!target)return;target.style.height=value+"px";heightValue.textContent=value+" px";if(save){try{localStorage.setItem("rolyfe_arcade_height_"+location.pathname,String(value))}catch(e){}}window.dispatchEvent(new Event("resize"))}
try{const saved=Number(localStorage.getItem("rolyfe_arcade_height_"+location.pathname)||0);if(saved>=300&&saved<=820){heightInput.value=String(saved);applyHeight(saved,false)}else{const target=gameSurface();const initial=target?Math.round(target.getBoundingClientRect().height):520;heightInput.value=String(Math.max(300,Math.min(820,initial)));heightValue.textContent=heightInput.value+" px"}}catch(e){heightValue.textContent=heightInput.value+" px"}
heightInput.addEventListener("input",()=>applyHeight(Number(heightInput.value),true));
size.addEventListener("click",()=>{panel.hidden=true;sizePanel.hidden=!sizePanel.hidden});

const trophyKey="rolyfe_arcade_trophies_v1",saveKey="rolyfe_arcade_savepoints_v1";
function readTrophies(){try{return JSON.parse(localStorage.getItem(trophyKey)||"{}")}catch(e){return {}}}
window.ROLYFE_ARCADE_PROFILE={
 award(name){const all=readTrophies();if(all[name])return false;all[name]=true;try{localStorage.setItem(trophyKey,JSON.stringify(all))}catch(e){}return true},
 getTrophies(){return readTrophies()},
 savePoint(game,data){try{const all=JSON.parse(localStorage.getItem(saveKey)||"{}");all[game]=data;localStorage.setItem(saveKey,JSON.stringify(all));return true}catch(e){return false}},
 loadPoint(game){try{return (JSON.parse(localStorage.getItem(saveKey)||"{}"))[game]||null}catch(e){return null}}
};
function updateHint(){
 const source=document.querySelector("#guideTip,#atlasTip,#aiStatus,.guide,.aihint");
 const hint=source&&source.textContent.trim();
 copy.textContent=hint||"Read the game controls, watch the level pattern, and save special abilities for the toughest waves. Live cross-game Atlas chat is a separate integration.";
}
ai.addEventListener("click",()=>{sizePanel.hidden=true;panel.querySelector("header span").textContent="🧠 RO’Lyfe Arcade Guide";updateHint();panel.hidden=!panel.hidden});
trophy.addEventListener("click",()=>{sizePanel.hidden=true;
 const all=readTrophies(),names=Object.keys(all).filter(k=>all[k]);
 panel.querySelector("header span").textContent="🏆 RO’Lyfe Trophy Case";
 copy.textContent=names.length?names.map(n=>"🏆 "+n).join("  ·  "):"No trophies unlocked yet. Earn Classic RO’Lyfe, Ace, EMG, RJ C&D, 7Figures and more as you play. Trophies are saved on this device.";
 panel.hidden=!panel.hidden;
});
close.addEventListener("click",()=>panel.hidden=true);
dock.appendChild(panel);
document.body.appendChild(dock);
})();
