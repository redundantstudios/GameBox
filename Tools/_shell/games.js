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
  patches: [
    [
      "function startMatch(){\n buildWorld(false);",
      "function startMatch(){\n  /* a new match is the interstitial break; the shell always answers */\n  Studio.ads.interstitial(__startMatch);\n}\nfunction __startMatch(){\n buildWorld(false);"
    ],
    [
      "bindTap(qs('#res-menu'),function(){showScreen('scr-home');});",
      "bindTap(qs('#res-menu'),function(){Studio.ads.interstitial(function(){showScreen('scr-home');});});"
    ]
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
  patches: [
    [
      "function startRun(){\n  resetWorld();",
      "function startRun(){\n  /* new run = the interstitial break */\n  Studio.ads.interstitial(__startRun);\n}\nfunction __startRun(){\n  resetWorld();"
    ],
    [
      "function goHome(){\n  resetWorld();",
      "function goHome(){\n  /* back to the main menu = the interstitial break */\n  Studio.ads.interstitial(function(){ __goHome(); });\n}\nfunction __goHome(){\n  resetWorld();"
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
  patches: [
    [
      "function startRun(){\n  initRun();",
      "function startRun(){\n  /* a new voyage is the interstitial break */\n  Studio.ads.interstitial(__startRun);\n}\nfunction __startRun(){\n  initRun();"
    ],
    [
      "function toMenu(){\n  Tut.active&&Tut.finish(false); /* leaving mid-lesson: it will return next voyage */\n  setupMenu();",
      "function toMenu(){\n  Studio.ads.interstitial(function(){\n  Tut.active&&Tut.finish(false); /* leaving mid-lesson: it will return next voyage */\n  setupMenu();"
    ],
    [
      "  hide(pauseLayer);hide(overLayer);hide(tutLayer);hide(setLayer);hide(hudEl);hide(tutBannerEl);show(menuLayer);\n}",
      "  hide(pauseLayer);hide(overLayer);hide(tutLayer);hide(setLayer);hide(hudEl);hide(tutBannerEl);show(menuLayer);\n  });\n}"
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
  patches: [
    [
      "/* CrazyGames/ads removed. Keep a no-op bridge so gameplay code remains compatible. */\nconst CrazyBridge = {\n  ready: false,\n  env: 'disabled',\n  init() { return Promise.resolve(false); },\n  loadingStop() {},\n  gameplayStart() {},\n  gameplayStop() {},\n  showBanner() {},\n  hideBanner() {},\n  requestMidgameAd(after) { if (typeof after === 'function') after(); }\n};\nCrazyBridge.init();",
      "/* The old no-op portal bridge is now the shell's Studio SDK. The game still\n   calls CrazyBridge.* everywhere, so those names are kept and simply routed:\n   gameplayStart/showBanner ask the shell for the banner strip (only for a solo\n   or two-dog table - a four-dog table is a crowded screen already), and\n   requestMidgameAd is the interstitial break. */\nconst CrazyBridge = {\n  ready: true,\n  env: 'shell',\n  bannerWanted() { return mode === 'solo' || mcount <= 2; },\n  init() { return Promise.resolve(false); },\n  loadingStop() {},\n  gameplayStart() { Studio.ads.banner(CrazyBridge.bannerWanted()); },\n  gameplayStop() { Studio.ads.banner(false); },\n  showBanner() { Studio.ads.banner(CrazyBridge.bannerWanted()); },\n  hideBanner() { Studio.ads.banner(false); },\n  requestMidgameAd(after) { Studio.ads.interstitial(function () { if (typeof after === 'function') after(); }); }\n};\nCrazyBridge.init();"
    ],
    [
      "function startLevel(i) {\n  buildLevel(i); setState('play');",
      "function startLevel(i) {\n  /* a new trial is the interstitial break */\n  Studio.ads.interstitial(function () { __startLevel(i); });\n}\nfunction __startLevel(i) {\n  buildLevel(i); setState('play');"
    ],
    [
      "function toMenu() {\n  mode = 'solo';",
      "function toMenu() {\n  /* back to the main menu is the interstitial break */\n  Studio.ads.interstitial(function () { __toMenu(); });\n}\nfunction __toMenu() {\n  mode = 'solo';"
    ]
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
  patches: [
    [
      "function startGame(m,d){\n mode=m;if(d)botDiff=d;",
      "function startGame(m,d){\n /* a new frame is the interstitial break */\n Studio.ads.interstitial(function(){ __startGame(m,d); });\n}\nfunction __startGame(m,d){\n mode=m;if(d)botDiff=d;"
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
  patches: [
    [
      "<script type=\"importmap\">\n{ \"imports\": { \"three\": \"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js\" } }\n</script>\n<script type=\"module\">\nimport * as THREE from 'three';",
      "<!-- three.js is inlined above as window.THREE (the shell is offline, so the\n     CDN import could never resolve on a device with no network). Same names,\n     same r160 build, no network. -->\n<script>\nconst THREE = window.THREE;"
    ],
    [
      "function startGame(){\n  if(state!=='menu') return;",
      "function startGame(){\n  if(state!=='menu') return;\n  /* first drive of a run = the interstitial break */\n  Studio.ads.interstitial(__startGame);\n}\nfunction __startGame(){"
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
}

];
