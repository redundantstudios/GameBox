'use strict';
const fs = require('fs');
const f = 'app/src/main/assets/games/chinese-checkers/index.html';
let s = fs.readFileSync(f, 'utf8');
const before = s;

const swap = (from, to, label) => {
  if (from instanceof RegExp) {
    if (!from.test(s)) { console.log('MISS ' + label); return; }
    s = s.replace(from, to);
    console.log('OK   ' + label);
    return;
  }
  if (!s.includes(from)) { console.log('MISS ' + label); return; }
  s = s.replace(from, to);
  console.log('OK   ' + label);
};

/* ---- 1. BACK on the start page ----
   Every other screen had a way out; the home screen only had PLAY. The shell
   already injects #studioBack for this, but it is invisible here because the
   home screen has no wiring for it, so the game draws its own. */
swap(
  "  <div class=\"studio\">REDUNDANT&nbsp;STUDIOS</div>",
  "  <button id=\"btnBack\" class=\"iconbtn\" aria-label=\"Back\" style=\"position:absolute;top:calc(10px + env(safe-area-inset-top));left:calc(10px + env(safe-area-inset-left))\">\n" +
  "    <svg viewBox=\"0 0 16 16\"><path d=\"M10.5 2 5 8l5.5 6 1.6-1.5L8 8l4.1-4.5z\"/></svg>\n" +
  "  </button>\n" +
  "  <div class=\"studio\">REDUNDANT&nbsp;STUDIOS</div>",
  'back button markup');

/* ---- 2. Ads + banner + auto path ---- */
const SHIM = `
/* ============================================================
   SHELL INTEGRATION
   Ads, banner, settings and lifecycle. Nothing above this line
   knows the shell exists.
   ============================================================ */
(function(){
  var B=window.NativeBridge;
  /* Save/load go to the shell so progress survives a data clear and follows the
     player's account; localStorage is the fallback for a plain tab. LS is a
     const object, so its METHODS are overridden in place - assigning the
     binding itself is a TypeError. */
  if(B){
    if(!B.save)B.save=function(k,v){try{return localStorage.setItem(k,v)}catch(e){}};
    if(!B.load)B.load=function(k){try{return localStorage.getItem(k)}catch(e){return null}};
  }
  var _get=LS.get,_set=LS.set,_del=LS.del;
  LS.get=function(k,d){
    var v=null;
    try{v=(B&&B.load)?B.load(k):_get(k,null)}catch(e){v=_get(k,null)}
    if(v==null||v==='')return d;
    try{return JSON.parse(v)}catch(e){return d}
  };
  LS.set=function(k,v){var j=JSON.stringify(v);try{if(B&&B.save)B.save(k,j);else _set(k,v)}catch(e){}};
  LS.del=function(k){try{if(B&&B.del)B.del(k);else _del(k)}catch(e){}};

  /* INTERSTITIAL. showInterstitial takes (callbackName, placement) - two
     arguments, matched by arity - so the name has to exist on window or the
     shell fires into the void and the button looks dead. Each request gets its
     own name: one shared global was how two overlapping requests overwrote each
     other and a callback ran against the wrong action. */
  var interSeq=0;
  function interstitial(cb,placement){
    if(!B||!B.showInterstitial){if(cb)cb();return}
    var name='__studioInterCb'+(++interSeq);
    window[name]=function(r){try{delete window[name]}catch(e){} if(cb)cb(r)};
    try{B.showInterstitial(name,placement||'chinesecheckers')}catch(e){try{delete window[name]}catch(_){} if(cb)cb()}
  }
  /* One guard for the game-over ad, so finishing raises exactly one and the
     buttons underneath are free to ask without doubling up. */
  var overAdDone=false;

  var prevBanner=false;
  function banner(on){
    if(on===prevBanner)return; prevBanner=on;
    try{if(B){ if(on){if(B.showBanner)B.showBanner()}else{if(B.hideBanner)B.hideBanner()} }}catch(e){}
  }

  if(typeof Studio==='undefined'){
    window.Studio={
      settings:{sound:settings.sfx,music:settings.music,haptics:settings.haptics,volume:GAME_VOL,
                preset:(Q.get('preset')||'classic'),haptic:(Q.get('haptic')||'off')},
      pushSettings:function(){},
      save:function(k,v){return LS.set(k,v)},
      load:function(k){return LS.get(k,null)},
      exit:function(){try{if(B&&B.exitGame)B.exitGame()}catch(e){}},
      ads:{interstitial:interstitial,banner:banner,
           rewarded:function(placement,ok,fail){
             if(!B||!B.showRewardedAd){if(ok)ok('unavailable');return}
             var name='__studioRwCb'+(++interSeq);
             window[name]=function(r){try{delete window[name]}catch(e){}
               if(r==='granted'||r===true){if(ok)ok(r)}else if(fail)fail(r)};
             try{B.showRewardedAd(name,placement||'chinesecheckers.unlock',null)}catch(e){if(ok)ok('unavailable')}
           }}
    };
  }

  /* BANNER: up only while a board is live, gone for the menus, setup, tutorial,
     pause and results. */
  var bOn=false;
  function syncBanner(){
    var on=!!(G&&G.phase!=='over'&&!G.paused&&!tut.on&&currentScreenIsGame());
    if(on===bOn)return; bOn=on; banner(on);
  }
  function currentScreenIsGame(){
    return !($('scrHome').classList.contains('hidden')||$('scrSetup').classList.contains('hidden')
      ||$('ovTut').classList.contains('hidden')===false&&tut.on
      ||$('ovPause').classList.contains('hidden')===false&&G&&G.paused
      ||$('ovWin').classList.contains('hidden')===false);
  }

  /* ADS ON THE BUTTONS THAT END A RUN.
     RESUME is deliberately ad-free - it is not a break, and charging for it
     punishes a tap the player had to make to keep playing. Exiting the app is
     ad-free too: AdMob disallows an interstitial on exit. */
  function wireAds(){
    var p=$('btnResumeG'),rs=$('btnRestart'),hm=$('btnHomeP'),
        ag=$('btnAgain'),wh=$('btnWinHome');
    if(p)p.onclick=function(){SFX.click();resumeGame()};
    if(rs)rs.onclick=function(){SFX.click();hide($('ovPause'));G.paused=false;
      interstitial(function(){banner(false);bOn=false;restartGame()},'chinesecheckers.pause.restart')};
    if(hm)hm.onclick=function(){SFX.click();
      interstitial(function(){banner(false);bOn=false;showHome()},'chinesecheckers.pause.home')};
    if(ag)ag.onclick=function(){SFX.click();
      interstitial(function(){banner(false);bOn=false;restartGame()},'chinesecheckers.win.again')};
    if(wh)wh.onclick=function(){SFX.click();
      interstitial(function(){banner(false);bOn=false;showHome()},'chinesecheckers.win.home')};
  }

  /* AUTO PATH FROM THE PLAYER COUNT.
     The shell can launch straight into a game with a chosen player count. When
     it does, the setup screens are stepped through for the player instead of
     making them tap through them - land on the start page with the count
     already chosen. A count the board cannot seat is ignored and the normal
     menus are used, rather than starting something the game does not support.

     ModeActivity always sends "pass" with a preselected count (see
     launchGame/preselect), so that value has to be understood here or the
     auto path never fires at all - the request looks well formed and is simply
     dropped. The game's own two modes are bot and friends. */
  function autoPath(){
    var n=parseInt(Q.get('players')||'0',10);
    if(!n)return false;
    if(!(n in SEATS))return false;
    var raw=(Q.get('mode')||'').toLowerCase();
    var mode=(raw==='pass'||raw==='friends')?'friends':(raw==='bot'?'bot':null);
    if(!mode)return false;
    var cfg={mode:mode,team:false,count:n,diff:1};
    setTimeout(function(){try{initializeGame(cfg)}catch(e){}},60);
    return true;
  }

  /* LIFECYCLE. The shell pauses and resumes the screen; the game owns its own
     loop and its own audio context. */
  window.Game={
    pause:function(){try{if(G&&G.phase!=='over')pauseGame()}catch(e){}},
    resume:function(){try{if(G&&G.paused&&G.phase!=='over')resumeGame()}catch(e){}},
    setMuted:function(m){try{
      if(ACTX){const v=m?0:GAME_VOL;sfxG.gain.value=settings.sfx?v:0;musG.gain.value=settings.music?v:0}
    }catch(e){}},
    setSettings:function(st){try{
      if(!st)return;
      if(typeof st.sound==='boolean'){settings.sfx=st.sound;settings.music=st.sound}
      if(typeof st.music==='boolean')settings.music=st.music;
      if(typeof st.haptics==='boolean')settings.haptics=st.haptics;
      if(typeof st.volume==='number')GAME_VOL=Math.max(0,Math.min(1,st.volume));
      applyAudioSettings();
      ['music','sfx','haptics'].forEach(function(k,i){
        var el=['setMusic','setSfx','setHaptics'][i];
        if($(el)){$(el).textContent=settings[k]?'ON':'OFF';$(el).classList.toggle('off',!settings[k])}
      });
    }catch(e){}},
    destroy:function(){try{Music.stop();bOn=false;banner(false)}catch(e){}}
  };

  document.addEventListener('pointerdown',function(){try{syncBanner()}catch(e){}});
  document.addEventListener('visibilitychange',function(){
    try{if(document.hidden){bOn=false;banner(false)}else syncBanner()}catch(e){}
  });

  document.addEventListener('DOMContentLoaded',function(){
    wireAds();
    var bk=$('btnBack');
    if(bk)bk.onclick=function(){SFX.click();try{if(B&&B.exitGame)B.exitGame()}catch(e){}};
    try{syncBanner()}catch(e){}
  });
})();
`;

if (!/SHELL INTEGRATION/.test(s)) {
  const re = /requestAnimationFrame\(loop\);\r?\n<\/script>/;
  if (re.test(s)) {
    s = s.replace(re, 'requestAnimationFrame(loop);\n' + SHIM + '\n</script>');
    console.log('OK   shell integration block added');
  } else {
    console.log('MISS integration anchor');
  }
}

/* The banner also has to follow the game's own screen changes, not just taps. */
swap(
  /showGame\(\)\{hide\(\$\('scrHome'\)\);hide\(\$\('scrSetup'\)\);show\(\$\('hud'\)\);hideEnd\(\);G\.paused=false\}/,
  "showGame(){hide($('scrHome'));hide($('scrSetup'));show($('hud'));hideEnd();G.paused=false;try{syncBanner()}catch(e){}}",
  'showGame syncs banner');
swap(
  /show\(\$\('scrHome'\)\);refreshHome\(\);\r?\n\}/,
  "show($('scrHome'));refreshHome();\n  try{syncBanner()}catch(e){}\n}",
  'showHome syncs banner');

fs.writeFileSync(f, s);

const checks = {
  'manifest': /STUDIO_GAME_MANIFEST/.test(s) && /id: chinese-checkers/.test(s),
  'banner opted in': /banner: bottom/.test(s),
  'back button': /id="btnBack"/.test(s) && /btn\.onclick/.test(s),
  'ads wired': /chinesecheckers\.pause\.restart/.test(s) && /chinesecheckers\.win\.home/.test(s),
  'game-over flag': /var overAdDone=false;/.test(s),
  'auto path': /function autoPath\(\)/.test(s) && /SEATS/.test(s),
  'settings live': /setSettings:function\(st\)/.test(s),
  'shell-owned volume': /GAME_VOL/.test(s),
  'lifecycle': /window\.Game=\{/.test(s) && /destroy:function/.test(s),
};
Object.entries(checks).forEach(([k, v]) => console.log((v ? 'OK   ' : 'MISS ') + k));
console.log('changed:', s !== before);