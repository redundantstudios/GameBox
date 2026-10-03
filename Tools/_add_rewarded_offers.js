/* Adds a real REWARDED offer to the games that only had interstitials.
 *
 * WHY
 * balloon-battle and memory-grab shipped with an interstitial and no rewarded
 * ad at all, so they earned nothing from the players who choose to watch one.
 * (egg-rush and last-balloon DO have both - an earlier report that three games
 * had no ads was wrong, it came from grepping for Studio.ads, which these
 * legacy games do not use.)
 *
 * Neither game has a failure state - Balloon Battle is an elimination bout and
 * Memory Grab always ends in "MEMORY COMPLETE" - so there is nothing honest to
 * call a "revive", and a fake continue button on a game you cannot lose would
 * be worse than none. Each reward therefore boosts the NEXT round:
 *
 *   balloon-battle : human players start the next bout with a speed boost and
 *                    a shield (p.speedT / p.shieldT, the game's own buffs).
 *   memory-grab    : the next round jumps to the largest board (setupCards).
 *
 * Both are NORMAL rewards, so the shell's 5-per-game cap applies and the
 * once-per-game REVIVE cap deliberately does not. The shell classifies a
 * request as a revive when the placement name contains continue/revive/life/
 * rescue, so the placements here are "boost" and "bigger_board" - none of
 * those words - which is what keeps them in the normal bucket.
 *
 *     node _add_rewarded_offers.js
 */
const fs = require('fs');
const path = require('path');

const GAMES = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'games');

/** Turns a shell refusal reason into a sentence the player can read. */
const AD_MESSAGE = `
function adMessage(reason){
  switch(reason){
    case 'limit_reached': return 'You have used all your ad rewards for now.';
    case 'cooldown':      return 'Give it a moment, then try again.';
    case 'offline':
    case 'unavailable':   return 'Ad unavailable. Check your connection.';
    default:              return 'Ad unavailable. Try again later.';
  }
}
`;

const EDITS = [
  /* ================= BALLOON BATTLE ================= */

  // The rewarded bridge call + the offer handler, next to the interstitial one.
  {
    game: 'balloon-battle',
    from: "/* Kept for the exit path, so a real BACK (not the page being torn down) gets",
    to: `/* Rewarded: the player's tap asks the shell, the shell decides WHEN.
   \`ok\` is true only when a reward was actually granted; every other outcome
   (skipped, offline, cap reached, cooldown) arrives as a reason string, which
   the game turns into a message rather than swallowing. */
function showRewarded(done){
  var b=window.NativeBridge;
  if(b&&b.showRewardedAd){
    var fired=false;
    var finish=function(result){
      if(fired)return;
      fired=true;
      var granted=(result!=='closed'&&result!=='unavailable'&&result!=='limit_reached'&&
                   result!=='cooldown'&&result!=='forbidden'&&result!=='first_session');
      done(granted?true:result);
    };
    /* A callback name of its own per request: two requests sharing one global
       callback let the first ad pay out the second action. */
    var cb='__bbRewCb'+(window.__bbRewSeq=(window.__bbRewSeq||0)+1);
    window[cb]=finish;
    try{
      b.showRewardedAd(cb,'boost','normal');
      setTimeout(function(){finish('unavailable');},45000);
      return;
    }catch(e){}
  }
  done('unavailable');
}
var rewardedBusy=false;
var lastAdReason='';
/* Head start on the NEXT bout: every human player begins with the game's own
   speed boost and shield. Next match only, so it stays a reward rather than a
   permanent edge, and humans only, so it never advantages the AI. */
function offerAdBoost(){
  if(rewardedBusy)return;
  rewardedBusy=true;
  showRewarded(function(ok){
    rewardedBusy=false;
    if(ok){adBoostPending=true;playWithAd(nPlayers,soloMode);}
    else{lastAdReason=adMessage(ok);}
  });
}
/* The shell owns the cap, so the game cannot know for certain how many rewards
   are left. Showing the offer is harmless either way - a refusal is explained. */
function adOfferVisible(){ return lastAdReason.indexOf('all your ad rewards')===-1; }
${AD_MESSAGE}
/* Kept for the exit path, so a real BACK (not the page being torn down) gets`,
  },

  // Consume the boost when the next match begins.
  //
  // This MUST run after the players array is filled, not at the top of
  // startMatch: the loop below walks `players`, and at the top of the function
  // it is still the previous match's array (or empty). Applying it here -
  // immediately before the countdown - is the first point where the new
  // players exist and the last point before play begins.
  {
    game: 'balloon-battle',
    from: "  state='COUNTDOWN';stateT=0;cdNum=4;cdPop=0;paused=false;\n}",
    to: `  /* Consume an ad-earned boost for this bout only, humans only, so it
     never advantages the AI. */
  if(adBoostPending){
    adBoostPending=false;
    for(const p of players)if(p.human){
      p.speedT=CFG.SPEED_BOOST_DURATION;
      p.shieldT=CFG.SHIELD_DURATION;
    }
    lastAdReason='Speed boost + shield active!';
  }
  state='COUNTDOWN';stateT=0;cdNum=4;cdPop=0;paused=false;
}`,
  },

  {
    game: 'balloon-battle',
    from: "let pin=null,pinHolder=null,pinOwnerId=-1,pinHoldT=0,pinSpawnT=2;",
    to: "let pin=null,pinHolder=null,pinOwnerId=-1,pinHoldT=0,pinSpawnT=2;\n/* Set by the rewarded offer, consumed by the next startMatch. */\nlet adBoostPending=false;",
  },

  // The offer button on the results card, above the two primary actions.
  {
    game: 'balloon-battle',
    from: "  const bw=Math.min(180,pw*0.36),bh=44,byy=py+ph-62;",
    to: `  if(lastAdReason)txt(ctx,lastAdReason,cssW/2,py+ph-118,12,'#7a5a3a','center');
  /* Above the PLAY AGAIN / MENU row, so it never displaces them. */
  if(adOfferVisible()){
    const ow=Math.min(268,pw*0.64),oh=38,oy=py+ph-110;
    ctx.fillStyle='rgba(0,0,0,0.25)';rr(ctx,cssW/2-ow/2+3,oy+3,ow,oh,12);ctx.fill();
    ctx.fillStyle=rewardedBusy?'#9aa4ad':'#e8912d';rr(ctx,cssW/2-ow/2,oy,ow,oh,12);ctx.fill();
    txt(ctx,rewardedBusy?'LOADING AD...':'WATCH AD - SPEED BOOST + SHIELD NEXT MATCH',
        cssW/2,oy+oh/2+1,rewardedBusy?14:12,'#fff','center');
    uiBtns.push({x:cssW/2-ow/2,y:oy,w:ow,h:oh,act:()=>offerAdBoost()});
  }
  const bw=Math.min(180,pw*0.36),bh=44,byy=py+ph-62;`,
  },

  /* ================= MEMORY GRAB ================= */

  // The local shim only had interstitial + banner. Add rewarded, matching the
  // contract the modern games already use: reward on no-argument, failure with
  // a reason, and a fresh callback name per request.
  {
    game: 'memory-grab',
    from: "    interstitial(onDone){const b=window.NativeBridge;if(b&&b.showInterstitial){window.__studioInterCb=function(){if(onDone)onDone();};try{b.showInterstitial('__studioInterCb');return;}catch(e){}}if(onDone)onDone();}",
    to: `    interstitial(onDone){const b=window.NativeBridge;if(b&&b.showInterstitial){window.__studioInterCb=function(){if(onDone)onDone();};try{b.showInterstitial('__studioInterCb');return;}catch(e){}}if(onDone)onDone();},
    rewarded(placement,onReward,onFail){
      const b=window.NativeBridge;
      if(!b||!b.showRewardedAd){if(onFail)onFail('unavailable');return;}
      const cb='__mgRewCb'+(window.__mgRewSeq=(window.__mgRewSeq||0)+1);
      window[cb]=function(result){
        try{delete window[cb];}catch(_){}
        if(result!=='closed'&&result!=='unavailable'){if(onReward)onReward();}
        else if(onFail)onFail(result);
      };
      try{b.showRewardedAd(cb,placement||'','normal');}catch(_){if(onFail)onFail('unavailable');}
    }`,
  },

  {
    game: 'memory-grab',
    from: '      <div id="win-line"></div>',
    to: `      <div id="win-line"></div>
      <div id="ad-offer">
        <button id="btn-ad-board" class="btn amber">WATCH AD - BIGGER BOARD</button>
        <small id="ad-note"></small>
      </div>`,
  },

  {
    game: 'memory-grab',
    from: "let setupCards   = Studio.settings.get('setupCards',16)||16;",
    to: `/* Largest board the setup screen offers, and the rewarded target. */
const MAX_CARDS = 24;
${AD_MESSAGE}
let setupCards   = Studio.settings.get('setupCards',16)||16;`,
  },

  {
    game: 'memory-grab',
    from: "  $('btn-again').addEventListener('click',()=>{SFX.click();Studio.ads.interstitial(()=>startRound());});",
    to: `  $('btn-again').addEventListener('click',()=>{SFX.click();Studio.ads.interstitial(()=>startRound());});
  /* Rewarded offer: jump to the largest board. A round always ends in
     "MEMORY COMPLETE", so there is no failure to continue from and a
     continue button would be a lie - a bigger board is a real, wanted reward.
     It is a NORMAL reward, so the 5-per-game cap applies, not the revive cap. */
  $('btn-ad-board').addEventListener('click',()=>{
    SFX.click();
    const b=$('btn-ad-board');
    b.disabled=true;b.textContent='LOADING AD...';
    Studio.ads.rewarded('bigger_board',
      function(){
        setupCards=MAX_CARDS;saveSetup();refreshSetup();
        startRound();
      },
      function(reason){
        b.disabled=false;b.textContent='WATCH AD - BIGGER BOARD';
        $('ad-note').textContent=adMessage(reason);
      });
  });`,
  },
];

let ok = 0;
for (const e of EDITS) {
  const file = path.join(GAMES, e.game, 'index.html');
  if (!fs.existsSync(file)) { console.log('SKIP ' + e.game + ' (missing)'); continue; }
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes(e.from)) {
    console.log('SKIP ' + e.game + ': no match for ' + JSON.stringify(e.from.slice(0, 46)));
    continue;
  }
  if (html.includes(e.to)) { console.log('SKIP ' + e.game + ': already applied'); continue; }
  fs.writeFileSync(file, html.split(e.from).join(e.to), 'utf8');
  console.log('OK   ' + e.game);
  ok++;
}
console.log('\n' + ok + ' edit(s) applied');

