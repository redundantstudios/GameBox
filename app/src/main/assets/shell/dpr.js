        (function(){
          try {
            if (window.__studioDpr) return;
            var raw = window.devicePixelRatio || 1;
            /* A low-RAM phone is announced by the shell's launcher with
               lowmem=1 on the game's URL (GameActivity measures total RAM
               once, before the page exists). Its governor starts one step
               lower so the first seconds of play are not the experiment that
               proves the phone slow - the trims the game itself applies in
               lowmem sit on top of this. */
            var start = /(?:^|[?&])lowmem=1/.test(location.search || '')
              ? Math.min(raw, 1.5)
              : Math.min(raw, 2);
            var cur = start;
            window.__studioDpr = start;
            window.__studioDprScale = function(){ return cur; };

            /* The page is handed a GETTER, not a number, so the value can be
               lowered later without the page knowing anything happened. A game
               that asks for devicePixelRatio - now or in a minute - gets the
               scale that is right for the machine it is running on. */
            Object.defineProperty(window, 'devicePixelRatio', {
              get: function(){ return cur; },
              configurable: true
            });
            console.log('DPR: ' + raw + ' -> ' + start +
              (start === raw ? ' (already under cap)' : ' CAPPED'));

            /* THE ADAPTIVE GOVERNOR.

               A fixed cap of 2 is the right answer for most phones and the
               wrong answer for a slow one. It cannot be right for both, because
               what a device can afford depends on how much of the screen it has
               to shade, how fast its GPU is, and what the game is drawing - none
               of which is knowable from the outside before it is running.

               So the cap is measured rather than guessed. This watches the real
               frame times the page is already producing, and if the machine
               cannot hold a smooth frame at the current scale, it steps the
               scale down and tells the page to re-lay-out.

               WHY IT STOPS WHEN LOWERING STOPS HELPING

               This is the part that matters. Stepping down blindly walks
               2 -> 1.5 -> 1.25 -> 1 even when the game is slow for a reason
               resolution has nothing to do with. A game that issues a thousand
               draw calls a frame is slow because of the calls, not the pixels,
               and every step down costs it sharpness and buys it nothing.

               So each step down is treated as an experiment: the median is
               measured before the step and again after, and if the new median
               is not meaningfully better then resolution is not the lever. The
               governor stops there, holding the scale it has, rather than
               grinding all the way to 1 and ruining the picture for no gain.

               THE SETTLE WINDOW, AND WHY IT IS NOT OPTIONAL

               The first version of this got the experiment wrong, and the
               device log showed exactly how. Connect Four stepped from 2 to 1.5
               and then reported:

                 median 24.9ms -> scale 1.5
                 median 41.6ms - lowering the resolution did not help, holding

               The frame times got WORSE after the resolution went down, which
               is not how pixels work - and the reason is that dropping the
               scale asks the game to re-lay-out, and Connect Four answers by
               rebuilding a full-screen table sprite and a full-screen board
               sprite. Those frames are the cost of the experiment, not the cost
               of the game, and the governor was reading them as proof that
               resolution was not the answer.

               So after a change the governor does not sample at all until the
               page has settled back down. "Settled" means the frame times are
               back near where they were before the change - not merely that
               enough milliseconds have passed - because how long a game takes
               to rebuild its artwork is not something the shell knows. A game
               that answers a resize in 200ms and one that takes a second and a
               half are both handled correctly by the same rule.

               There is a timeout on that wait as well, so a game that is
               genuinely still slow after the change is measured rather than
               waited on for ever.

               WHY IT IS OTHERWISE SAFE

               - It only ever steps DOWN. There is no path back up, so a game
                 can never pump between two resolutions mid-play, and a
                 transient - an ad loading, a garbage collection, a phone
                 thermal-throttling for a moment - cannot cause a visible
                 flicker. Restarting the game restores full quality.
               - It measures the MEDIAN of a window of frames, not the mean.
                 One slow frame is noise; a run of them is the machine talking.
               - A gap longer than 250ms is treated as the page having been
                 backgrounded or as a stall, never as a slow frame, so coming
                 back from the recents screen cannot trigger a step down.
               - A step down needs the median to be over the threshold on two
                 separate readings, so a single slow moment - a transition, a
                 tap, a menu opening - cannot trigger one.
               - The median is only computed every so often, not every frame.
                 Sorting a window sixty times a second to look at it once a
                 second would be a tax on the very thing being measured.
               - The floor is 1.0. Below that text stops being legible, and a
                 game that is unreadable is not playable.

               All twenty-five games re-read devicePixelRatio inside their own
               resize handler, and all twenty-five listen for the resize event,
               so the step down is picked up and applied by the game itself
               rather than by the shell reaching into its canvas. */
            var samples = [];
            var WINDOW = 120;      // frames per reading
            var WARMUP = 90;       // frames ignored while the page settles
            var COOLDOWN = 150;    // frames to wait after a change
            var MIN_SETTLE = 250;  // ms of quiet after a change before sampling
            var SETTLE_MAX = 2000; // ms after which a slow game is measured anyway
            var EVERY = 30;        // frames between readings
            var THRESHOLD = 22;    // ms; slower than about 45fps
            var IMPROVE = 0.88;    // a step down must buy at least this much
            var frames = 0, last = 0, sinceChange = 9999, reported = false;
            var lastMed = 0, held = false, badRuns = 0, changedAt = 0;

            function median(a){
              var b = a.slice().sort(function(x,y){ return x-y; });
              var m = b.length >> 1;
              return b.length % 2 ? b[m] : (b[m-1] + b[m]) / 2;
            }

            function tick(now){
              requestAnimationFrame(tick);
              if (!last) { last = now; frames = 1; return; }
              var dt = now - last;
              last = now;
              frames++;
              sinceChange++;
              if (frames <= WARMUP) return;
              /* After a change, the page is re-laying-out and its frame times
                 say more about the re-layout than about the scale. Sampling
                 waits until the frames are back near where they were before the
                 change, so the experiment measures the steady state and not the
                 cost of asking the question. */
              if (changedAt) {
                var elapsed = now - changedAt;
                var normal = dt < Math.max(8, (lastMed || 40) * 1.25);
                if (elapsed < MIN_SETTLE || (elapsed < SETTLE_MAX && !normal)) {
                  samples.length = 0;
                  return;
                }
                changedAt = 0;
              }
              if (dt > 0 && dt < 250) {
                samples.push(dt);
                if (samples.length > WINDOW) samples.shift();
              }
              if (held) return;
              if (sinceChange <= COOLDOWN) return;
              if (samples.length < WINDOW) return;
              if (frames % EVERY !== 0) return;
              var med = median(samples);
              if (!reported) {
                reported = true;
                console.log('QUAL: median ' + med.toFixed(1) + 'ms at scale ' + cur);
              }
              if (med <= THRESHOLD) { badRuns = 0; return; }
              /* Two bad readings, not one. A transition, a tap or a menu opening
                 can put one slow stretch in the window, and reacting to that
                 would cost sharpness for nothing. */
              if (++badRuns < 2) return;
              badRuns = 0;
              if (cur <= 1) return;

              /* Did the last step down actually make anything better? If it did
                 not, the bottleneck is somewhere resolution cannot reach. */
              if (lastMed > 0 && med > lastMed * IMPROVE) {
                held = true;
                console.log('QUAL: median ' + med.toFixed(1) + 'ms - lowering the ' +
                  'resolution did not help, holding at ' + cur);
                return;
              }

              var next = Math.max(1, Math.round(cur * 0.75 * 4) / 4);
              if (next >= cur - 0.01) return;
              cur = next;
              lastMed = med;
              sinceChange = 0;
              changedAt = now;
              samples.length = 0;
              console.log('QUAL: median ' + med.toFixed(1) + 'ms -> scale ' + cur);
              try { window.dispatchEvent(new Event('resize')); } catch(e){}
              try { window.dispatchEvent(new Event('orientationchange')); } catch(e){}
            }
            requestAnimationFrame(tick);
          } catch(e){ console.log('DPR cap failed: ' + e); }
        })();
