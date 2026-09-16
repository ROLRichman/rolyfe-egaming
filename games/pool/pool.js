/* ============================================================
   RO'LYFE GAMING™ — POOL ENGINE V3.4
   Physics / rules / touch / AI stabilization replacement.

   REPLACE:
   games/pool/pool.js

   PRESERVE:
   index.html
   pool.css
   themes.js
   backups/pool_V3.3_PRE_V3.4_PHYSICS_BREAK_BACKUP.js
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

  /* Fixed physics step helps prevent balls tunneling
     through one another during fast shots. */
  physicsStep:1/180,
  maxSubSteps:8
};


/* ============================================================
   HELPERS
   ============================================================ */

const $ = id => document.getElementById(id);

const clamp = (v,a,b) =>
  Math.max(a,Math.min(b,v));

const dist = (a,b) =>
  Math.hypot(a.x-b.x,a.y-b.y);


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

  /* IMPORTANT:
     9-ball target is captured BEFORE the shot.
     This prevents a legal shot from becoming a foul
     simply because the lowest ball was pocketed. */
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
   TABLE / DISPLAY
   ============================================================ */

function surface(){
  return document.querySelector(".table-surface") ||
         $("poolTable");
}

function scale(){
  const r = surface()?.getBoundingClientRect();

  return {
    x:(r?.width || CONFIG.tableWidth) / CONFIG.tableWidth,
    y:(r?.height || CONFIG.tableHeight) / CONFIG.tableHeight
  };
}

function message(text){
  const e = $("poolMessage");
  if(e) e.textContent = text;
}

function formatTime(s){
  s = Math.max(0,Math.floor(s || 0));

  return String(Math.floor(s/60)).padStart(2,"0") +
         ":" +
         String(s%60).padStart(2,"0");
}

function aiName(){
  return ({
    1:"RO'Lyfe AI — START-UP",
    2:"RO'Lyfe AI — BEGINNER",
    3:"RO'Lyfe AI — INVESTOR",
    4:"RO'Lyfe AI — ADVANCED",
    5:"RO'Lyfe AI — 7FIGURES"
  })[state.aiLevel] || "RO'Lyfe AI";
}


/* ============================================================
   PLAYERS
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
  state.shotHadContact=false;

  state.aimAngle=0;

  state.cueBall =
    makeBall(
      0,
      210,
      250
    );

  state.balls.push(state.cueBall);


  /* -------------------------
     9-BALL DIAMOND
     ------------------------- */

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

    /*
      1 is apex.
      9 is center.
      Remaining balls mixed.
    */
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

    nums.forEach((n,i)=>{
      state.balls.push(
        makeBall(
          n,
          spots[i][0],
          spots[i][1]
        )
      );
    });


  /* -------------------------
     8-BALL TRIANGLE
     ------------------------- */

  }else{

    const spots=[];

    for(let row=0;row<5;row++){

      for(let col=0;col<=row;col++){

        spots.push({
          x:690 + row*27,
          y:250 + (col-row/2)*31
        });

      }
    }

    /*
      8 remains visually near the middle.
    */
    const nums=[
      1,2,3,4,8,
      5,6,7,9,10,
      11,12,13,14,15
    ];

    nums.forEach((n,i)=>{

      state.balls.push(
        makeBall(
          n,
          spots[i].x,
          spots[i].y
        )
      );

    });
  }

  render();
}


/* ============================================================
   POWER UI
   ============================================================ */

function updatePowerUI(){

  const pct =
    Math.round(state.power*100);

  if($("powerFill"))
    $("powerFill").style.width =
      pct+"%";

  if($("powerValue"))
    $("powerValue").textContent =
      pct+"%";
}


/* ============================================================
   AIM LINE
   ============================================================ */

function updateAimLine(){

  const line=$("aimLine");
  const cue=state.cueBall;

  if(!line || !cue)
    return;

  const s=scale();

  line.style.left =
    (cue.x*s.x)+"px";

  line.style.top =
    (cue.y*s.y)+"px";

  line.style.width =
    (CONFIG.aimLineLength*s.x)+"px";

  line.style.transform =
    "translateY(-50%) rotate("+
    state.aimAngle+
    "rad)";

  line.style.display =
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

  const levels=[
    "",
    "START-UP",
    "BEGINNER",
    "INVESTOR",
    "ADVANCED",
    "7FIGURES"
  ];

  if($("statGame"))
    $("statGame").textContent =
      gameNames[state.gameType];

  if($("statMode"))
    $("statMode").textContent =
      modeNames[state.mode];

  if($("statAI"))
    $("statAI").textContent =
      levels[state.aiLevel];

  if($("shotCount"))
    $("shotCount").textContent =
      String(state.shotCount);

  if($("challengeScore"))
    $("challengeScore").textContent =
      String(state.challengeScore);

  $("challengePanel")
    ?.classList.toggle(
      "hidden",
      state.mode!=="challenge"
    );


  state.players.forEach((p,i)=>{

    const card =
      i===0
        ? $("player1")
        : $("player2");

    card?.classList.toggle(
      "active",
      i===state.currentPlayer &&
      !state.gameOver
    );


    const score=$("score"+i);

    if(score)
      score.textContent =
        String(p.score);


    const group=$("group"+i);

    if(group)
      group.textContent =
        p.group || "Open";


    const timer=$("timer"+i);

    if(timer)
      timer.textContent =
        formatTime(p.time);


    const status =
      $("player"+(i+1)+"Status");

    if(status){

      status.textContent =
        i===state.currentPlayer &&
        !state.gameOver
          ? "AT TABLE"
          : "WAITING";
    }

  });


  const turn=$("turnValue");

  if(turn){

    turn.textContent =
      state.gameOver
        ? "GAME OVER"
        : (
            state.players[state.currentPlayer]
              ?.name ||
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

  const layer=$("ballLayer");

  if(!layer)
    return;

  const s=scale();

  for(const b of state.balls){

    if(!b.element){

      const el =
        document.createElement("div");

      el.className="ball";

      el.dataset.ballId =
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

        el.textContent =
          b.id;

        el.dataset.group =
          b.group || "";
      }

      layer.appendChild(el);

      b.element=el;
    }


    /*
      IMPORTANT:
      A ball is hidden ONLY after it is
      actually marked pocketed.
    */
    b.element.style.display =
      b.pocketed
        ? "none"
        : "flex";


    if(!b.pocketed){

      b.element.style.left =
        (b.x*s.x)+"px";

      b.element.style.top =
        (b.y*s.y)+"px";

      b.element.style.transform =
        "translate(-50%,-50%)";
    }
  }

  updateUI();
}


/* ============================================================
   TIMER
   ============================================================ */

function stopTimer(){

  if(state.timer){

    clearInterval(state.timer);
    state.timer=null;
  }
}


function startTimer(seconds){

  stopTimer();

  const p=
    state.players[state.currentPlayer];

  if(!p)
    return;

  if(typeof seconds==="number")
    p.time=seconds;


  state.timer =
    setInterval(()=>{

      if(
        state.paused ||
        state.shooting ||
        state.aiThinking ||
        state.gameOver
      ){
        return;
      }


      const cur=
        state.players[state.currentPlayer];

      if(!cur)
        return;


      cur.time =
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

    },1000);


  updateUI();
}


/* ============================================================
   AIM / POWER
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


function setPower(v){

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
      Number(v)||0,
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


function audioCall(name,...args){

  const a=audio();

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
    HARD SHOOT LOCK.
    Nothing can fire while balls are moving,
    AI is thinking, game paused, etc.
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
    state.players[state.currentPlayer];

  if(!p)
    return;


  /*
    Capture the 9-ball target BEFORE the shot.
    This is critical for correct 9-ball rules.
  */
  if(state.gameType==="9ball"){

    const target=
      lowest9();

    state.nineBallTargetAtShot =
      target
        ? target.id
        : null;
  }else{

    state.nineBallTargetAtShot=null;
  }


  state.shooting=true;
  state.aiming=false;

  state.shotCount++;

  state.pocketedThisTurn=[];
  state.firstBallHit=null;
  state.foulThisTurn=false;
  state.shotHadContact=false;


  const force =
    CONFIG.minPower +
    (
      CONFIG.maxPower -
      CONFIG.minPower
    ) *
    state.power;


  const mult =
    state.breakShot
      ? CONFIG.breakPowerMultiplier
      : 1;


  state.cueBall.vx =
    Math.cos(state.aimAngle) *
    force *
    mult;

  state.cueBall.vy =
    Math.sin(state.aimAngle) *
    force *
    mult;


  message(
    p.name+" shoots."
  );


  audioCall("playShoot");
  audioCall("shoot");
  audioCall("cue");

  updateUI();
}


/* ============================================================
   POCKETS
   ============================================================ */

function pocketPoints(){

  return [
    {x:0,y:0},
    {x:500,y:0},
    {x:1000,y:0},

    {x:0,y:500},
    {x:500,y:500},
    {x:1000,y:500}
  ];
}


/* ============================================================
   PHYSICS INTEGRATION
   ============================================================ */

function integrate(b,dt){

  b.x += b.vx*dt;
  b.y += b.vy*dt;


  const decay =
    Math.pow(
      CONFIG.friction,
      dt*60
    );

  b.vx*=decay;
  b.vy*=decay;


  const v=
    Math.hypot(
      b.vx,
      b.vy
    );


  if(v>CONFIG.maxVelocity){

    b.vx =
      b.vx/v *
      CONFIG.maxVelocity;

    b.vy =
      b.vy/v *
      CONFIG.maxVelocity;
  }


  if(v<.018){

    b.vx=0;
    b.vy=0;
  }
}


/* ============================================================
   RAIL COLLISION
   ============================================================ */

function railCollision(b){

  const r=CONFIG.ballRadius;

  const W=CONFIG.tableWidth;
  const H=CONFIG.tableHeight;


  if(b.x<r){

    b.x=r;

    if(b.vx<0)
      b.vx =
        -b.vx *
        CONFIG.railRestitution;

    audioCall("playRail");
  }


  if(b.x>W-r){

    b.x=W-r;

    if(b.vx>0)
      b.vx =
        -b.vx *
        CONFIG.railRestitution;

    audioCall("playRail");
  }


  if(b.y<r){

    b.y=r;

    if(b.vy<0)
      b.vy =
        -b.vy *
        CONFIG.railRestitution;

    audioCall("playRail");
  }


  if(b.y>H-r){

    b.y=H-r;

    if(b.vy>0)
      b.vy =
        -b.vy *
        CONFIG.railRestitution;

    audioCall("playRail");
  }
}


/* ============================================================
   BALL COLLISION
   ============================================================ */

function collideBalls(){

  const min =
    CONFIG.ballRadius*2;


  for(
    let i=0;
    i<state.balls.length;
    i++
  ){

    const a=state.balls[i];

    if(a.pocketed)
      continue;


    for(
      let j=i+1;
      j<state.balls.length;
      j++
    ){

      const b=state.balls[j];

      if(b.pocketed)
        continue;


      let dx=b.x-a.x;
      let dy=b.y-a.y;

      let d=
        Math.hypot(dx,dy);


      if(d<.0001){

        dx=1;
        dy=0;
        d=1;
      }


      if(d>min)
        continue;


      const nx=dx/d;
      const ny=dy/d;

      const overlap=
        min-d;


      /*
        Separate overlapping balls first.
        This prevents them from remaining glued together.
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
        Relative velocity along collision normal.
      */

      const rv =
        (b.vx-a.vx)*nx +
        (b.vy-a.vy)*ny;


      /*
        If already separating,
        don't apply another impulse.
      */

      if(rv>0)
        continue;


      /*
        FIRST CONTACT RULE
        Only the cue ball establishes first contact.
      */

      if(
        state.firstBallHit===null
      ){

        if(a.id===0){

          state.firstBallHit=b.id;

        }else if(b.id===0){

          state.firstBallHit=a.id;
        }
      }


      state.shotHadContact=true;


      /*
        Elastic collision.
      */

      const impulse =
        -(
          1+
          CONFIG.collisionRestitution
        ) *
        rv /
        2;


      a.vx -=
        impulse*nx;

      a.vy -=
        impulse*ny;

      b.vx +=
        impulse*nx;

      b.vy +=
        impulse*ny;


      audioCall("playCollision");
      audioCall("collision");
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


  audioCall("playPocket");
  audioCall("pocket");


  if(b.id!==0){

    state.players[
      state.currentPlayer
    ].score++;


    if(state.mode==="challenge"){

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


  for(const b of state.balls){

    if(b.pocketed)
      continue;


    let best=Infinity;
    let nearest=null;


    for(const p of pockets){

      const d=
        dist(b,p);

      if(d<best){

        best=d;
        nearest=p;
      }
    }


    /*
      FULL CAPTURE
    */

    if(
      best<=
      CONFIG.pocketCaptureRadius
    ){

      pocketBall(b);
      continue;
    }


    /*
      POCKET ASSIST

      The ball must still be moving
      toward the pocket.

      This makes pocketing forgiving
      without randomly deleting balls
      near the rails.
    */

    if(
      best<=
      CONFIG.pocketAssistRadius &&
      nearest
    ){

      const speed=
        Math.hypot(
          b.vx,
          b.vy
        );


      if(speed>.15){

        const toPocket=
          dist(
            b,
            nearest
          ) || 1;


        const toward =
          (
            b.vx *
            (nearest.x-b.x) +
            b.vy *
            (nearest.y-b.y)
          ) /
          toPocket;


        if(toward>0.02){

          pocketBall(b);
        }
      }
    }
  }
}


/* ============================================================
   MOVEMENT CHECK
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
   8-BALL GROUPS
   ============================================================ */

function remainingGroup(group){

  return state.balls.some(
    b =>
      !b.pocketed &&
      b.group===group
  );
}


function openGroups(){

  return !state.players.some(
    p=>p.group
  );
}


function assignGroups(pocketed){

  if(
    state.gameType!=="8ball" ||
    !openGroups()
  ){
    return;
  }


  const first =
    pocketed.find(
      id =>
        (
          id>=1 &&
          id<=7
        ) ||
        (
          id>=9 &&
          id<=15
        )
    );


  if(!first)
    return;


  const group =
    first<=7
      ? "solid"
      : "stripe";


  state.players[
    state.currentPlayer
  ].group=group;


  state.players[
    state.currentPlayer===0
      ? 1
      : 0
  ].group =
    group==="solid"
      ? "stripe"
      : "solid";


  message(
    state.players[
      state.currentPlayer
    ].name+
    " is "+
    group+
    "."
  );
}


/* ============================================================
   9-BALL TARGET
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
    )[0] || null;
}


/* ============================================================
   RESPOT 9
   ============================================================ */

function respotNine(){

  const b =
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

function foul(messageText){

  state.foulThisTurn=true;

  state.players[
    state.currentPlayer
  ].fouls++;


  message(
    messageText
  );
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


  const text =
    state.players[winner].name+
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


  const pocketed =
    state.pocketedThisTurn
      .filter(
        id=>id!==0
      );


  const scratched =
    state.pocketedThisTurn
      .includes(0);


  /* ==========================================================
     9-BALL FIRST CONTACT LEGALITY
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

    state.breakShot=false;

    state.nineBallTargetAtShot=null;

    render();

    return;
  }


  /* ==========================================================
     9-BALL
     ========================================================== */

  if(
    state.gameType==="9ball"
  ){

    const ninePocketed =
      state.pocketedThisTurn
        .includes(9);


    /*
      Legal 9 = 9 pocketed AND
      first contact was correct AND
      no foul/scratch.
    */

    const legal9 =
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
      Any illegally pocketed 9
      gets respotted.
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
        Legal 8 requires:

        1. Player has a group.
        2. All of their group is gone.
        3. First contact was the 8.
        4. No foul.

        If the player pockets the 8 early,
        they lose.
      */

      const legal8 =
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
    BREAK SHOT IS CONSUMED HERE.

    Once the first shot finishes,
    there is no second break.
  */

  state.breakShot=false;


  /* ==========================================================
     TURN CONTINUATION
     ========================================================== */

  if(
    state.foulThisTurn ||
    pocketed.length===0
  ){

    switchPlayer();

  }else{

    /*
      Pocketed ball = player continues.
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
    state.mode==="aivai" ||
    (
      state.mode==="pvai" &&
      state.currentPlayer===1
    )
  );
}


function cancelAI(){

  /*
    Increment token so any already queued
    AI callback becomes invalid.
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


function aiTarget(){

  const avail =
    state.balls.filter(
      b =>
        !b.pocketed &&
        b.id!==0
    );


  /*
    9-ball always aims at
    lowest remaining number.
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
    8-ball:
    aim at player's group first.
  */

  if(
    state.gameType==="8ball" &&
    p?.group
  ){

    const own =
      avail.filter(
        b=>b.group===p.group
      );


    if(own.length)
      return own[0];


    const eight =
      avail.find(
        b=>b.id===8
      );


    if(eight)
      return eight;
  }


  /*
    Otherwise choose a normal object ball.
  */

  return (
    avail.find(
      b=>b.id!==8
    ) ||
    avail.find(
      b=>b.id===8
    ) ||
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


  const skill =
    (state.aiLevel-1)/4;


  const error =
    (1-skill)*0.12;


  state.aimAngle =
    Math.atan2(
      target.y-cue.y,
      target.x-cue.x
    ) +
    (
      Math.random()-.5
    ) *
    error;


  state.power =
    clamp(
      .42 +
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
    Kill any previous timer before creating
    a new one.
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


  state.aiTimer =
    setTimeout(()=>{

      state.aiTimer=null;


      /*
        Ignore stale callbacks.
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

    },CONFIG.aiDelay);
}


/* ============================================================
   TURN SWITCH
   ============================================================ */

function switchPlayer(){

  if(state.gameOver)
    return;


  /*
    Stop old AI timer BEFORE
    changing the player.
  */

  cancelAI();


  state.currentPlayer =
    state.currentPlayer===0
      ? 1
      : 0;


  /*
    Break is always finished
    after the opening shot.
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
    If next player is AI,
    schedule exactly one AI shot.
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

      p.time =
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
   PAUSE
   ============================================================ */

function togglePause(){

  if(state.gameOver)
    return;


  if(state.paused){

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
      Restart AI only if appropriate.
    */

    maybeAI();


  }else{

    state.paused=true;


    /*
      Critical:
      cancel pending AI timer.
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
   TOUCH / POINTER AIMING
   ============================================================ */

/*
   IMPORTANT:

   POINTER RELEASE NEVER FIRES.

   Touch/mouse:
      DOWN  = begin aiming
      MOVE  = adjust aim
      UP    = stop aiming

   SHOOT BUTTON = actually fire

   Space key = actually fire

   Public API shoot() = actually fire
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


  const end=e=>{

    if(!state.aiming)
      return;


    state.aiming=false;


    try{

      target.releasePointerCapture(
        e.pointerId
      );

    }catch(_){}


    /*
      DO NOT CALL SHOOT HERE.

      This is intentional.
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
    (e.clientX-r.left) /
    s.x;


  const y=
    (e.clientY-r.top) /
    s.y;


  state.aimAngle=
    Math.atan2(
      y-state.cueBall.y,
      x-state.cueBall.x
    );


  updateAimLine();
}


/* ============================================================
   INPUT / SETTINGS
   ============================================================ */

function bind(){

  /* GAME TYPE */

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

        /*
          themes.js remains authoritative.
        */

        global.ROLYFE_POOL_THEME
          ?.change
          ?.(
            e.target.value
          );


        render();
      }
    );


  /* AIM */

  $("aimLeft")
    ?.addEventListener(
      "click",
      ()=>{
        setAim(
          -CONFIG.aimStep
        );
      }
    );


  $("aimRight")
    ?.addEventListener(
      "click",
      ()=>{
        setAim(
          CONFIG.aimStep
        );
      }
    );


  /* POWER */

  $("powerDown")
    ?.addEventListener(
      "click",
      ()=>{
        setPower(
          state.power-.05
        );
      }
    );


  $("powerUp")
    ?.addEventListener(
      "click",
      ()=>{
        setPower(
          state.power+.05
        );
      }
    );


  /* SHOOT BUTTON */

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
      () =>
        $("rulesModal")
          ?.classList
          .remove("hidden")
    );


  $("closeRulesBtn")
    ?.addEventListener(
      "click",
      () =>
        $("rulesModal")
          ?.classList
          .add("hidden")
    );


  $("rulesModal")
    ?.addEventListener(
      "click",
      e=>{

        if(
          e.target.id==="rulesModal"
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

        if(!document.fullscreenElement){

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


        e.currentTarget.textContent =
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


      /*
        Space fires directly.
        It does NOT depend on pointer release.
      */

      if(e.code==="Space"){

        e.preventDefault();

        shoot();
      }
    }
  );
}


/* ============================================================
   MAIN PHYSICS LOOP
   ============================================================ */

function physics(now){

  if(!state.lastTime)
    state.lastTime=now;


  let frameDt=
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
      frameDt;

    let steps=0;


    /*
      Fixed physics substeps.

      This is the main change that helps
      prevent fast cue-ball shots from
      passing through object balls.
    */

    while(
      remaining>0 &&
      steps<CONFIG.maxSubSteps
    ){

      const dt=
        Math.min(
          CONFIG.physicsStep,
          remaining
        );


      for(
        const b of state.balls
      ){

        if(!b.pocketed){

          integrate(
            b,
            dt*60
          );
        }
      }


      for(
        const b of state.balls
      ){

        if(!b.pocketed){

          railCollision(b);
        }
      }


      /*
        Ball-to-ball collision after
        movement and before rendering.
      */

      collideBalls();


      /*
        Pocket test after collision.
      */

      checkPockets();


      remaining-=dt;
      steps++;
    }


    render();


    /*
      Once every moving ball has stopped,
      the shot is finished.

      This prevents another shot while
      balls are still rolling.
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
    Let themes.js remain the authority
    for theme loading/applying.
  */

  try{

    const theme =
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

  bindTableAim();

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

  getScore:() =>
    state.players.map(
      p=>p.score
    ),

  getState:() =>
    state
};


/* ============================================================
   START
   ============================================================ */

if(
  document.readyState==="loading"
){

  document.addEventListener(
    "DOMContentLoaded",
    init
  );

}else{

  init();
}


})(window);
