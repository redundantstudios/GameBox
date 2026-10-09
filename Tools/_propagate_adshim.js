/* Propagates the ad-governor update to every game that uses the modern
 * Studio SDK shim.
 *
 * WHY A SCRIPT
 * The Studio SDK block is injected into each game verbatim by the integrator,
 * so it is byte-identical in 10 files. Editing them by hand is how they drift
 * apart - which is exactly how Root.io ended up with a hand-rolled ad object
 * and a self-drawn fake ad while its nine siblings used the bridge.
 *
 * WHAT CHANGES (3 things, all in the shim):
 *  1. showRewardedAd now passes a `kind` ("revive" / "normal") so the shell can
 *     cap a continue-after-death at 1 per game and normal rewards at 5.
 *  2. showInterstitial passes a placement tag.
 *  3. The banner comment records the director's decision that banners return
 *     per-game (planet merge / chess / checkers) rather than app-wide.
 *
 * The callback contract is UNCHANGED: reward on no-argument, failure on
 * "closed"/"unavailable", and the shell's new refusal reasons also arrive as
 * failures. No game logic has to change to comply.
 *
 *     node _propagate_adshim.js
 */
const fs = require('fs');
const path = require('path');

const GAMES = path.join(__dirname, '..', 'app', 'src', 'main', 'assets', 'games');

// 1. Rewarded: send the reward kind.
const OLD_REWARDED_CALL = "        try{ b.showRewardedAd(cb); }catch(_){ try{ delete window[cb]; }catch(_){} if(onFail) onFail('unavailable'); }";
const NEW_REWARDED_CALL = [
  "        /* The 3rd argument marks a continue-after-death, which the shell caps",
  "           at ONE per game: an uncapped revive removes the game's failure",
  "           state entirely. Any placement named continue/revive/life/rescue",
  "           counts as one, so a game does not have to be edited to comply. */",
  "        var kind=/continue|revive|life|rescue/i.test(placement||'')?'revive':'normal';",
  "        try{ b.showRewardedAd(cb,placement||'',kind); }",
  "        catch(_){ try{ delete window[cb]; }catch(_){} if(onFail) onFail('unavailable'); }",
].join('\n');

// 2. Interstitial: accept and forward a placement tag.
const OLD_INTER_SIG = "      interstitial:function(onDone){";
const NEW_INTER_SIG = "      interstitial:function(onDone,placement){";
const OLD_INTER_CALL = "          try{ b.showInterstitial('__studioInterCb'); return; }catch(_){}";
const NEW_INTER_CALL = "          try{ b.showInterstitial('__studioInterCb',placement||'break'); return; }catch(_){}";

// 3. Banner: forward the request to the bridge.
//
// WHY IT IS NOT A NO-OP ANYMORE
// `banner:function(){}` meant a game could poll for a banner forever and never
// once reach the SDK - the call looked wired and silently did nothing. The
// opt-in stays PER GAME, but it moves to the CALL SITE: a game that never calls
// Studio.ads.banner() gets no banner, and one that does gets a real strip. The
// shim's only job is to carry the request across, and to keep working in a plain
// browser tab where there is no bridge at all.
const OLD_BANNER = [
  "      /* BANNERS ARE OFF.",
  "         Banners are disabled app-wide for now. The call is kept so the games that",
  "         still poll for it keep working - it just does nothing, and no banner",
  "         request ever reaches the SDK. Re-enabling banners means restoring the",
  "         bridge handler in GameActivity and the unit in AdMobManager. */",
].join('\n');
const NEW_BANNER = [
  "      /* Banner strip. Opt-in is PER GAME and lives at the CALL SITE: a game",
  "         that never calls this gets no banner. This only carries the request to",
  "         the shell, which decides whether to actually show one. show=true asks",
  "         for the strip, show=false hands it back. */",
].join('\n');
const OLD_BANNER_FN = "      banner:function(){}";
const NEW_BANNER_FN = [
  "      banner:function(show){",
  "        var b=bridge();",
  "        if(!b)return;",
  "        try{",
  "          if(show){ if(b.showBanner)b.showBanner(); }",
  "          else{ if(b.hideBanner)b.hideBanner(); }",
  "        }catch(_){}",
  "      }",
].join('\n');

/* 4. A shared message helper, so a refusal reads as English on screen.
   The shell answers a denied rewarded ad with a REASON rather than silence
   (silence on a tapped button just looks broken), but a raw token such as
   "limit_reached" would look like a crash. Games call Studio.adsMessage with
   whatever onFail received. The reason strings are part of the bridge
   contract - see AdPolicy.token. */
const OLD_TAIL = "      banner:function(){}\n    }\n  };";
const NEW_TAIL = [
  NEW_BANNER_FN,
  "    },",
  "    },",
  "    /* Turns a shell refusal into something a player can read.",
  "       Games pass whatever onFail received straight into this. */",
  "    adsMessage:function(reason){",
  "      switch(reason){",
  "        case 'limit_reached': return 'You have used all your ad rewards for now.';",
  "        case 'cooldown':      return 'Give it a moment, then try again.';",
  "        case 'offline':",
  "        case 'unavailable':   return 'Ad unavailable. Check your connection and try again.';",
  "        case 'first_session': return 'No ad available right now.';",
  "        case 'forbidden':     return 'No ad available here.';",
  "        default:              return 'Ad unavailable. Try again later.';",
  "      }",
  "    }",
  "  };",
].join('\n');

let touched = 0;
const skipped = [];

for (const dir of fs.readdirSync(GAMES)) {
  const file = path.join(GAMES, dir, 'index.html');
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, 'utf8');

  // Detect the modern shim by its Studio object, NOT by the rewarded call:
  // the rewarded call was already rewritten by the first run, so testing for it
  // made the script skip every game as "not modern" and silently do nothing.
  // Idempotency comes from the replacement text simply not matching twice.
  if (!html.includes('Studio.ads')) {
    if (!html.includes('window.NativeBridge')) skipped.push(dir + ' (no bridge at all)');
    else skipped.push(dir + ' (legacy, governed in the bridge)');
    continue;
  }
  if (html.includes('adsMessage:function')) { skipped.push(dir + ' (already up to date)'); continue; }

  const before = html;
  html = html.split(OLD_REWARDED_CALL).join(NEW_REWARDED_CALL);
  html = html.split(OLD_INTER_SIG).join(NEW_INTER_SIG);
  html = html.split(OLD_INTER_CALL).join(NEW_INTER_CALL);
  html = html.split(OLD_BANNER).join(NEW_BANNER);
  html = html.split(OLD_BANNER_FN).join(NEW_BANNER_FN);
  html = html.split(OLD_TAIL).join(NEW_TAIL);

  if (html === before) { skipped.push(dir + ' (no change)'); continue; }
  fs.writeFileSync(file, html, 'utf8');
  console.log('OK  ' + dir);
  touched++;
}

console.log('\n' + touched + ' game(s) updated');
skipped.forEach((s) => console.log('  skipped ' + s));
