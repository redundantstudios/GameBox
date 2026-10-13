'use strict';
const fs = require('fs');
const path = require('path');

/* One shell block, applied to three standalone games. Everything they share:
   Studio (save/load/haptic/settings/ads/exit), the Game lifecycle the shell
   drives, banner and ad helpers, and a back button that only exists on the
   start screen. Per-game config supplies the manifest and the placements. */

const GAMES = [
  {
    id: 'knot-away',
    src: 'sources/Playable Games/knot Away.html',
    manifest: {
      title: 'Knot Away', orientation: 'portrait',
      minPlayers: 1, maxPlayers: 1, aiSupport: 'none',
      tileColor: '#3B6EA5', banner: 'bottom', bannerBg: '#1b2733',
    },
    art: ['knot_away_tile_img.jpeg', 'tile_knot_away.jpg'],
    home: 'home', game: 'game',
  },
  {
    id: 'carroms',
    src: 'sources/Playable Games/carromsNew.html',
    manifest: {
      title: 'Carroms', orientation: 'portrait',
      minPlayers: 2, maxPlayers: 6, aiSupport: 'full',
      tileColor: '#2E7D32', banner: 'bottom', bannerBg: '#12301a',
    },
    art: ['carrom_tile_img.png', 'tile_carroms.png'],
    home: 'home', game: 'table',
  },
  {
    id: 'truth-or-dare',
    src: 'sources/Playable Games/truthOrDare.html',
    manifest: {
      title: 'Truth or Dare', orientation: 'portrait',
      minPlayers: 2, maxPlayers: 8, aiSupport: 'none',
      tileColor: '#8E24AA', banner: 'bottom', bannerBg: '#2a1338',
    },
    art: ['truth_or_dare_tile_img.png', 'tile_truth_or_dare.png'],
    home: 'title', game: 'play',
  },
];

const SHELL = (home, game) => `
<!-- ================= SHELL INTEGRATION ================= -->
<script>
(function(){
  var B=window.NativeBridge;
  if(!B)return;
  var HOME='${home}', GAME='${game}';

  /* ---------- storage ----------
     The shell owns save/load so progress survives a data clear. LS is a const
     object in some of these games, so where it exists its METHODS are replaced
     rather than the binding. */
  function shGet(k,d){
    var v=null;
    try{ v=B.load(k); }catch(e){ v=null; }
    if(v==null||v==='')return d;
    try{ return JSON.parse(v); }catch(e){ return d; }
  }
  function shSet(k,v){ try{ B.save(k,JSON.stringify(v)); }catch(e){} }
  window.__shellSave=shGet; window.__shellSet=shSet;

  /* ---------- settings ----------
     The query string the shell appends is the source of truth at boot; the
     shell pushes live changes through Game.setSettings. The vol value arrives
     on a 0-100 scale and is normalised to 0-1. */
  var Q=new URLSearchParams(location.search);
  function qnum(k,d){ var v=Q.get(k); if(v==null)return d; var n=parseFloat(v); return isNaN(n)?d:(n>1?n/100:n); }
  var settings={
    sound: Q.get('sound')==null?true:Q.get('sound')==='1',
    music:  Q.get('sound')==null?true:Q.get('sound')==='1',
    haptics:Q.get('vibe')==null?true:Q.get('vibe')==='1',
    volume: qnum('vol',1),
    preset: Q.get('preset')||'classic',
    haptic: Q.get('haptic')||'off'
  };

  /* ---------- ads ----------
     showInterstitial takes (callbackName, placement) - matched by EXACT arity -
     and the name must exist on window or the shell fires into the void and the
     button looks dead. Each request gets its own name: one shared global was
     how two overlapping requests overwrote each other. */
  var seq=0;
  function ad(cb,placement){
    if(!B.showInterstitial){ if(cb)cb(); return; }
    var n='__shellInterCb'+(++seq);
    window[n]=function(){ try{delete window[n]}catch(e){} if(cb)cb(); };
    try{ B.showInterstitial(n,placement||'break'); }
    catch(e){ try{delete window[n]}catch(_){} if(cb)cb(); }
  }
  function rewarded(placement,ok,fail){
    if(!B.showRewardedAd){ if(fail)fail(); return; }
    var n='__shellRwCb'+(++seq);
    window[n]=function(r){ try{delete window[n]}catch(e){}
      if(r==='granted'||r===true){ if(ok)ok(r); } else if(fail)fail(r); };
    try{ B.showRewardedAd(n,placement||'reward','NORMAL'); }
    catch(e){ try{delete window[n]}catch(_){} if(fail)fail(); }
  }

  /* ---------- banner: game page only ----------
     Driven by __shellScreen, which each game's own screen entry points set. */
  var bOn=false;
  function banner(on){
    if(on===bOn)return; bOn=on;
    try{ if(on){ if(B.showBanner)B.showBanner(); } else { if(B.hideBanner)B.hideBanner(); } }catch(e){}
  }
  window.__shellScreenSync=function(){
    try{ banner(window.__shellScreen===GAME && !window.__shellBlocked); }catch(e){}
  };
  window.__shellBlock=function(on){ window.__shellBlocked=!!on; window.__shellScreenSync(); };

  /* ---------- Studio ---------- */
  window.Studio = window.Studio || {};
  Studio.settings=settings;
  Studio.save=shSet; Studio.load=shGet;
  Studio.exit=function(){ try{ if(B.exitGame)B.exitGame(); }catch(e){} };
  Studio.haptic=function(kind){
    if(!settings.haptics)return;
    var m={light:12,medium:28,heavy:55,success:40};
    try{ if(B.haptic)B.haptic(m[kind]!=null?m[kind]:0); }catch(e){}
  };
  Studio.ads={ interstitial:ad, rewarded:rewarded, banner:function(on){ banner(!!on); },
               showBanner:function(){banner(true);}, hideBanner:function(){banner(false);} };

  /* ---------- back button, start screen only ---------- */
  try{
    var btn=document.createElement('button');
    btn.setAttribute('aria-label','Back');
    btn.style.cssText='position:fixed;z-index:9998;top:calc(10px + env(safe-area-inset-top));'+
      'left:calc(10px + env(safe-area-inset-left));width:42px;height:42px;border-radius:50%;'+
      'border:1px solid rgba(0,0,0,.25);background:rgba(255,255,255,.92);color:#222;'+
      'font-size:20px;line-height:1;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.25);display:none';
    btn.innerHTML='&#8249;';
    btn.onclick=function(){ try{ if(B.exitGame)B.exitGame(); }catch(e){} };
    var attach=function(){
      if(!btn.parentNode)document.body.appendChild(btn);
    };
    if(document.body)attach(); else document.addEventListener('DOMContentLoaded',attach);
    window.__shellBackBtn=btn;
  }catch(e){}

  /* ---------- lifecycle ---------- */
  window.Game={
    pause:function(){ try{ window.__shellPaused=true; }catch(e){} },
    resume:function(){ try{ window.__shellPaused=false; }catch(e){} },
    setMuted:function(m){ settings.sound=!m; settings.music=!m; },
    setSettings:function(st){
      try{
        if(!st)return;
        if(typeof st.sound==='boolean'){ settings.sound=st.sound; settings.music=st.sound; }
        if(typeof st.haptics==='boolean') settings.haptics=st.haptics;
        if(typeof st.volume==='number') settings.volume=st.volume>1?st.volume/100:st.volume;
      }catch(e){}
    },
    destroy:function(){ try{ banner(false); }catch(e){} }
  };

  /* Polled, so the strip and the back button follow whatever the game's own
     screens do without every one of them having to be edited. */
  setInterval(function(){
    try{
      var sc=window.__shellScreen;
      window.__shellScreenSync();
      if(window.__shellBackBtn){
        var onHome=(sc===HOME);
        window.__shellBackBtn.style.display=onHome?'block':'none';
      }
    }catch(e){}
  },400);

  window.__shellAd=ad;
  window.__shellRewarded=rewarded;
})();
</script>
`;

for (const g of GAMES) {
  let s = fs.readFileSync(g.src, 'utf8');
  const out = path.join('app/src/main/assets/games', g.id, 'index.html');

  if (!/STUDIO_GAME_MANIFEST/.test(s)) {
    s = s.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n<!--\nSTUDIO_GAME_MANIFEST\n' +
      'id: ' + g.id + '\n' +
      'title: ' + g.manifest.title + '\n' +
      'orientation: ' + g.manifest.orientation + '\n' +
      'minPlayers: ' + g.manifest.minPlayers + '\n' +
      'maxPlayers: ' + g.manifest.maxPlayers + '\n' +
      'aiSupport: ' + g.manifest.aiSupport + '\n' +
      'online: false\n' +
      'tileColor: ' + g.manifest.tileColor + '\n' +
      'banner: ' + g.manifest.banner + '\n' +
      'bannerBg: ' + g.manifest.bannerBg + '\n' +
      'version: 1\n' +
      'released: 2026-10-11\n' +
      '-->');
  }
  if (!/SHELL INTEGRATION/.test(s)) {
    s = s.replace('</body>', SHELL(g.home, g.game) + '\n</body>');
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, s);

  const from = path.join('sources/Shell Art', g.art[0]);
  const to = path.join('app/src/main/res/drawable', g.art[1]);
  if (fs.existsSync(from)) fs.copyFileSync(from, to);

  console.log(g.id.padEnd(14),
    'manifest=' + /STUDIO_GAME_MANIFEST/.test(s),
    '| shell=' + /SHELL INTEGRATION/.test(s),
    '| art=' + fs.existsSync(to));
}