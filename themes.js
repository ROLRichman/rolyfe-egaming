/* ============================================================
   RO'LYFE POOL™ — THEME SYSTEM V3.2
   ============================================================ */
(function(global){
"use strict";

const POOL_THEMES={
 classic:{id:"classic",name:"Classic",colors:{background:"#111827",table:"#176b3a",tableDark:"#0b4726",rail:"#5b3a29",railDark:"#382318",cushion:"#0f5132",pocket:"#050505",text:"#fff",accent:"#facc15",secondary:"#d1d5db"}},
 rolyfe:{id:"rolyfe",name:"RO'Lyfe",colors:{background:"#07111f",table:"#064e3b",tableDark:"#022c22",rail:"#111827",railDark:"#030712",cushion:"#065f46",pocket:"#000",text:"#f8fafc",accent:"#22c55e",secondary:"#94a3b8"}},
 emg:{id:"emg",name:"EM Gaming",colors:{background:"#030712",table:"#111827",tableDark:"#020617",rail:"#0f172a",railDark:"#000",cushion:"#1e293b",pocket:"#000",text:"#fff",accent:"#a855f7",secondary:"#64748b"}},
 ace:{id:"ace",name:"ACE",colors:{background:"#020617",table:"#0c4a6e",tableDark:"#082f49",rail:"#111827",railDark:"#020617",cushion:"#075985",pocket:"#000",text:"#fff",accent:"#38bdf8",secondary:"#bae6fd"}},
 business:{id:"business",name:"Business",colors:{background:"#0f172a",table:"#14532d",tableDark:"#052e16",rail:"#1e293b",railDark:"#020617",cushion:"#166534",pocket:"#000",text:"#f8fafc",accent:"#f59e0b",secondary:"#94a3b8"}},
 realestate:{id:"realestate",name:"Real Estate",colors:{background:"#111827",table:"#365314",tableDark:"#1a2e05",rail:"#292524",railDark:"#0c0a09",cushion:"#3f6212",pocket:"#000",text:"#fff",accent:"#84cc16",secondary:"#a8a29e"}},
 investor:{id:"investor",name:"Investor",colors:{background:"#020617",table:"#064e3b",tableDark:"#022c22",rail:"#334155",railDark:"#0f172a",cushion:"#047857",pocket:"#000",text:"#f8fafc",accent:"#10b981",secondary:"#94a3b8"}},
 sevenfigures:{id:"sevenfigures",name:"7FIGURES",colors:{background:"#09090b",table:"#312e81",tableDark:"#1e1b4b",rail:"#18181b",railDark:"#000",cushion:"#4338ca",pocket:"#000",text:"#fff",accent:"#facc15",secondary:"#a1a1aa"}},
 midnight:{id:"midnight",name:"Midnight",colors:{background:"#000",table:"#172554",tableDark:"#020617",rail:"#111827",railDark:"#000",cushion:"#1e3a8a",pocket:"#000",text:"#fff",accent:"#60a5fa",secondary:"#64748b"}},
 neon:{id:"neon",name:"Neon",colors:{background:"#020617",table:"#172554",tableDark:"#020617",rail:"#0f172a",railDark:"#000",cushion:"#1d4ed8",pocket:"#000",text:"#fff",accent:"#22d3ee",secondary:"#c084fc"}},
 championship:{id:"championship",name:"Championship",colors:{background:"#18181b",table:"#064e3b",tableDark:"#022c22",rail:"#78350f",railDark:"#451a03",cushion:"#047857",pocket:"#000",text:"#fff",accent:"#fbbf24",secondary:"#d4d4d8"}}
};

const DEFAULT_POOL_THEME="rolyfe";

function getPoolTheme(id=DEFAULT_POOL_THEME){return POOL_THEMES[id]||POOL_THEMES[DEFAULT_POOL_THEME]}
function getPoolThemes(){return Object.values(POOL_THEMES)}

function applyPoolTheme(id=DEFAULT_POOL_THEME){
  const t=getPoolTheme(id),c=t.colors,r=document.documentElement;
  const vars={
    "--pool-bg":c.background,
    "--pool-cloth":c.table,
    "--pool-cloth-dark":c.tableDark,
    "--pool-rail":c.rail,
    "--pool-rail-light":c.cushion,
    "--pool-pocket":c.pocket,
    "--pool-text":c.text,
    "--pool-accent":c.accent,
    "--pool-accent-light":c.secondary
  };
  Object.entries(vars).forEach(([k,v])=>r.style.setProperty(k,v));
  r.dataset.poolTheme=t.id;
  return t;
}
function savePoolTheme(id){
  if(!POOL_THEMES[id])return false;
  try{localStorage.setItem("rolyfe_pool_theme",id);return true}catch(e){return false}
}
function loadPoolTheme(){
  try{
    const saved=localStorage.getItem("rolyfe_pool_theme");
    if(saved&&POOL_THEMES[saved])return saved;
  }catch(e){}
  return DEFAULT_POOL_THEME;
}
function initializePoolTheme(){return applyPoolTheme(loadPoolTheme())}
function changePoolTheme(id){
  if(!POOL_THEMES[id])return null;
  const t=applyPoolTheme(id);savePoolTheme(id);return t;
}

global.ROLYFE_POOL_THEMES=POOL_THEMES;
global.ROLYFE_POOL_THEME={
  get:getPoolTheme,list:getPoolThemes,apply:applyPoolTheme,
  change:changePoolTheme,save:savePoolTheme,load:loadPoolTheme,initialize:initializePoolTheme
};

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initializePoolTheme);
else initializePoolTheme();

})(window);
