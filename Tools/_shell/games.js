/* Per-game integration config for Tools/_integrate_games.js
 *
 *   id         manifest id (also the assets/games folder and tile_<id>)
 *   src        file name in sources/Playable Games
 *   front      JS expression, true while the game's own front page is up
 *              (that is when the shell BACK button is allowed to show)
 *   patches    [find, replace] pairs, each must match EXACTLY once
 *   wiring     classic script appended at the end of the file
 */
'use strict';

module.exports = [

/* ------------------------------------------------------------------ */
{
  id: 'colour-rush',
  src: 'ColourRush.html',
  title: 'Colour Rush',
  orientation: 'landscape',
  min: 2, max: 4, ai: 'true',
  color: '#2f80f6',
  front: "var e=document.getElementById('scr-home'); return !!(e&&e.classList.contains('active'));",
  /* Shell BACK chip, themed to this game (Tools/_shell/back.css). */
  backLabel: "BACK",
  backBg: "rgba(20,48,96,.88)",
  backFg: "#cfe4ff",
  backBd: "rgba(120,180,255,.55)",
  backR: "12px",
  patches: [
    [
      "bindTap(qs('#res-retry'),function(){qs('#confetti').innerHTML='';enterFullscreen();startMatch();});",
      "bindTap(qs('#res-retry'),function(){Studio.ads.interstitial(function(){qs('#confetti').innerHTML='';enterFullscreen();startMatch();});});"
    ],
    [
      "    <button class=\"btn btn-green btn-big\" id=\"btn-start\">START GAME</button>",
      "    <button class=\"btn\" id=\"setup-back\" style=\"margin-top:10px\">BACK</button>\n    <button class=\"btn btn-green btn-big\" id=\"btn-start\">START GAME</button>"
    ],
    [
      "bindTap(qs('#set-back'),function(){showScreen('scr-home');});",
      "bindTap(qs('#set-back'),function(){showScreen('scr-home');});\n bindTap(qs('#setup-back'),function(){showScreen('scr-home');});"
    ],
    [
      "function stickCorner(id){return id===0?'bl':id===1?'tl':id===2?'br':'tr';}",
      "/* Opposite sides per player: 0 left, 1 right, 2 left, 3 right. The old\n   bl/tl/br/tr mapping gave players 0 AND 1 the left edge, so in a 2-player game\n   both thumbs landed on the same side and fought each other. */\nfunction stickCorner(id){return id%2===0?'bl':'br';}"
    ],
    [
      "<input type=\"range\" id=\"set-sfx\" min=\"0\" max=\"100\" value=\"70\"><div class=\"set-val\" id=\"set-sfx-v\">70%</div>",
      "<div class=\"toggle on\" id=\"set-sfx\" role=\"switch\"></div><div></div>"
    ],
    [
      "var sfx=qs('#set-sfx'),mus=qs('#set-music');\n sfx.value=settings.sfx;mus.value=settings.music;\n qs('#set-sfx-v').textContent=settings.sfx+'%';qs('#set-music-v').textContent=settings.music+'%';",
      "var sfx=qs('#set-sfx'),mus=qs('#set-music');\n /* SFX is an on/off toggle now (it was a 0-100 slider), so it is read as a\n    class rather than a value. MUSIC keeps its slider. */\n mus.value=settings.music;\n qs('#set-sfx').classList.toggle('on',settings.sfx>0);\n qs('#set-music-v').textContent=settings.music+'%';"
    ],
    [
      " on(sfx,'input',function(){settings.sfx=+sfx.value;qs('#set-sfx-v').textContent=settings.sfx+'%';applyVolumes();saveSettings();});",
      " bindTap(sfx,function(){settings.sfx=settings.sfx>0?0:70;sfx.classList.toggle('on',settings.sfx>0);applyVolumes();saveSettings();Studio.pushSettings({sound:settings.sfx>0});});"
    ],
    [
      ".home-buttons .btn{width:100%;min-height:48px;padding:.4em 1em;font-size:clamp(13px,2.4vh,17px);border-radius:12px}",
      ".home-buttons .btn{width:100%;min-height:48px;padding:.4em 1em;font-size:clamp(13px,2.4vh,17px);border-radius:12px}\n /* SETTINGS pane scaled up - the three rows were cramped on a phone. */\n #scr-settings .screen-inner{padding:6vh 6vw}\n #scr-settings .scr-title{font-size:clamp(26px,6vh,44px);margin-bottom:3vh}\n #scr-settings .set-panel{gap:clamp(14px,3.2vh,26px);padding:clamp(16px,3.4vh,28px)}\n #scr-settings .set-row{min-height:clamp(56px,11vh,84px);font-size:clamp(17px,3.4vh,26px)}\n #scr-settings .set-val{font-size:clamp(15px,3vh,22px)}\n #scr-settings .toggle{width:clamp(58px,11vh,86px);height:clamp(32px,6vh,46px)}\n #scr-settings #set-back{margin-top:3vh;min-height:clamp(46px,9vh,64px);font-size:clamp(16px,3.2vh,24px)}"
    ],
  ],
  wiring: [
    "(function(){",
    "  var prev=window.Game||{};",
    "  /* Shell sound is a master switch here: the game's own SFX / music sliders keep",
    "     their own level, so neither side overwrites the other's slider. */",
    "  function applySettings(s){",
    "    if(!s) return;",
    "    try{",
    "      if(typeof s.sound==='boolean'){ muted=!s.sound; }",
    "      if(typeof s.haptics==='boolean'){ settings.vib=s.haptics; }",
    "      applyVolumes();",
    "      var c=document.getElementById('set-vib'); if(c) c.classList.toggle('on',!!settings.vib);",
    "    }catch(e){}",
    "  }",
    "  applySettings(Studio.settings);",
    "  /* Banner: board-type arena, so it rides under the board on the game screen. */",
    "  var want=false;",
    "  setInterval(function(){",
    "    var g=document.getElementById('scr-game');",
    "    var show=!!(g&&g.classList.contains('active')&&!paused);",
    "    if(show!==want){ want=show; Studio.ads.banner(show); }",
    "  },400);",
    "  window.Game=Object.assign({},prev,{",
    "    pause:function(){ if(prev.pause) try{ prev.pause(); }catch(e){} },",
    "    resume:function(){ if(prev.resume) try{ prev.resume(); }catch(e){} applySettings(Studio.settings); },",
    "    setMuted:function(m){ muted=!!m; applyVolumes(); },",
    "    setSettings:function(s){ applySettings(s); if(s) Studio.pushSettings({sound:s.sound,haptics:s.haptics}); }",
    "  });",
    "})();"
  ].join('\n')
},

/* ------------------------------------------------------------------ */
{
  id: 'ember',
  src: 'Ember.html',
  title: 'Ember',
  orientation: 'portrait',
  min: 1, max: 1, ai: 'none',
  color: '#ff8a3d',
  front: "var e=document.getElementById('scrHome'); return !!(e&&!e.classList.contains('off'));",
  /* Shell BACK chip, themed to this game (Tools/_shell/back.css). */
  backLabel: "BACK",
  backBg: "rgba(58,20,8,.88)",
  backFg: "#ffd9b0",
  backBd: "rgba(255,150,70,.55)",
  backR: "10px",
  patches: [
    [
      "  restart:startRun,",
      "  /* Rematch from the game-over panel (and restart from the pause panel) is\n     the break between runs. The intro NEW GAME button does NOT pay an ad. */\n  restart:()=>{Studio.ads.interstitial(function(){startRun();});},"
    ],
    [
      "  new:startRun,",
      "  new:()=>{Studio.ads.interstitial(function(){startRun();});},"
    ],
    [
      " '<div class=\"vtag\">v10</div>'+",
      ""
    ],
    [
      "  cont:()=>{if(!G.contUsed)continueRun();},",
      "  cont:()=>{ if(G.contUsed) return; Studio.ads.rewarded('continue', continueRun, ()=>{ Snd.click(); }); },"
    ]
  ],
  wiring: [
    "(function(){",
    "  var prev=window.Game||{};",
    "  function applySettings(s){",
    "    if(!s) return;",
    "    try{",
    "      if(typeof s.sound==='boolean'){ Snd.setMuted(!s.sound); }",
    "      if(typeof s.haptics==='boolean'){ hapOn=s.haptics; }",
    "      var a=document.getElementById('swSnd'); if(a) a.checked=!Snd.muted;",
    "      var b=document.getElementById('swHap'); if(b) b.checked=hapOn;",
    "    }catch(e){}",
    "  }",
    "  applySettings(Studio.settings);",
    "  /* Banner: single player, shown only while a run is actually flying. */",
    "  var want=false;",
    "  setInterval(function(){",
    "    var flying=(typeof curScreen==='undefined'||curScreen===null)&&!!(typeof G!=='undefined'&&G&&G.state==='play');",
    "    if(flying!==want){ want=flying; Studio.ads.banner(flying); }",
    "  },400);",
    "  window.Game={",
    "    pause:function(){ if(prev.pause) try{ prev.pause(); }catch(e){} },",
    "    resume:function(){ if(prev.resume) try{ prev.resume(); }catch(e){} applySettings(Studio.settings); },",
    "    setMuted:function(m){ Snd.setMuted(!!m); },",
    "    setSettings:function(s){ applySettings(s); if(s) Studio.pushSettings({sound:s.sound,haptics:s.haptics}); },",
    "    destroy:function(){ if(prev.destroy) try{ prev.destroy(); }catch(e){} }",
    "  };",
    "})();"
  ].join('\n')
},

/* ------------------------------------------------------------------ */
{
  id: 'orrery',
  src: 'orrery.html',
  title: 'Orrery',
  orientation: 'portrait',
  min: 1, max: 1, ai: 'none',
  color: '#d4af37',
  front: "var m=document.getElementById('menu'); return !!(m&&!m.classList.contains('hidden'));",
  /* Shell BACK chip, themed to this game (Tools/_shell/back.css). */
  backLabel: "BACK",
  backBg: "rgba(18,22,44,.88)",
  backFg: "#e8d9a0",
  backBd: "rgba(212,175,55,.55)",
  backR: "6px",
  patches: [
    [
      " $('btnRestart').addEventListener('click',e=>{e.currentTarget.blur();Snd.click();startRun();});",
      " $('btnRestart').addEventListener('click',e=>{e.currentTarget.blur();Snd.click();Studio.ads.interstitial(function(){startRun();});});"
    ],
    [
      " $('btnWatch').addEventListener('click',e=>{\n  e.currentTarget.blur();Snd.init();Snd.click();\n  /* TODO: replace with your rewarded-ad SDK call.\n     On a completed reward, invoke reviveRun() to continue the voyage. */\n  reviveRun();\n});\nfunction reviveRun(){\n  /* Rewarded-continue stub — wire your ad SDK's reward callback to this.\n     Suggested implementation: hide the over panel, push the Eclipse back\n     a safe distance (e.g. eclipseX = comet.x - 1200), revive the comet on\n     its last planet, and set state='play'. */\n}",
      " $('btnWatch').addEventListener('click',e=>{\n  e.currentTarget.blur();Snd.init();Snd.click();\n  Studio.ads.rewarded('continue',reviveRun,()=>{ Snd.click(); });\n});\nfunction reviveRun(){\n  /* Rewarded continue: the shell has confirmed the ad, so hand the run back. */\n  hide(overLayer);show(hudEl);\n  state='play';paused=false;freeze=0.2;deadT=0;overShown=false;\n  P.dead=false;P.vy=0;P.inv=2.2;P.y=clamp(P.y||H*0.45,70,930);\n  comet.mode='orbit';comet.planet=planets[planets.length-1]||comet.planet;\n  comet.radius=Math.max(comet.planet?comet.planet.r*1.4:160,140);\n  comet.angle=Math.atan2(P.y-comet.planet.y,P.x-comet.planet.x);comet.dir=1;\n  eclipseX=comet.x-ECLIPSE_START_GAP;\n  addPopup(comet.x,comet.y-60,'the voyage resumes','gold');\n  spawnGold(comet.x,comet.y,14);shake(4);\n  Snd.rekindle();Snd.haptic(20);\n}"
    ]
  ],
  wiring: [
    "(function(){",
    "  var prev=window.Game||{};",
    "  function applySettings(s){",
    "    if(!s) return;",
    "    try{",
    "      if(typeof s.sound==='boolean'){ Snd.setSfx(s.sound); }",
    "      if(typeof s.music==='boolean'){ Snd.setMusic(s.music); }",
    "      if(typeof s.haptics==='boolean'){ Snd.setHaptics(s.haptics); }",
    "      syncSettings();refreshSoundIcon();",
    "    }catch(e){}",
    "  }",
    "  applySettings(Studio.settings);",
    "  /* Banner: single player, only while the comet is actually in flight. */",
    "  var want=false;",
    "  setInterval(function(){",
    "    var show=(state==='play'&&!paused);",
    "    if(show!==want){ want=show; Studio.ads.banner(show); }",
    "  },400);",
    "  window.Game={",
    "    pause:function(){ if(prev.pause) try{ prev.pause(); }catch(e){} },",
    "    resume:function(){ if(prev.resume) try{ prev.resume(); }catch(e){} applySettings(Studio.settings); },",
    "    setMuted:function(m){ Snd.setMuted(!!m); refreshSoundIcon(); },",
    "    setSettings:function(s){ applySettings(s); if(s) Studio.pushSettings({sound:s.sound,music:s.music,haptics:s.haptics}); },",
    "    destroy:function(){ if(prev.destroy) try{ prev.destroy(); }catch(e){} }",
    "  };",
    "})();"
  ].join('\n')
},
/* ------------------------------------------------------------------ */
{
  id: 'sheepdog-trials',
  src: 'Sheepdog Trials.html',
  title: 'Sheepdog Trials',
  orientation: 'landscape',
  min: 1, max: 4, ai: 'none',
  color: '#7FA653',
  front: "var m=document.getElementById('ovMenu'); return !!(m&&!m.classList.contains('hidden'));",
  /* Shell BACK chip, themed to this game (Tools/_shell/back.css). */
  backLabel: "BACK",
  backBg: "rgba(38,46,22,.88)",
  backFg: "#dcecb0",
  backBd: "rgba(160,190,90,.55)",
  backR: "14px",
  patches: [
    [
      " $('btnNext').addEventListener('click', () => {\n   Sfx.click();\n   const next = cur + 1;\n   // Midgame/interstitial ad at the natural break after a completed trial.\n });",
      " $('btnNext').addEventListener('click', () => {\n   Sfx.click();\n   const next = cur + 1;\n   /* This handler used to stop here - it computed `next` and then did nothing,\n      so NEXT TRIAL never advanced a level. The interstitial is the natural\n      break after a completed trial, then the next trial actually starts. */\n   Studio.ads.interstitial(function () { startLevel(next); });\n });"
    ],
    [
      "/* CrazyGames/ads removed. Keep a no-op bridge so gameplay code remains compatible. */\nconst CrazyBridge = {\n  ready: false,\n  env: 'disabled',\n  init() { return Promise.resolve(false); },\n  loadingStop() {},\n  gameplayStart() {},\n  gameplayStop() {},\n  showBanner() {},\n  hideBanner() {},\n  requestMidgameAd(after) { if (typeof after === 'function') after(); }\n};\nCrazyBridge.init();",
      "/* The old no-op portal bridge is now the shell's Studio SDK. The game still\n   calls CrazyBridge.* everywhere, so those names are kept and simply routed:\n   gameplayStart/showBanner ask the shell for the banner strip (only for a solo\n   or two-dog table - a four-dog table is a crowded screen already), and\n   requestMidgameAd is the interstitial break. */\nconst CrazyBridge = {\n  ready: true,\n  env: 'shell',\n  bannerWanted() { return mode === 'solo' || mcount <= 2; },\n  init() { return Promise.resolve(false); },\n  loadingStop() {},\n  gameplayStart() { Studio.ads.banner(CrazyBridge.bannerWanted()); },\n  gameplayStop() { Studio.ads.banner(false); },\n  showBanner() { Studio.ads.banner(CrazyBridge.bannerWanted()); },\n  hideBanner() { Studio.ads.banner(false); },\n  requestMidgameAd(after) { Studio.ads.interstitial(function () { if (typeof after === 'function') after(); }); }\n};\nCrazyBridge.init();"
    ],
  ],
  wiring: [
    "(function(){",
    "  var prev=window.Game||{};",
    "  function applySettings(s){",
    "    if(!s) return;",
    "    try{",
    "      if(typeof s.sound==='boolean'){ save.muted=!s.sound; Sfx.setMute(save.muted); }",
    "      if(typeof s.haptics==='boolean'){ save.haptics=s.haptics; }",
    "      persist(); syncSettings();",
    "    }catch(e){}",
    "  }",
    "  applySettings(Studio.settings);",
    "  /* Only unpause on the way back if WE were the ones who paused it - a player",
    "     who paused deliberately must still find the game paused. */",
    "  var wePaused=false;",
    "  window.Game={",
    "    pause:function(){",
    "      try{ if(state==='play'&&!paused){ wePaused=true; setState('pause'); } }catch(e){}",
    "      if(prev.pause) try{ prev.pause(); }catch(e){}",
    "    },",
    "    resume:function(){",
    "      if(prev.resume) try{ prev.resume(); }catch(e){}",
    "      try{ if(wePaused){ wePaused=false; if(state==='pause') setState('play'); } }catch(e){}",
    "      applySettings(Studio.settings);",
    "    },",
    "    setMuted:function(m){ save.muted=!!m; persist(); Sfx.setMute(save.muted); },",
    "    setSettings:function(s){ applySettings(s); if(s) Studio.pushSettings({sound:s.sound,haptics:s.haptics}); },",
    "    destroy:function(){ if(prev.destroy) try{ prev.destroy(); }catch(e){} }",
    "  };",
    "})();"
  ].join('\n')
},
/* ------------------------------------------------------------------ */
{
  id: 'pool-8ball',
  src: '8 Ball Pool.html',
  title: '8 Ball Pool',
  orientation: 'landscape',
  min: 1, max: 2, ai: 'full',
  color: '#3f9a64',
  front: "var p=document.getElementById('p-home'); return !!(p&&p.classList.contains('active'));",
  /* Shell BACK chip, themed to this game (Tools/_shell/back.css). */
  backLabel: "BACK",
  backBg: "rgba(10,44,28,.88)",
  backFg: "#c9f0d8",
  backBd: "rgba(63,154,100,.55)",
  backR: "18px",
  patches: [
    [
      "$('#eAgain').addEventListener('click',press(()=>{startGame(mode,botDiff);}));",
      "$('#eAgain').addEventListener('click',press(()=>{Studio.ads.interstitial(function(){startGame(mode,botDiff);});}));"
    ],
    [
      "  /* plug a real ad SDK here later — for now unlock immediately */\n  btn.onclick=()=>{unlockTheme(i);openThemeInfo(i);};",
      "  /* a locked table is a rewarded unlock - nothing is granted without the ad */\n  btn.onclick=()=>{ Studio.ads.rewarded('table-'+i,()=>{unlockTheme(i);openThemeInfo(i);},()=>{ sfx.click(); buzz(8); }); };"
    ],
    [
      "$('#eHome').addEventListener('click',press(()=>{state='home';showPanel('p-home');}));",
      "$('#eHome').addEventListener('click',press(()=>{Studio.ads.interstitial(function(){state='home';showPanel('p-home');});}));"
    ]
  ],
  wiring: [
    "(function(){",
    "  var prev=window.Game||{};",
    "  function applySettings(s){",
    "    if(!s) return;",
    "    try{",
    "      if(typeof s.sound==='boolean'){ settings.sfx=s.sound; }",
    "      if(typeof s.music==='boolean'){ settings.music=s.music; }",
    "      if(typeof s.haptics==='boolean'){ settings.haptics=s.haptics; }",
    "      saveSet(); syncSw();",
    "      if(settings.music){ A.unlock(); Music.start(); } else { Music.stop(); }",
    "    }catch(e){}",
    "  }",
    "  applySettings(Studio.settings);",
    "  /* Banner: a two-player table, so the strip rides under the table while a",
    "     frame is actually being played. */",
    "  var want=false;",
    "  setInterval(function(){",
    "    var show=(panel==='p-game'&&!paused&&state!=='over');",
    "    if(show!==want){ want=show; Studio.ads.banner(show); }",
    "  },400);",
    "  var wePaused=false;",
    "  window.Game={",
    "    pause:function(){",
    "      try{ if((state==='aim'||state==='break'||state==='place')&&!paused){ wePaused=true; paused=true; } }catch(e){}",
    "      if(prev.pause) try{ prev.pause(); }catch(e){}",
    "    },",
    "    resume:function(){",
    "      if(prev.resume) try{ prev.resume(); }catch(e){}",
    "      try{ if(wePaused){ wePaused=false; paused=false; } }catch(e){}",
    "      applySettings(Studio.settings);",
    "    },",
    "    setMuted:function(m){ if(prev.setMuted) try{ prev.setMuted(m); }catch(e){} },",
    "    setSettings:function(s){ applySettings(s); if(s) Studio.pushSettings({sound:s.sound,music:s.music,haptics:s.haptics}); },",
    "    destroy:function(){ if(prev.destroy) try{ prev.destroy(); }catch(e){} }",
    "  };",
    "})();"
  ].join('\n')
},
/* ------------------------------------------------------------------ */
{
  id: 'midnight-overdrive',
  src: 'MidNightOverdrive.html',
  title: 'Midnight Overdrive',
  orientation: 'landscape',
  min: 1, max: 1, ai: 'none',
  color: '#ff8a3d',
  lib: 'Tools/_shell/three.global.js',
  front: "var m=document.getElementById('menu'); return !!(m&&!m.classList.contains('hidden'));",
  /* Shell BACK chip, themed to this game (Tools/_shell/back.css). */
  backLabel: "BACK",
  backBg: "rgba(42,16,58,.88)",
  backFg: "#ffb0d8",
  backBd: "rgba(255,79,154,.55)",
  backR: "22px",
  patches: [
    [
      "<script type=\"importmap\">\n{ \"imports\": { \"three\": \"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js\" } }\n</script>\n<script type=\"module\">\nimport * as THREE from 'three';",
      "<!-- three.js is inlined above as window.THREE (the shell is offline, so the\n     CDN import could never resolve on a device with no network). Same names,\n     same r160 build, no network. -->\n<script>\nconst THREE = window.THREE;"
    ],
    [
      "function toMenu(){\n  $('over').classList.add('hidden');",
      "function toMenu(){\n  /* back to the main menu is the interstitial break */\n  Studio.ads.interstitial(__toMenu);\n}\nfunction __toMenu(){\n  $('over').classList.add('hidden');"
    ],
    [
      " $('menuBtn').addEventListener('click',e=>{ e.stopPropagation(); toMenu(); });",
      " $('menuBtn').addEventListener('click',e=>{ e.stopPropagation(); toMenu(); });\n /* WATCH AD TO CONTINUE shipped with no handler at all: the continue button was\n    dead. A rewarded ad is now the only thing that hands the run back. */\n $('continueBtn').addEventListener('click',e=>{ e.stopPropagation();\n  Studio.ads.rewarded('continue',()=>{ window.__continueInvulnUntil=performance.now()+4000; restartRun(); },()=>{ AU.uiClick(); }); });"
    ],
    [
      "tick();\n</script>",
      "/* ---- shell wiring: this lives INSIDE the module on purpose, because AU and\n   store are module scope and the shell cannot see them from a classic script. */\nwindow.__shellMO = {\n  applySettings: function(s){\n    if(!s) return;\n    try{\n      if(typeof s.sound==='boolean'){ AU.setSfx(s.sound); }\n      if(typeof s.music==='boolean'){ AU.setMus(s.music); }\n      if(typeof s.haptics==='boolean'){ store.set('moVibration', s.haptics?'1':'0'); }\n      refreshToggles();\n    }catch(e){}\n  },\n  pause: function(){ try{ if(state==='playing'&&!paused){ paused=true; window.__shellMOBack=true; } }catch(e){} },\n  resume: function(){ try{ if(window.__shellMOBack){ window.__shellMOBack=false; paused=false; } }catch(e){} },\n  mute: function(m){ try{ AU.setSfx(!m); }catch(e){} }\n};\n\ntick();\n</script>"
    ]
  ],
  wiring: [
    "(function(){",
    "  var prev=window.Game||{};",
    "  var S=function(){ return window.__shellMO||{}; };",
    "  try{ S().applySettings(Studio.settings); }catch(e){}",
    "  window.Game={",
    "    pause:function(){ try{ S().pause(); }catch(e){} if(prev.pause) try{ prev.pause(); }catch(e){} },",
    "    resume:function(){ if(prev.resume) try{ prev.resume(); }catch(e){} try{ S().resume(); S().applySettings(Studio.settings); }catch(e){} },",
    "    setMuted:function(m){ try{ S().mute(m); }catch(e){} if(prev.setMuted) try{ prev.setMuted(m); }catch(e){} },",
    "    setSettings:function(s){ try{ S().applySettings(s); }catch(e){}",
    "      if(s) Studio.pushSettings({sound:s.sound,music:s.music,haptics:s.haptics});",
    "      if(prev.setSettings) try{ prev.setSettings(s); }catch(e){} },",
    "    destroy:function(){ if(prev.destroy) try{ prev.destroy(); }catch(e){} }",
    "  };",
    "})();"
  ].join('\n')
},

/* ------------------------------------------------------------------ */
/* ECHO removed from the catalogue: the shipped build had a defect that made
   it unplayable, and a corrected source is on its way from the author. Its
   entry is deliberately gone so the integrator cannot resurrect the old
   asset. Re-adding a game is one block here plus its tile. */

/* ------------------------------------------------------------------ */
{
  id: 'magnet-pull',
  src: 'MagnetChangeThePull.html',
  title: 'Magnet',
  orientation: 'portrait',
  min: 1, max: 1, ai: 'none',
  color: '#3de0c7',
  front: "var m=document.getElementById('s-menu'); return !!(m&&!m.classList.contains('off'));",
  backLabel: "BACK",
  backBg: "rgba(6,16,30,.9)",
  backFg: "#9be8db",
  backBd: "rgba(61,224,199,.5)",
  backR: "0px",
  patches: [
    [
      "  #mobile-orientation{\n    position:fixed;inset:0;z-index:1000;display:none;align-items:center;justify-content:center;",
      "  /* The shell's GameActivity locks the activity to the manifest orientation,\n     so this rotate-the-phone guard can only ever fight it - and it auto-pauses\n     the game whenever the ratio wobbles. Kept in the CSS, never shown. */\n  #mobile-orientation{\n    position:fixed;inset:0;z-index:1000;display:none!important;align-items:center;justify-content:center;"
    ],
    [
      "function requestPortraitLock(){\n  if(!isMobileDevice())return;",
      "function requestPortraitLock(){\n  /* No-op: the shell already locked the activity to portrait. A second lock()\n     from the WebView races it and can leave the game half-turned. */\n  if(!isMobileDevice())return;\n  return;"
    ],
    [
      "function setMuted(m){\n  muted=m;lsSet('magnet.muted',m?'1':'0');",
      "function setMuted(m){\n  muted=m;lsSet('magnet.muted',m?'1':'0');\n  /* The shell owns the master sound switch, so keep it in step both ways. */\n  Studio.pushSettings({sound:!m});"
    ],
    [
      "  completedRuns++;\n  rewardedUsed=false;\n  $('final-score').textContent=score;",
      "  completedRuns++;\n  /* The revive flag used to be reset here, so 'CONTINUE + WATCH AD' came back\n     every time the player died - including after a revive they had already\n     spent. The shell allows one revive per run, so once it is used the button\n     must stay gone for the rest of that run. startGame() clears the flag when a\n     genuinely new run begins, which is the only place it should clear. */\n  if(rewardedUsed)$('btn-watch-ad').style.display='none';\n  $('final-score').textContent=score;"
    ]
  ],
  wiring: [
    "(function(){",
    "  var prev=window.Game||{};",
    "  function applySettings(s){",
    "    if(!s) return;",
    "    try{",
    "      if(typeof s.sound==='boolean'){ setMuted(!s.sound); }",
    "    }catch(e){}",
    "  }",
    "  applySettings(Studio.settings);",
    "  /* Banner: single player, only while a run is live. */",
    "  var want=false;",
    "  setInterval(function(){",
    "    var show=(state==='play');",
    "    if(show!==want){ want=show; Studio.ads.banner(show); }",
    "  },400);",
    "  window.Game={",
    "    pause:function(){ try{ if(state==='play') pauseGame(); }catch(e){} if(prev.pause) try{ prev.pause(); }catch(e){} },",
    "    resume:function(){ try{ if(state==='pause') resumeGame(); }catch(e){} if(prev.resume) try{ prev.resume(); }catch(e){} applySettings(Studio.settings); },",
    "    setMuted:function(m){ try{ setMuted(!!m); }catch(e){} },",
    "    setSettings:function(s){ applySettings(s); if(s) Studio.pushSettings({sound:s.sound,haptics:s.haptics}); },",
    "    destroy:function(){ if(prev.destroy) try{ prev.destroy(); }catch(e){} }",
    "  };",
    "})();"
  ].join('\n')
},

/* ------------------------------------------------------------------ */
{
  id: 'kiro',
  src: 'Kiro.html',
  title: 'Kiro',
  orientation: 'landscape',
  min: 1, max: 1, ai: 'none',
  color: '#ff6b57',
  front: "var m=document.getElementById('menu'); return !!(m&&!m.classList.contains('hidden'));",
  backLabel: "BACK",
  backBg: "rgba(23,17,38,.9)",
  backFg: "#f6ead6",
  backBd: "rgba(255,107,87,.5)",
  backR: "999px",
  patches: [
    [
      "let isPortrait=false;\nfunction checkOrient(){\n  isPortrait=innerHeight>innerWidth*1.02;\n  $('rotate').classList.toggle('show',isPortrait);\n}",
      "let isPortrait=false;\nfunction checkOrient(){\n  /* The shell's GameActivity locks the activity to the manifest orientation\n     (landscape here), so Kiro can never actually be portrait. The old check\n     also blanked the game behind a full-screen 'ROTATE YOUR DEVICE' panel and\n     returned early from the frame loop whenever the ratio read as portrait -\n     which the shell's own layout pass can briefly do mid-rotation, freezing the\n     game. The check is kept (it still drives the overlay) but it no longer\n     gates the loop. */\n  isPortrait=false;\n  $('rotate').classList.remove('show');\n}"
    ],
    [
      "async function goLandscape(){\n  if(!isMobile)return false;",
      "async function goLandscape(){\n  /* No-op: the shell already locked the activity to landscape via the manifest.\n     Requesting fullscreen / an orientation lock from inside the WebView fights\n     the activity and leaves the game letterboxed.\n     Anchored to the CURRENT signature (`async`, `!isMobile`, returns false).\n     The old anchor used `function goLandscape(){ if(!isCoarse)return;` and\n     stopped matching when this game's source was replaced - the integrator\n     refused to build rather than shipping a half-patched game, which is the\n     behaviour we want. */\n  if(!isMobile)return false;\n  return false;"
    ],
    [
      "function toggleMute(){musicOn=!musicOn;",
      "function toggleMute(){musicOn=!musicOn;Studio.pushSettings({sound:!musicOn});"
    ],
    [
"  // TEST PLACEHOLDER: simulates a rewarded ad without any ad SDK.\n  const old=window.__testAdOverlay;\n  if(old)old.remove();\n  const ov=document.createElement('div');\n  ov.id='__testAdOverlay';\n  ov.style.cssText='position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.78);font-family:inherit;';\n  ov.innerHTML='<div style=\"width:min(86vw,420px);padding:28px 24px;border-radius:22px;background:#122844;border:2px solid rgba(255,255,255,.14);box-shadow:0 18px 60px rgba(0,0,0,.45);text-align:center;color:#fff\"><div style=\"font-size:24px;font-weight:900;letter-spacing:.08em\">REWARDED AD</div><div style=\"margin:10px 0 18px;opacity:.75;font-size:13px\">TEST PLACEHOLDER</div><div id=\"__testAdCount\" style=\"font-size:34px;font-weight:900;color:#ffd166\">2</div><div style=\"margin-top:8px;font-size:12px;opacity:.65\">Testing ad reward...</div></div>';\n  document.body.appendChild(ov);\n  let left=2;\n  const count=ov.querySelector('#__testAdCount');\n  const tick=setInterval(()=>{\n    left--;\n    if(left>0){count.textContent=left;return;}\n    clearInterval(tick);ov.remove();reward();\n  },1000);",
"  /* Real rewarded ad through the shell bridge.\n     This used to be a hand-rolled countdown that LOOKED like a rewarded ad\n     and granted the 2-hour skin trial on a timer whether or not an ad was\n     ever served - the same fake that shipped in Root.io. The bridge only\n     invokes the reward callback when it reports \"granted\", and returns a\n     separate \"unavailable\" token when no ad could be served at all, so a\n     genuine fill failure is not mistaken for the player backing out. */\n  if(window.__kiroAdBusy)return;\n  window.__kiroAdBusy=true;\n  var released=function(){window.__kiroAdBusy=false;};\n  Studio.ads.rewarded('kiro.shop.skin_trial',\n    function(){ released(); reward(); },\n    function(why){ released(); banner(why==='unavailable'?'AD UNAVAILABLE':'AD SKIPPED'); });"
    ],
    [
"function backMenu(){state='menu';",
"function backMenu(){state='menu';\n  /* Interstitial on the way back to the main menu: the one moment that is a\n     real session break rather than an interruption mid-play. This is only a\n     REQUEST. AdPolicy owns frequency, so inside the first-session grace\n     window, before the minimum gap, or after the once-per-session cap the\n     shell answers \"cooldown\" and nothing is shown. */\n  Studio.ads.interstitial('kiro.menu.return');"
    ]
  ],
  wiring: [
    "(function(){",
    "  var prev=window.Game||{};",
    "  function applySettings(s){",
    "    if(!s) return;",
    "    try{",
    "      if(typeof s.sound==='boolean'){",
    "        /* Kiro's audio was reworked: `musicOn` gates music, `muted` gates",
    "           everything else, and applyAudioVolumes() fans both out to the gain",
    "           nodes. The old wiring poked master.gain directly and referred to a",
    "           `muted`-only model that no longer matches the source. Driving the",
    "           game's own helpers keeps its on-screen mute icon honest and means",
    "           we never fight applyAudioVolumes with a half-applied state. */",
    "        muted=!s.sound;",
    "        musicOn=!!s.sound;",
    "        applyAudioVolumes();",
    "        try{updateAudioUI();}catch(e){}",
    "      }",
    "    }catch(e){}",
    "  }",
    "  applySettings(Studio.settings);",
    "  /* Banner: single player, only while a level is actually being played. */",
    "  var want=false;",
    "  setInterval(function(){",
    "    var show=(state==='play');",
    "    if(show!==want){ want=show; Studio.ads.banner(show); }",
    "  },400);",
    "  window.Game={",
    "    pause:function(){ try{ if(state==='play') togglePause(); }catch(e){} if(prev.pause) try{ prev.pause(); }catch(e){} },",
    "    resume:function(){ try{ if(state==='pause') togglePause(); }catch(e){} if(prev.resume) try{ prev.resume(); }catch(e){} applySettings(Studio.settings); },",
    "    setMuted:function(m){ try{ muted=!!m; musicOn=!m; applyAudioVolumes(); try{updateAudioUI();}catch(e){} }catch(e){} },",
    "    setSettings:function(s){ applySettings(s); if(s) Studio.pushSettings({sound:s.sound,haptics:s.haptics}); },",
    "    destroy:function(){ if(prev.destroy) try{ prev.destroy(); }catch(e){} }",
    "  };",
    "})();"
  ].join('\n')
},

/* ------------------------------------------------------------------ */
{
  id: 'root-io',
  src: 'Root.io.html',
  title: 'Root.io',
  orientation: 'portrait',
  min: 1, max: 1, ai: 'true',
  color: '#8fbf6a',
  front: "var m=document.getElementById('menu'); return !!(m&&!m.classList.contains('hidden'));",
  backLabel: "BACK",
  backBg: "rgba(24,16,9,.92)",
  backFg: "#e9c98a",
  backBd: "rgba(232,176,75,.5)",
  backR: "12px",
  patches: [
    [
      "async function enterMobileFullscreen(){\n  if(!IS_TOUCH)return;",
      "/* The shell's GameActivity locks the manifest orientation, so asking for\n   fullscreen and an orientation lock from inside the WebView only fights the\n   activity and leaves the game letterboxed. Now a no-op. */\nasync function enterMobileFullscreen(){\n  if(!IS_TOUCH)return;\n  return;"
    ],
    [
      "function maintainPortrait(){\n  if(!IS_TOUCH)return;",
      "function maintainPortrait(){\n  /* The shell owns the orientation; this only needs to re-fit the canvas. */\n  if(!IS_TOUCH)return;"
    ],
    [
      "showOnly('menu');\nrequestAnimationFrame(frame);\n})();",
      "  /* ---- shell wiring handle ----\n     Everything here lives inside the IIFE, so the shell's classic wiring script\n     cannot see `save`, `A`, `STATE`, `pauseGame` or `writeSave` at all. Without\n     this handle the shell's settings never reached the game, and every\n     reference in the wiring threw on every settings change. */\n  window.__shellRoot={\n    applySettings:function(s){\n      if(!s) return;\n      try{\n        if(typeof s.sound==='boolean'){\n          save.sound=s.sound;\n          if(A.master&&A.ctx)A.master.gain.setTargetAtTime(save.sound?0.5:0,A.ctx.currentTime,.015);\n        }\n        writeSave();refreshToggles();\n      }catch(e){}\n    },\n    playing:function(){ return STATE==='PLAYING'; },\n    pause:function(){ pauseGame(); },\n    resume:function(){ resumeGame(); },\n    mute:function(m){\n      save.sound=!m; writeSave(); refreshToggles();\n      if(A.master&&A.ctx)A.master.gain.setTargetAtTime(save.sound?0.5:0,A.ctx.currentTime,.015);\n    }\n  };\n  showOnly('menu');\nrequestAnimationFrame(frame);\n})();"
    ]
  ],
  wiring: [
    "(function(){",
    "  var prev=window.Game||{};",
    "  var R=function(){ return window.__shellRoot||{}; };",
    "  try{ R().applySettings(Studio.settings); }catch(e){}",
    "  /* Banner: solo, and only while a run is alive. */",
    "  var want=false;",
    "  setInterval(function(){",
    "    var show=false;",
    "    try{ show=R().playing(); }catch(e){}",
    "    if(show!==want){ want=show; Studio.ads.banner(show); }",
    "  },400);",
    "  window.Game={",
    "    pause:function(){ try{ R().pause(); }catch(e){} if(prev.pause) try{ prev.pause(); }catch(e){} },",
    "    resume:function(){ try{ R().resume(); }catch(e){} if(prev.resume) try{ prev.resume(); }catch(e){} try{ R().applySettings(Studio.settings); }catch(e){} },",
    "    setMuted:function(m){ try{ R().mute(!!m); }catch(e){} },",
    "    setSettings:function(s){ try{ R().applySettings(s); }catch(e){}",
    "      if(s) Studio.pushSettings({sound:s.sound,haptics:s.haptics});",
    "      if(prev.setSettings) try{ prev.setSettings(s); }catch(e){} },",
    "    destroy:function(){ if(prev.destroy) try{ prev.destroy(); }catch(e){} }",
    "  };",
    "})();"
  ].join('\n')
}
];
