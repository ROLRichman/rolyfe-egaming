/* ============================================================
   RO'LYFE GAMING™ — POOL ENGINE V3.4.1
   PHYSICS STABILIZATION

   REPLACE:
   games/pool/pool.js

   DO NOT CHANGE:
   index.html
   pool.css
   themes.js
   ============================================================ */

(function(global){
"use strict";


/* ============================================================
   CONFIG
   ============================================================ */

const CONFIG = {
  tableWidth:1000,
  tableHeight:500,
  ballRadius:14,

  friction:0.992,
  railRestitution:0.88,
  collisionRestitution:0.94,

  minPower:0.12,
  maxPower:34,
  breakPowerMultiplier:1.35,

  pocketCaptureRadius:34,
  pocketAssistRadius:42,

  playerTime:600,
  challengeTime:120,

  aimStep:2.5*Math.PI/180,
  aimLineLength:240,

  aiDelay:850,
  aiMaxThinkTime:1800,

  maxVelocity:38,

  /*
    Physics runs at a fixed rate.
    Velocity remains in "pixels per frame"
    style units, matching the original engine.
  */
  physicsStep:1/180,
  maxSubSteps:8
};


/* ============================================================
   HELPERS
   ============================================================ */

const $ = id =>
  document.getElementById(id);

const clamp = (v,a,b) =>
  Math.max(a,Math.min(b,v));

const dist = (a,b) =>
  Math.hypot(
    a.x-b.x,
    a.y-b.y
  );


/* ============================================================
   STATE
   ============================================================ */

const state = {

  gameType:"8ball",
  mode:"pvp",
  aiLevel:1,

  balls:[],
  players:[],
  currentPlayer:0,

  cueBall:null,

  aimAngle:0,
  power:.55,

  breakShot:true,

  shooting:false,
  aiming:false,

  paused:false,
  gameOver:false,

  pocketedThisTurn:[],
  firstBallHit:null,
  foulThisTurn:false,

  /*
    IMPORTANT:
    Capture the 9-ball target BEFORE the shot.
  */
  nineBallTargetAtShot:null,

  challengeScore:0,
  shotCount:0,

  timer:null,

  aiThinking:false,
  aiTimer:null,
  aiToken:0,

  initialized:false,
  lastTime:0,

  shotHadContact:false
};


/* ============================================================
   TABLE
   ============================================================ */

function surface(){

  return (
    document.querySelector(".table-surface") ||
    $("poolTable")
  );
}


function scale(){

  const r =
    surface()?.getBoundingClientRect();

  return {

    x:
      (r?.width ||
       CONFIG.tableWidth) /
      CONFIG.tableWidth,

    y:
      (r?.height ||
       CONFIG.tableHeight) /
      CONFIG.tableHeight
  };
}


function message(text){

  const e=$("poolMessage");

  if(e)
    e.textContent=text;
}


/* ============================================================
   PLAYER NAMES
   ============================================================ */

function aiName(){

  return ({
    1:"RO'Lyfe AI — START-UP",
    2:"RO'Lyfe AI — BEGINNER",
    3:"RO'Lyfe AI — INVESTOR",
    4:"RO'Lyfe AI — ADVANCED",
    5:"RO'Lyfe AI — 7FIGURES"
  })[state.aiLevel] ||
  "RO'Lyfe AI";
}


/* ============================================================
   PLAYER CONFIGURATION
   ============================================================ */

function configurePlayers(){

  if(state.mode==="pvai"){

    state.players=[

      {
        name:"PLAYER 1",
        type:"human",
        score:0,
        group:null,
        time:CONFIG.playerTime,
        fouls:0
      },

      {
        name:aiName(),
        type:"ai",
        score:0,
        group:null,
        time:CONFIG.playerTime,
        fouls:0
      }
    ];


  }else if(state.mode==="aivai"){

    state.players=[

      {
        name:"RO'Lyfe AI Alpha",
        type:"ai",
        score:0,
        group:null,
        time:CONFIG.playerTime,
        fouls:0
      },

      {
        name:"RO'Lyfe AI Beta",
        type:"ai",
        score:0,
        group:null,
        time:CONFIG.playerTime,
        fouls:0
      }
    ];


  }else if(state.mode==="challenge"){

    state.players=[

      {
        name:"CHALLENGE PLAYER",
        type:"human",
        score:0,
        group:null,
        time:CONFIG.challengeTime,
        fouls:0
      },

      {
        name:"CHALLENGE",
        type:"system",
        score:0,
        group:null,
        time:CONFIG.challengeTime,
        fouls:0
      }
    ];


  }else{

    state.players=[

      {
        name:"PLAYER 1",
        type:"human",
        score:0,
        group:null,
        time:CONFIG.playerTime,
        fouls:0
      },

      {
        name:"PLAYER 2",
        type:"human",
        score:0,
        group:null,
        time:CONFIG.playerTime,
        fouls:0
      }
    ];
  }
}


/* ============================================================
   BALL
   ============================================================ */

function makeBall(id,x,y){

  return {

    id,
    x,
    y,

    vx:0,
    vy:0,

    pocketed:false,

    element:null,

    group:
      id===0
        ? null
        : id<=7
          ? "solid"
          : id===8
            ? "eight"
            : "stripe"
  };
}


/* ============================================================
   RACK
   ============================================================ */

function rack(){

  cancelAI();

  state.balls=[];
  state.pocketedThisTurn=[];

  state.firstBallHit=null;
  state.foulThisTurn=false;

  state.nineBallTargetAtShot=null;

  state.breakShot=true;
  state.shooting=false;
  state.aiming=false;

  state.shotHadContact=false;

  state.aimAngle=0;


  /*
    Cue ball.
  */

  state.cueBall=
    makeBall(
      0,
      210,
      250
    );

  state.balls.push(
    state.cueBall
  );


  /* ==========================================================
     9-BALL
     ========================================================== */

  if(state.gameType==="9ball"){

    const spots=[

      [700,250],

      [727,236],
      [727,264],

      [754,222],
      [754,250],
      [754,278],

      [781,236],
      [781,264],

      [808,250]
    ];


    const nums=[
      1,
      2,
      3,
      9,
      4,
      5,
      6,
      7,
      8
    ];


    nums.forEach(
      (n,i)=>{

        state.balls.push(
          makeBall(
            n,
            spots[i][0],
            spots[i][1]
          )
        );
      }
    );


  /* ==========================================================
     8-BALL
     ========================================================== */

  }else{

    const spots=[];


    for(
      let row=0;
      row<5;
      row++
    ){

      for(
        let col=0;
        col<=row;
        col++
      ){

        spots.push({

          x:
            690+
            row*27,

          y:
            250+
            (col-row/2)*31
        });
      }
    }


    const nums=[

      1,2,3,4,8,
      5,6,7,9,10,
      11,12,13,14,15

    ];


    nums.forEach(
      (n,i)=>{

        state.balls.push(
          makeBall(
            n,
            spots[i].x,
            spots[i].y
          )
        );
      }
    );
  }


  render();
}


/* ============================================================
   POWER UI
   ============================================================ */

function updatePowerUI(){

  const pct=
    Math.round(
      state.power*100
    );


  if($("powerFill"))
    $("powerFill").style.width=
      pct+"%";


  if($("powerValue"))
    $("powerValue").textContent=
      pct+"%";
}


/* ============================================================
   AIM LINE
   ============================================================ */

function updateAimLine(){

  const line=
    $("aimLine");

  const cue=
    state.cueBall;


  if(!line || !cue)
    return;


  const s=
    scale();


  line.style.left=
    cue.x*s.x+"px";


  line.style.top=
    cue.y*s.y+"px";


  line.style.width=
    CONFIG.aimLineLength*s.x+
    "px";


  line.style.transform=
    "translateY(-50%) rotate("+
    state.aimAngle+
    "rad)";


  line.style.display=

    (
      state.shooting ||
      state.paused ||
      state.gameOver ||
      state.aiThinking
    )

      ? "none"
      : "block";
}


/* ============================================================
   TIME FORMAT
   ============================================================ */

function formatTime(seconds){

  seconds=
    Math.max(
      0,
      Math.floor(seconds||0)
    );


  return (

    String(
      Math.floor(seconds/60)
    ).padStart(2,"0")

    +

    ":"

    +

    String(
      seconds%60
    ).padStart(2,"0")
  );
}


/* ============================================================
   UI
   ============================================================ */

function updateUI(){

  const gameNames={

    "8ball":"8-Ball",
    "9ball":"9-Ball",
    "practice":"Practice"
  };


  const modeNames={

    pvp:"Player vs Player",
    pvai:"Player vs AI",
    aivai:"AI vs AI",
    challenge:"Challenge"
  };


  const levelNames=[

    "",
    "START-UP",
    "BEGINNER",
    "INVESTOR",
    "ADVANCED",
    "7FIGURES"
  ];


  if($("statGame"))
    $("statGame").textContent=
      gameNames[state.gameType];


  if($("statMode"))
    $("statMode").textContent=
      modeNames[state.mode];


  if($("statAI"))
    $("statAI").textContent=
      levelNames[state.aiLevel];


  if($("shotCount"))
    $("shotCount").textContent=
      String(state.shotCount);


  if($("challengeScore"))
    $("challengeScore").textContent=
      String(state.challengeScore);


  $("challengePanel")
    ?.classList.toggle(
      "hidden",
      state.mode!=="challenge"
    );


  state.players.forEach(
    (p,i)=>{

      const card=
        i===0
          ? $("player1")
          : $("player2");


      if(card){

        card.classList.toggle(
          "active",
          i===state.currentPlayer &&
          !state.gameOver
        );
      }


      /*
        Update the actual visible player name.
      */

      const name=
        card?.querySelector(
          ".player-name"
        );


      if(name)
        name.textContent=
          p.name;


      /*
        Update avatar label if present.
      */

      const avatar=
        card?.querySelector(
          ".player-avatar"
        );


      if(avatar)
        avatar.textContent=
          i===0
            ? "P1"
            : "P2";


      const score=
        $("score"+i);

      if(score)
        score.textContent=
          String(p.score);


      const group=
        $("group"+i);

      if(group)
        group.textContent=
          p.group ||
          "Open";


      const timer=
        $("timer"+i);

      if(timer)
        timer.textContent=
          formatTime(p.time);


      const status=
        $("player"+(i+1)+"Status");


      if(status){

        status.textContent=

          i===state.currentPlayer &&
          !state.gameOver

            ? "AT TABLE"
            : "WAITING";
      }
    }
  );


  const turn=
    $("turnValue");


  if(turn){

    turn.textContent=

      state.gameOver

        ? "GAME OVER"

        : (
            state.players[
              state.currentPlayer
            ]?.name ||
            "PLAYER 1"
          );
  }


  updatePowerUI();
  updateAimLine();
}


/* ============================================================
   RENDER
   ============================================================ */

function render(){

  const layer=
    $("ballLayer");


  if(!layer)
    return;


  /*
    IMPORTANT FIX:

    Destroy previous visual ball elements
    before rebuilding.

    This prevents duplicate white balls,
    ghost rack balls, and old visual states.
  */

  layer.innerHTML="";


  const s=
    scale();


  for(
    const b of state.balls
  ){

    if(b.pocketed)
      continue;


    const el=
      document.createElement("div");


    el.className="ball";


    el.dataset.ballId=
      b.id;


    if(b.id===0){

      el.classList.add(
        "white",
        "cue"
      );

    }else{

      el.classList.add(
        "ball-"+b.id
      );

      el.textContent=
        b.id;

      el.dataset.group=
        b.group || "";
    }


    el.style.left=
      b.x*s.x+"px";


    el.style.top=
      b.y*s.y+"px";


    layer.appendChild(el);


    b.element=el;
  }


  updateAimLine();
  updateUI();
}


/* ============================================================
   TIMER
   ============================================================ */

function stopTimer(){

  if(state.timer){

    clearInterval(
      state.timer
    );

    state.timer=null;
  }
}


function startTimer(seconds){

  stopTimer();


  const p=
    state.players[
      state.currentPlayer
    ];


  if(!p)
    return;


  if(typeof seconds==="number")
    p.time=seconds;


  state.timer=
    setInterval(
      ()=>{

        if(
          state.paused ||
          state.shooting ||
          state.aiThinking ||
          state.gameOver
        ){
          return;
        }


        const cur=
          state.players[
            state.currentPlayer
          ];


        if(!cur)
          return;


        cur.time=
          Math.max(
            0,
            cur.time-1
          );


        updateUI();


        if(cur.time<=0){

          stopTimer();

          message(
            "Time expired — turn passes."
          );

          switchPlayer();
        }

      },
      1000
    );


  updateUI();
}


/* ============================================================
   AIM
   ============================================================ */

function setAim(delta){

  if(
    state.shooting ||
    state.gameOver ||
    state.paused ||
    state.aiThinking
  ){
    return;
  }


  state.aimAngle+=delta;

  updateAimLine();
}


/* ============================================================
   POWER
   ============================================================ */

function setPower(value){

  if(
    state.shooting ||
    state.gameOver ||
    state.paused ||
    state.aiThinking
  ){
    return;
  }


  state.power=
    clamp(
      Number(value)||0,
      0,
      1
    );


  updatePowerUI();
}


/* ============================================================
   AUDIO BRIDGE
   ============================================================ */

function audio(){

  return (

    global.ROLYFEAudio ||

    global.ROLyfeAudio ||

    global.ROlyfeAudio ||

    global.ROLyfeAudio ||

    null
  );
}


function audioCall(
  name,
  ...args
){

  const a=
    audio();


  if(
    !a ||
    document.body.classList.contains(
      "sound-muted"
    )
  ){
    return;
  }


  try{

    if(
      typeof a[name]==="function"
    ){

      a[name](...args);
    }

  }catch(_){}
}


function unlockAudio(){

  try{

    audioCall("init");
    audioCall("unlock");

  }catch(_){}
}


/* ============================================================
   SHOOT
   ============================================================ */

function shoot(){

  /*
    No shot while:

    - balls are moving
    - paused
    - game over
    - AI thinking
  */

  if(
    state.shooting ||
    state.gameOver ||
    state.paused ||
    state.aiThinking ||
    !state.cueBall
  ){
    return;
  }


  const p=
    state.players[
      state.currentPlayer
    ];


  if(!p)
    return;


  /*
    Capture lowest 9-ball BEFORE the shot.
  */

  if(
    state.gameType==="9ball"
  ){

    const target=
      lowest9();


    state.nineBallTargetAtShot=
      target
        ? target.id
        : null;

  }else{

    state.nineBallTargetAtShot=
      null;
  }


  state.shooting=true;
  state.aiming=false;


  state.shotCount++;


  state.pocketedThisTurn=[];
  state.firstBallHit=null;
  state.foulThisTurn=false;
  state.shotHadContact=false;


  const force=

    CONFIG.minPower +

    (
      CONFIG.maxPower -
      CONFIG.minPower
    ) *
    state.power;


  const multiplier=

    state.breakShot
      ? CONFIG.breakPowerMultiplier
      : 1;


  state.cueBall.vx=

    Math.cos(
      state.aimAngle
    ) *
    force *
    multiplier;


  state.cueBall.vy=

    Math.sin(
      state.aimAngle
    ) *
    force *
    multiplier;


  message(
    p.name+
    " shoots."
  );


  audioCall("playShoot");
  audioCall("shoot");
  audioCall("cue");


  updateUI();
}


/* ============================================================
   POCKET LOCATIONS
   ============================================================ */

function pocketPoints(){

  return [

    {
      x:0,
      y:0
    },

    {
      x:CONFIG.tableWidth/2,
      y:0
    },

    {
      x:CONFIG.tableWidth,
      y:0
    },

    {
      x:0,
      y:CONFIG.tableHeight
    },

    {
      x:CONFIG.tableWidth/2,
      y:CONFIG.tableHeight
    },

    {
      x:CONFIG.tableWidth,
      y:CONFIG.tableHeight
    }

  ];
}


/* ============================================================
   PHYSICS INTEGRATION
   ============================================================ */

/*
  IMPORTANT PHYSICS FIX

  This function expects FRAME UNITS.

  Example:

    1.0 = one normal animation frame
    0.5 = half a frame
    0.333 = one third of a frame

  The previous V3.4 version mixed seconds
  and frame units, causing excessive friction.

  This version keeps everything consistent.
*/

function integrate(
  b,
  frameUnits
){

  b.x +=
    b.vx *
    frameUnits;


  b.y +=
    b.vy *
    frameUnits;


  /*
    Apply friction based on actual
    frame units.

    At one frame:
      .992

    At one third frame:
      .992^(1/3)

    Correct.
  */

  const decay=
    Math.pow(
      CONFIG.friction,
      frameUnits
    );


  b.vx *= decay;
  b.vy *= decay;


  const velocity=
    Math.hypot(
      b.vx,
      b.vy
    );


  /*
    Safety velocity cap.
  */

  if(
    velocity >
    CONFIG.maxVelocity
  ){

    b.vx=
      b.vx /
      velocity *
      CONFIG.maxVelocity;


    b.vy=
      b.vy /
      velocity *
      CONFIG.maxVelocity;
  }


  /*
    Only stop when genuinely slow.
  */

  if(
    Math.hypot(
      b.vx,
      b.vy
    ) < .045
  ){

    b.vx=0;
    b.vy=0;
  }
}


/* ============================================================
   RAIL COLLISION
   ============================================================ */

function railCollision(b){

  const r=
    CONFIG.ballRadius;


  const W=
    CONFIG.tableWidth;


  const H=
    CONFIG.tableHeight;


  if(b.x<r){

    b.x=r;


    if(b.vx<0){

      b.vx=
        -b.vx *
        CONFIG.railRestitution;
    }


    audioCall(
      "playRail"
    );
  }


  if(b.x>W-r){

    b.x=W-r;


    if(b.vx>0){

      b.vx=
        -b.vx *
        CONFIG.railRestitution;
    }


    audioCall(
      "playRail"
    );
  }


  if(b.y<r){

    b.y=r;


    if(b.vy<0){

      b.vy=
        -b.vy *
        CONFIG.railRestitution;
    }


    audioCall(
      "playRail"
    );
  }


  if(b.y>H-r){

    b.y=H-r;


    if(b.vy>0){

      b.vy=
        -b.vy *
        CONFIG.railRestitution;
    }


    audioCall(
      "playRail"
    );
  }
}


/* ============================================================
   BALL COLLISION
   ============================================================ */

function collideBalls(){

  const minimumDistance=
    CONFIG.ballRadius*2;


  for(
    let i=0;
    i<state.balls.length;
    i++
  ){

    const a=
      state.balls[i];


    if(a.pocketed)
      continue;


    for(
      let j=i+1;
      j<state.balls.length;
      j++
    ){

      const b=
        state.balls[j];


      if(b.pocketed)
        continue;


      let dx=
        b.x-a.x;


      let dy=
        b.y-a.y;


      let distance=
        Math.hypot(
          dx,
          dy
        );


      /*
        Avoid division by zero.
      */

      if(distance<.0001){

        dx=1;
        dy=0;
        distance=1;
      }


      if(
        distance >
        minimumDistance
      ){
        continue;
      }


      const nx=
        dx/distance;


      const ny=
        dy/distance;


      const overlap=
        minimumDistance -
        distance;


      /*
        Separate the balls.
      */

      a.x -=
        nx *
        overlap/2;


      a.y -=
        ny *
        overlap/2;


      b.x +=
        nx *
        overlap/2;


      b.y +=
        ny *
        overlap/2;


      /*
        Relative velocity along
        collision normal.
      */

      const relativeVelocity=

        (
          b.vx-a.vx
        ) *
        nx

        +

        (
          b.vy-a.vy
        ) *
        ny;


      /*
        Already moving apart.
      */

      if(
        relativeVelocity>0
      ){
        continue;
      }


      /*
        FIRST CONTACT

        Only cue-ball contact
        establishes firstBallHit.
      */

      if(
        state.firstBallHit===null
      ){

        if(a.id===0){

          state.firstBallHit=
            b.id;

        }else if(b.id===0){

          state.firstBallHit=
            a.id;
        }
      }


      state.shotHadContact=true;


      /*
        Equal-mass elastic collision.
      */

      const impulse=

        -(
          1+
          CONFIG.collisionRestitution
        ) *
        relativeVelocity /
        2;


      a.vx -=
        impulse*nx;


      a.vy -=
        impulse*ny;


      b.vx +=
        impulse*nx;


      b.vy +=
        impulse*ny;


      audioCall(
        "playCollision"
      );


      audioCall(
        "collision"
      );
    }
  }
}


/* ============================================================
   POCKET BALL
   ============================================================ */

function pocketBall(b){

  if(b.pocketed)
    return;


  b.pocketed=true;

  b.vx=0;
  b.vy=0;


  state.pocketedThisTurn.push(
    b.id
  );


  audioCall(
    "playPocket"
  );


  audioCall(
    "pocket"
  );


  if(b.id!==0){

    state.players[
      state.currentPlayer
    ].score++;


    if(
      state.mode==="challenge"
    ){

      state.challengeScore +=
        b.id===8
          ? 50
          : 10;
    }
  }
}


/* ============================================================
   POCKET DETECTION
   ============================================================ */

function checkPockets(){

  const pockets=
    pocketPoints();


  for(
    const b of state.balls
  ){

    if(b.pocketed)
      continue;


    let bestDistance=
      Infinity;


    let nearestPocket=
      null;


    for(
      const p of pockets
    ){

      const d=
        dist(
          b,
          p
        );


      if(
        d<
        bestDistance
      ){

        bestDistance=d;
        nearestPocket=p;
      }
    }


    /*
      Full pocket capture.
    */

    if(
      bestDistance <=
      CONFIG.pocketCaptureRadius
    ){

      pocketBall(b);

      continue;
    }


    /*
      Forgiving pocket assist.

      The ball must be moving
      toward the pocket.
    */

    if(
      bestDistance <=
      CONFIG.pocketAssistRadius &&
      nearestPocket
    ){

      const speed=
        Math.hypot(
          b.vx,
          b.vy
        );


      if(speed>.15){

        const distanceToPocket=
          dist(
            b,
            nearestPocket
          ) || 1;


        const toward=

          (
            b.vx *
            (
              nearestPocket.x-b.x
            )

            +

            b.vy *
            (
              nearestPocket.y-b.y
            )
          ) /
          distanceToPocket;


        if(toward>.02){

          pocketBall(b);
        }
      }
    }
  }
}


/* ============================================================
   MOVEMENT
   ============================================================ */

function anyMoving(){

  return state.balls.some(
    b =>
      !b.pocketed &&
      Math.hypot(
        b.vx,
        b.vy
      )>.045
  );
}


/* ============================================================
   REMAINING GROUP
   ============================================================ */

function remainingGroup(group){

  return state.balls.some(
    b =>
      !b.pocketed &&
      b.group===group
  );
}


/* ============================================================
   GROUP STATUS
   ============================================================ */

function openGroups(){

  return !state.players.some(
    p=>p.group
  );
}


/* ============================================================
   ASSIGN 8-BALL GROUPS
   ============================================================ */

function assignGroups(
  pocketed
){

  if(
    state.gameType!=="8ball" ||
    !openGroups()
  ){
    return;
  }


  const first=
    pocketed.find(
      id =>
        (
          id>=1 &&
          id<=7
        )
        ||
        (
          id>=9 &&
          id<=15
        )
    );


  if(!first)
    return;


  const group=
    first<=7
      ? "solid"
      : "stripe";


  const current=
    state.currentPlayer;


  const other=
    current===0
      ? 1
      : 0;


  state.players[
    current
  ].group=
    group;


  state.players[
    other
  ].group=
    group==="solid"
      ? "stripe"
      : "solid";


  message(
    state.players[
      current
    ].name+
    " is "+
    group+
    "."
  );
}


/* ============================================================
   LOWEST 9-BALL
   ============================================================ */

function lowest9(){

  return state.balls

    .filter(
      b =>
        !b.pocketed &&
        b.id>=1 &&
        b.id<=9
    )

    .sort(
      (a,b)=>
        a.id-b.id
    )[0]

    || null;
}


/* ============================================================
   RESPOT 9
   ============================================================ */

function respotNine(){

  const b=
    state.balls.find(
      x=>x.id===9
    );


  if(!b)
    return;


  b.pocketed=false;

  b.x=808;
  b.y=250;

  b.vx=0;
  b.vy=0;


  message(
    "Illegal 9-ball — 9 respotted."
  );
}


/* ============================================================
   FOUL
   ============================================================ */

function foul(text){

  state.foulThisTurn=true;


  state.players[
    state.currentPlayer
  ].fouls++;


  message(text);
}


/* ============================================================
   END GAME
   ============================================================ */

function endGame(
  winner,
  reason
){

  cancelAI();
  stopTimer();


  state.gameOver=true;
  state.shooting=false;
  state.aiming=false;


  const text=

    state.players[
      winner
    ].name+

    " wins — "+

    reason;


  if($("finalScore"))
    $("finalScore").textContent=
      text;


  $("gameOverModal")
    ?.classList.remove(
      "hidden"
    );


  message(text);

  updateUI();
}


/* ============================================================
   FINISH SHOT
   ============================================================ */

function finishShot(){

  if(!state.shooting)
    return;


  state.shooting=false;


  const p=
    state.players[
      state.currentPlayer
    ];


  const pocketed=
    state.pocketedThisTurn
      .filter(
        id=>id!==0
      );


  const scratched=
    state.pocketedThisTurn
      .includes(0);


  /* ==========================================================
     9-BALL FIRST CONTACT
     ========================================================== */

  if(
    state.gameType==="9ball" &&
    state.nineBallTargetAtShot!==null
  ){

    if(
      state.firstBallHit===null
    ){

      foul(
        "Foul — cue ball did not contact a target ball."
      );

    }else if(
      state.firstBallHit !==
      state.nineBallTargetAtShot
    ){

      foul(
        "Foul — lowest ball must be hit first."
      );
    }
  }


  /* ==========================================================
     SCRATCH
     ========================================================== */

  if(scratched){

    foul(
      "Scratch — cue ball respotted."
    );


    state.cueBall.pocketed=false;

    state.cueBall.x=210;
    state.cueBall.y=250;

    state.cueBall.vx=0;
    state.cueBall.vy=0;
  }


  /* ==========================================================
     PRACTICE
     ========================================================== */

  if(
    state.gameType==="practice"
  ){

    message(
      scratched
        ? "Scratch — cue ball respotted."
        : "Practice shot complete."
    );


    state.pocketedThisTurn=[];

    state.nineBallTargetAtShot=null;

    state.breakShot=false;


    render();

    return;
  }


  /* ==========================================================
     9-BALL
     ========================================================== */

  if(
    state.gameType==="9ball"
  ){

    const ninePocketed=
      state.pocketedThisTurn
        .includes(9);


    /*
      Legal 9:
      correct first contact,
      no foul,
      9 actually pocketed.
    */

    const legal9=

      ninePocketed &&
      !state.foulThisTurn;


    if(legal9){

      endGame(
        state.currentPlayer,
        "9-ball legally pocketed."
      );


      state.pocketedThisTurn=[];
      state.nineBallTargetAtShot=null;


      render();

      return;
    }


    /*
      Illegal 9 gets respotted.
    */

    if(
      ninePocketed &&
      state.foulThisTurn
    ){

      respotNine();
    }
  }


  /* ==========================================================
     8-BALL
     ========================================================== */

  if(
    state.gameType==="8ball"
  ){

    assignGroups(
      pocketed
    );


    if(
      state.pocketedThisTurn
        .includes(8)
    ){

      const group=
        p.group;


      /*
        Legal 8:

        - player has a group
        - player's group is cleared
        - first contact was 8
        - no foul
      */

      const legal8=

        group &&
        !remainingGroup(group) &&
        state.firstBallHit===8 &&
        !state.foulThisTurn;


      if(legal8){

        endGame(
          state.currentPlayer,
          "8-ball legally pocketed."
        );


        state.pocketedThisTurn=[];

        render();

        return;
      }


      /*
        Early / illegal 8 = loss.
      */

      endGame(

        state.currentPlayer===0
          ? 1
          : 0,

        "8-ball pocketed illegally."
      );


      state.pocketedThisTurn=[];

      render();

      return;
    }
  }


  /*
    Break is now consumed.
  */

  state.breakShot=false;


  /* ==========================================================
     TURN
     ========================================================== */

  if(
    state.foulThisTurn ||
    pocketed.length===0
  ){

    switchPlayer();

  }else{

    /*
      Successful pocket:
      player continues.
    */

    message(
      "Good shot — continue your turn."
    );
  }


  state.pocketedThisTurn=[];

  state.nineBallTargetAtShot=null;


  render();

  maybeAI();
}


/* ============================================================
   AI
   ============================================================ */

function isAI(){

  return (

    state.mode==="aivai"

    ||

    (
      state.mode==="pvai" &&
      state.currentPlayer===1
    )
  );
}


/* ============================================================
   CANCEL AI
   ============================================================ */

function cancelAI(){

  /*
    Invalidate every old AI callback.
  */

  state.aiToken++;


  state.aiThinking=false;


  if(state.aiTimer){

    clearTimeout(
      state.aiTimer
    );

    state.aiTimer=null;
  }
}


/* ============================================================
   AI TARGET
   ============================================================ */

function aiTarget(){

  const available=

    state.balls.filter(
      b =>
        !b.pocketed &&
        b.id!==0
    );


  /*
    9-ball:
    lowest numbered ball.
  */

  if(
    state.gameType==="9ball"
  ){

    return lowest9();
  }


  const p=
    state.players[
      state.currentPlayer
    ];


  /*
    8-ball with assigned group.
  */

  if(
    state.gameType==="8ball" &&
    p?.group
  ){

    const own=
      available.filter(
        b=>b.group===p.group
      );


    if(own.length)
      return own[0];


    const eight=
      available.find(
        b=>b.id===8
      );


    if(eight)
      return eight;
  }


  /*
    Otherwise normal object ball.
  */

  return (

    available.find(
      b=>b.id!==8
    )

    ||

    available.find(
      b=>b.id===8
    )

    ||

    null
  );
}


/* ============================================================
   AI SHOOT
   ============================================================ */

function aiShoot(){

  if(
    state.gameOver ||
    state.paused ||
    state.shooting ||
    !isAI()
  ){
    return;
  }


  const target=
    aiTarget();


  if(!target){

    switchPlayer();

    return;
  }


  const cue=
    state.cueBall;


  if(
    !cue ||
    cue.pocketed
  ){
    return;
  }


  const skill=
    (state.aiLevel-1)/4;


  const error=
    (1-skill)*.12;


  state.aimAngle=

    Math.atan2(
      target.y-cue.y,
      target.x-cue.x
    )

    +

    (
      Math.random()-.5
    ) *
    error;


  state.power=
    clamp(
      .42+
      skill*.45,
      0,
      1
    );


  const status=
    $("aiStatus");


  if(status){

    status.classList.remove(
      "hidden"
    );


    status.textContent=

      "AI "+
      state.aiLevel+
      " • Target "+
      target.id+
      " • Shot calculated.";
  }


  shoot();
}


/* ============================================================
   AI SCHEDULER
   ============================================================ */

function maybeAI(){

  if(
    !isAI() ||
    state.gameOver ||
    state.paused ||
    state.shooting ||
    state.aiThinking
  ){
    return;
  }


  /*
    Never allow duplicate AI timers.
  */

  if(state.aiTimer){

    clearTimeout(
      state.aiTimer
    );

    state.aiTimer=null;
  }


  state.aiToken++;


  const token=
    state.aiToken;


  state.aiThinking=true;


  const status=
    $("aiStatus");


  if(status){

    status.classList.remove(
      "hidden"
    );


    status.textContent=
      "AI analyzing table…";
  }


  state.aiTimer=

    setTimeout(
      ()=>{

        state.aiTimer=null;


        /*
          Ignore stale timer.
        */

        if(
          token!==state.aiToken
        ){
          return;
        }


        state.aiThinking=false;


        if(
          !state.gameOver &&
          !state.paused &&
          isAI() &&
          !state.shooting
        ){

          aiShoot();
        }

      },

      CONFIG.aiDelay
    );
}


/* ============================================================
   SWITCH PLAYER
   ============================================================ */

function switchPlayer(){

  if(state.gameOver)
    return;


  /*
    Cancel the old player's
    AI/timer state first.
  */

  cancelAI();


  state.currentPlayer=

    state.currentPlayer===0
      ? 1
      : 0;


  /*
    Opening break is over.
  */

  state.breakShot=false;


  const p=
    state.players[
      state.currentPlayer
    ];


  message(
    p.name+
    "'s turn."
  );


  startTimer(
    p.time
  );


  updateUI();


  /*
    Schedule exactly one AI turn
    when appropriate.
  */

  maybeAI();
}


/* ============================================================
   RESET GAME
   ============================================================ */

function resetGame(){

  cancelAI();
  stopTimer();


  state.gameOver=false;
  state.paused=false;

  state.aiThinking=false;

  state.currentPlayer=0;

  state.shotCount=0;

  state.challengeScore=0;


  configurePlayers();


  state.players.forEach(
    p=>{

      p.score=0;
      p.group=null;
      p.fouls=0;

      p.time=

        state.mode==="challenge"
          ? CONFIG.challengeTime
          : CONFIG.playerTime;
    }
  );


  rack();


  document.body.classList.remove(
    "game-paused"
  );


  if($("pauseBtn"))
    $("pauseBtn").textContent=
      "PAUSE";


  message(
    "Break the rack to begin."
  );


  startTimer(

    state.mode==="challenge"
      ? CONFIG.challengeTime
      : CONFIG.playerTime
  );


  maybeAI();
}


/* ============================================================
   PAUSE / RESUME
   ============================================================ */

function togglePause(){

  if(state.gameOver)
    return;


  if(state.paused){

    /*
      RESUME
    */

    state.paused=false;


    document.body.classList.remove(
      "game-paused"
    );


    if($("pauseBtn"))
      $("pauseBtn").textContent=
        "PAUSE";


    message(
      "Game resumed."
    );


    updateAimLine();


    /*
      If current player is AI,
      schedule AI again.
    */

    maybeAI();


  }else{

    /*
      PAUSE
    */

    state.paused=true;


    /*
      Kill pending AI timer.
    */

    cancelAI();


    document.body.classList.add(
      "game-paused"
    );


    if($("pauseBtn"))
      $("pauseBtn").textContent=
        "RESUME";


    message(
      "Game paused."
    );


    updateAimLine();
  }
}


/* ============================================================
   POINTER / TOUCH AIMING
   ============================================================ */

/*
   IMPORTANT:

   TOUCH/MOUSE RELEASE DOES NOT SHOOT.

   DOWN  = begin aim
   MOVE  = change aim
   UP    = release aim

   SHOOT BUTTON = fires

   SPACE = fires

   API shoot() = fires
*/

function bindTableAim(){

  const target=
    surface();


  if(!target)
    return;


  target.addEventListener(

    "pointerdown",

    e=>{

      if(
        state.shooting ||
        state.gameOver ||
        state.paused ||
        state.aiThinking
      ){
        return;
      }


      unlockAudio();


      state.aiming=true;


      try{

        target.setPointerCapture(
          e.pointerId
        );

      }catch(_){}


      updateAimFromPointer(e);


      e.preventDefault();

    },

    {
      passive:false
    }
  );


  target.addEventListener(

    "pointermove",

    e=>{

      if(!state.aiming)
        return;


      updateAimFromPointer(e);


      e.preventDefault();

    },

    {
      passive:false
    }
  );


  const end=
    e=>{

      if(!state.aiming)
        return;


      state.aiming=false;


      try{

        target.releasePointerCapture(
          e.pointerId
        );

      }catch(_){}


      /*
        INTENTIONALLY NO shoot().
      */


      updateAimLine();


      if(e.cancelable)
        e.preventDefault();
    };


  target.addEventListener(
    "pointerup",
    end,
    {
      passive:false
    }
  );


  target.addEventListener(
    "pointercancel",
    end,
    {
      passive:false
    }
  );
}


/* ============================================================
   POINTER AIM CALCULATION
   ============================================================ */

function updateAimFromPointer(e){

  const r=
    surface()
      ?.getBoundingClientRect();


  if(
    !r ||
    !state.cueBall
  ){
    return;
  }


  const s=
    scale();


  const x=
    (
      e.clientX-r.left
    ) /
    s.x;


  const y=
    (
      e.clientY-r.top
    ) /
    s.y;


  state.aimAngle=

    Math.atan2(
      y-state.cueBall.y,
      x-state.cueBall.x
    );


  updateAimLine();
}


/* ============================================================
   INPUT
   ============================================================ */

function bind(){

  /* GAME */

  $("poolGame")
    ?.addEventListener(
      "change",
      e=>{

        state.gameType=
          e.target.value;

        resetGame();
      }
    );


  /* MODE */

  $("poolMode")
    ?.addEventListener(
      "change",
      e=>{

        state.mode=
          e.target.value;

        resetGame();
      }
    );


  /* AI LEVEL */

  $("poolAILevel")
    ?.addEventListener(
      "change",
      e=>{

        state.aiLevel=
          clamp(
            Number(e.target.value)||1,
            1,
            5
          );

        resetGame();
      }
    );


  /* THEME */

  $("poolTheme")
    ?.addEventListener(
      "change",
      e=>{

        global.ROLYFE_POOL_THEME
          ?.change
          ?.(
            e.target.value
          );


        render();
      }
    );


  /* AIM LEFT */

  $("aimLeft")
    ?.addEventListener(
      "click",
      ()=>{

        setAim(
          -CONFIG.aimStep
        );
      }
    );


  /* AIM RIGHT */

  $("aimRight")
    ?.addEventListener(
      "click",
      ()=>{

        setAim(
          CONFIG.aimStep
        );
      }
    );


  /* POWER DOWN */

  $("powerDown")
    ?.addEventListener(
      "click",
      ()=>{

        setPower(
          state.power-.05
        );
      }
    );


  /* POWER UP */

  $("powerUp")
    ?.addEventListener(
      "click",
      ()=>{

        setPower(
          state.power+.05
        );
      }
    );


  /* SHOOT */

  $("shootBtn")
    ?.addEventListener(
      "click",
      ()=>{

        unlockAudio();

        shoot();
      }
    );


  /* RESET */

  $("resetPool")
    ?.addEventListener(
      "click",
      resetGame
    );


  /* NEW RACK */

  $("newRackBtn")
    ?.addEventListener(
      "click",
      rack
    );


  /* PAUSE */

  $("pauseBtn")
    ?.addEventListener(
      "click",
      togglePause
    );


  /* RULES */

  $("rulesBtn")
    ?.addEventListener(
      "click",
      ()=>
        $("rulesModal")
          ?.classList
          .remove("hidden")
    );


  $("closeRulesBtn")
    ?.addEventListener(
      "click",
      ()=>
        $("rulesModal")
          ?.classList
          .add("hidden")
    );


  $("rulesModal")
    ?.addEventListener(
      "click",
      e=>{

        if(
          e.target.id===
          "rulesModal"
        ){

          e.currentTarget
            .classList
            .add("hidden");
        }
      }
    );


  /* GAME OVER */

  $("playAgainBtn")
    ?.addEventListener(
      "click",
      ()=>{

        $("gameOverModal")
          ?.classList
          .add("hidden");


        resetGame();
      }
    );


  /* FULLSCREEN */

  $("fullscreenBtn")
    ?.addEventListener(
      "click",
      ()=>{

        if(
          !document.fullscreenElement
        ){

          document.documentElement
            .requestFullscreen
            ?.();

        }else{

          document.exitFullscreen
            ?.();
        }
      }
    );


  /* SOUND */

  $("soundBtn")
    ?.addEventListener(
      "click",
      e=>{

        document.body.classList.toggle(
          "sound-muted"
        );


        e.currentTarget.textContent=

          document.body.classList.contains(
            "sound-muted"
          )

            ? "🔇"
            : "🔊";


        if(
          !document.body.classList.contains(
            "sound-muted"
          )
        ){

          unlockAudio();
        }
      }
    );


  /* RESIZE */

  window.addEventListener(
    "resize",
    render
  );


  /* KEYBOARD */

  document.addEventListener(
    "keydown",
    e=>{

      if(e.key==="ArrowLeft"){

        e.preventDefault();

        setAim(
          -CONFIG.aimStep
        );
      }


      if(e.key==="ArrowRight"){

        e.preventDefault();

        setAim(
          CONFIG.aimStep
        );
      }


      if(e.key==="ArrowUp"){

        e.preventDefault();

        setPower(
          state.power+.05
        );
      }


      if(e.key==="ArrowDown"){

        e.preventDefault();

        setPower(
          state.power-.05
        );
      }


      if(e.code==="Space"){

        e.preventDefault();

        shoot();
      }
    }
  );
}


/* ============================================================
   PHYSICS LOOP
   ============================================================ */

function physics(now){

  if(!state.lastTime)
    state.lastTime=now;


  const elapsed=

    Math.min(
      .05,
      (now-state.lastTime)/1000
    );


  state.lastTime=now;


  if(
    !state.paused &&
    !state.gameOver
  ){

    let remaining=
      elapsed;


    let steps=0;


    /*
      Convert seconds into
      frame-equivalent units.

      Example:
        1/180 sec × 60
        = 0.333 frame units
    */

    while(
      remaining>0 &&
      steps<CONFIG.maxSubSteps
    ){

      const seconds=

        Math.min(
          CONFIG.physicsStep,
          remaining
        );


      const frameUnits=
        seconds*60;


      /*
        IMPORTANT:
        integrate receives frameUnits,
        NOT seconds.
      */

      for(
        const b of state.balls
      ){

        if(!b.pocketed){

          integrate(
            b,
            frameUnits
          );
        }
      }


      /*
        Rails.
      */

      for(
        const b of state.balls
      ){

        if(!b.pocketed){

          railCollision(b);
        }
      }


      /*
        Ball collisions.
      */

      collideBalls();


      /*
        Pockets.
      */

      checkPockets();


      remaining-=seconds;

      steps++;
    }


    render();


    /*
      Shot is over only when
      every ball has stopped.
    */

    if(
      state.shooting &&
      !anyMoving()
    ){

      finishShot();
    }
  }


  requestAnimationFrame(
    physics
  );
}


/* ============================================================
   INITIALIZATION
   ============================================================ */

function init(){

  if(state.initialized)
    return;


  state.initialized=true;


  /*
    themes.js remains authoritative.
  */

  try{

    const theme=

      global.ROLYFE_POOL_THEME
        ?.load
        ?.() ||

      "rolyfe";


    if($("poolTheme"))
      $("poolTheme").value=
        theme;


    global.ROLYFE_POOL_THEME
      ?.apply
      ?.(
        theme
      );

  }catch(_){}


  bind();

  resetGame();


  requestAnimationFrame(
    physics
  );
}


/* ============================================================
   PUBLIC API
   ============================================================ */

global.ROLYFE_POOL={

  state,

  config:CONFIG,

  resetGame,

  rack,

  shoot,

  setPower,

  setAim,

  togglePause,


  setMode:v=>{

    state.mode=v;

    resetGame();
  },


  setGameType:v=>{

    state.gameType=v;

    resetGame();
  },


  setAILevel:v=>{

    state.aiLevel=

      clamp(
        Number(v)||1,
        1,
        5
      );

    resetGame();
  },


  startAI:maybeAI,

  stopAI:cancelAI,


  getScore:()=>
    state.players.map(
      p=>p.score
    ),


  getState:()=>
    state
};


/* ============================================================
   START
   ============================================================ */

if(
  document.readyState===
  "loading"
){

  document.addEventListener(
    "DOMContentLoaded",
    init
  );

}else{

  init();
}


})(window);
